import * as tf from "@tensorflow/tfjs";
// Assuming segmentation labels are in a similar JSON file
import segmentationLabels from "./segmentation_labels.json"; // Adjust path as needed

const numClass = segmentationLabels.length;

// Preprocessing function to pad and resize the image to the model's expected input size
const preprocess = (source, modelWidth, modelHeight) => {
    const input = tf.tidy(() => {
        const img = tf.browser.fromPixels(source);

        // get source width and height
        const [h, w] = img.shape.slice(0, 2);
        // get max size to create a square padded image
        const maxSize = Math.max(w, h);

        // padding image to square => [h, w] to [maxSize, maxSize]
        // padding is added to the bottom and right
        const imgPadded = img.pad([
            [0, maxSize - h], // padding y [bottom only]
            [0, maxSize - w], // padding x [right only]
            [0, 0],           // padding for channels
        ]);

        // Resize the padded square image to the model's input size
        return tf.image
            .resizeBilinear(imgPadded, [modelHeight, modelWidth])
            .div(255.0) // normalize pixel values
            .expandDims(0); // add batch dimension
    });
    // We only need the preprocessed input tensor for inference
    return [input];
};

export const segment = async (source, model, callback = () => {}) => {
    await tf.ready();
    const originalHeight = source.height; // Get original image dimensions
    const originalWidth = source.width;
    console.log("Original dimensions:", originalWidth, originalHeight);

    // Get model output shape for segmentation mask
    const [modelSegHeight, modelSegWidth, modelSegChannel] = model.outputShape[1].slice(1);

    // Get model input shape
    const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);

    // Calculate the size of the padded square used in preprocessing
    const maxSize = Math.max(originalWidth, originalHeight);

    // Calculate scaling factors from model input size (modelWidth x modelHeight) to the padded square size (maxSize x maxSize)
    // These factors are crucial for scaling model output coordinates back to the original image's coordinate system.
    // Since padding was added to the bottom and right, the top-left corner (0,0) in the model output
    // corresponds to (0,0) in the padded square and thus (0,0) in the original image.
    const scaleFactorX = maxSize / modelWidth;
    const scaleFactorY = maxSize / modelHeight;


    tf.engine().startScope(); // start scoping tf engine

    // Preprocess the source image
    const [input] = preprocess(source, modelWidth, modelHeight);

    // Execute the model
    const res = model.net.execute(input);

    // Transpose and squeeze the output tensors
    const transRes = tf.tidy(() => res[0].transpose([0, 2, 1]).squeeze()); // Bounding boxes, scores, and mask coefficients
    const transSegMask = tf.tidy(() => res[1].transpose([0, 3, 1, 2]).squeeze()); // Segmentation mask prototypes

    // Extract bounding boxes from the transposed result
    const boxes = tf.tidy(() => {
        // Assuming model output format for boxes is [x_c, y_c, w, h]
        const xc = transRes.slice([0, 0], [-1, 1]);
        const yc = transRes.slice([0, 1], [-1, 1]);
        const w = transRes.slice([0, 2], [-1, 1]);
        const h = transRes.slice([0, 3], [-1, 1]);

        // Convert [x_c, y_c, w, h] to [y1, x1, y2, x2] relative to model input size (640x640)
        const x1 = tf.sub(xc, tf.div(w, 2));
        const y1 = tf.sub(yc, tf.div(h, 2));
        const x2 = tf.add(xc, tf.div(w, 2));
        const y2 = tf.add(yc, tf.div(h, 2));

        return tf
            .concat(
                [
                    y1,
                    x1,
                    y2,
                    x2,
                ],
                1
            )
            .squeeze(); // Shape [n, 4] where n is the number of detections before NMS
    });

    // Extract scores and classes
    const [scores, classes] = tf.tidy(() => {
        // Assuming scores and classes follow the box coordinates in transRes
        const rawScores = transRes.slice([0, 4], [-1, numClass]).squeeze(); // Shape [n, numClass]
        return [rawScores.max(1), rawScores.argMax(1)]; // Get max score and class index for each box
    });

    // Apply Non-Maximum Suppression (NMS) to filter overlapping boxes
    const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2); // Max detections, iouThreshold, scoreThreshold

    // Gather the boxes, scores, and classes selected by NMS
    const nmsBoxes = boxes.gather(nms, 0);
    const nmsScores = scores.gather(nms, 0).expandDims(1);
    const nmsClasses = classes.gather(nms, 0).expandDims(1);

    const detReady = tf.tidy(() =>
        tf.concat(
            [
                nmsBoxes,
                nmsScores,
                nmsClasses,
            ],
            1 // axis
        )
    ); // Shape [num_nms_detections, 6] -> [y1, x1, y2, x2, score, label] (relative to 640x640)

    // Process segmentation masks
    const masks = tf.tidy(() => {
        // Assuming mask coefficients follow scores and classes in transRes
        const maskCoefficients = transRes.slice([0, 4 + numClass], [-1, modelSegChannel]).squeeze(); // Shape [n, mask_size]
        return maskCoefficients
            .gather(nms, 0) // Get mask coefficients for detections selected by NMS [num_nms_det, mask_size]
            // Matrix multiplication with segmentation mask prototypes to get raw masks
            .matMul(transSegMask.reshape([modelSegChannel, -1])) // [num_nms_det, mask_size] x [mask_size, seg_h x seg_w] => [num_nms_det, seg_h x seg_w]
            .reshape([nms.shape[0], modelSegHeight, modelSegWidth]); // Reshape back to [num_nms_det, seg_h, seg_w]
    }); // Processed masks at model segmentation resolution (likely 640x640)


    const scaled_boxes_data = []; // Stores scaled bounding boxes [y, x, h, w] for original image
    const scores_data = [];
    const classes_data = [];
    const masks_data = []; // Stores scaled and positioned mask tensors


    // Iterate over each detected object after NMS
    for (let i = 0; i < detReady.shape[0]; i++) {
        // Get box coordinates, score, and class for the current detection
        const rowData = detReady.slice([i, 0], [1, 6]);
        let [y1_model, x1_model, y2_model, x2_model, score, label] = rowData.dataSync(); // relative to model input (640x640)

        // Scale the bounding box coordinates from model output size (modelWidth x modelHeight)
        // to the original image dimensions (originalWidth x originalHeight).
        // We scale to the padded square size first, which directly maps to original image coordinates
        // because the original image is the top-left part of the padded square.
        const x1_original = Math.floor(x1_model * scaleFactorX);
        const y1_original = Math.floor(y1_model * scaleFactorY);
        const x2_original = Math.ceil(x2_model * scaleFactorX);
        const y2_original = Math.ceil(y2_model * scaleFactorY);

        // Ensure scaled coordinates are within the bounds of the original image
        const finalX1 = Math.max(0, x1_original);
        const finalY1 = Math.max(0, y1_original);
        const finalX2 = Math.min(originalWidth, x2_original);
        const finalY2 = Math.min(originalHeight, y2_original);

        // Store the scaled bounding box in [y, x, h, w] format
        const upSampleBox = [finalY1, finalX1, finalY2 - finalY1, finalX2 - finalX1];
        // console.log("Scaled box for original image (y, x, h, w):", upSampleBox);


        // Calculate the bounding box coordinates in the model's segmentation output resolution (modelSegHeight x modelSegWidth)
        // This is used to slice the relevant mask snippet from the processed masks tensor.
        const downSampleBox = [
            Math.floor((y1_model * modelSegHeight) / modelHeight), // y
            Math.floor((x1_model * modelSegWidth) / modelWidth), // x
            Math.round(((y2_model - y1_model) * modelSegHeight) / modelHeight), // h
            Math.round(((x2_model - x1_model) * modelSegWidth) / modelWidth), // w
        ];


        // Slice the mask snippet corresponding to the downSampleBox from the masks tensor
        const proto = tf.tidy(() => {
            const sliced = masks.slice(
                [
                    i, // batch index
                    downSampleBox[0] >= 0 ? downSampleBox[0] : 0, // start y
                    downSampleBox[1] >= 0 ? downSampleBox[1] : 0, // start x
                ],
                [
                    1, // size of batch dimension
                    downSampleBox[0] + downSampleBox[2] <= modelSegHeight // height
                        ? downSampleBox[2]
                        : modelSegHeight - downSampleBox[0],
                    downSampleBox[1] + downSampleBox[3] <= modelSegWidth // width
                        ? downSampleBox[3]
                        : modelSegWidth - downSampleBox[1],
                ]
            );
            return sliced.squeeze().expandDims(-1); // Shape [sliced_h, sliced_w, 1]
        });

        // Resize the mask snippet to the dimensions of the scaled bounding box in the original image resolution
        const upsampleProto = tf.image.resizeBilinear(proto, [upSampleBox[2], upSampleBox[3]]); // resizing proto to drawing size (height, width of the scaled box)

        // Pad the resized mask snippet to the original image dimensions and position it at the scaled bounding box location
        const mask = tf.tidy(() => {
            const padded = upsampleProto.pad([
                [upSampleBox[0], originalHeight - (upSampleBox[0] + upSampleBox[2])], // padding top and bottom
                [upSampleBox[1], originalWidth - (upSampleBox[1] + upSampleBox[3])], // padding left and right
                [0, 0], // padding for channels
            ]);
            return padded.less(0.5); // Create a boolean mask (true inside the object, false outside) of original image size
        });


        scaled_boxes_data.push(upSampleBox); // [y, x, h, w] in original image scale
        scores_data.push(score);
        classes_data.push(label);
        masks_data.push(mask); // Store the mask tensor (original image size, boolean)


        tf.dispose([rowData, proto, upsampleProto]); // Dispose tensors created within the loop that are no longer needed
    }

    // At this point, scaled_boxes_data contains the bounding box information
    // and masks_data contains the corresponding boolean mask tensors, both
    // scaled and positioned correctly relative to the original image dimensions.
    // You can now use this data to draw detections and masks on your canvas.

    callback(); // Run callback function

    tf.engine().endScope(); // End of scoping

    // Return scaled boxes, scores, classes, and mask tensors
    return { boxes: scaled_boxes_data, scores: scores_data, classes: classes_data, masks: masks_data };
};