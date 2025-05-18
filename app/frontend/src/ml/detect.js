
import * as tf from "@tensorflow/tfjs";
import labels from "./detect_labels.json";


const numClass = labels.length;

const preprocess = (source, modelWidth, modelHeight) => {
    let xRatio, yRatio; // ratios for boxes

    const input = tf.tidy(() => {
        const img = tf.browser.fromPixels(source);

        // padding image to square => [n, m] to [n, n], n > m
        const [h, w] = img.shape.slice(0, 2); // get source width and height
        const maxSize = Math.max(w, h); // get max size
        const imgPadded = img.pad([
            [0, maxSize - h], // padding y [bottom only]
            [0, maxSize - w], // padding x [right only]
            [0, 0],
        ]);

        xRatio = maxSize / w; // update xRatio
        yRatio = maxSize / h; // update yRatio

        return tf.image
            .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
            .div(255.0) // normalize
            .expandDims(0); // add batch
    });
    return [input, xRatio, yRatio];
};

const MODEL_INPUT_WIDTH = 640;
const MODEL_INPUT_HEIGHT = 640;
export const detect = async (source, model, callback = () => {}) => { // Removed canvasRef from parameters
    // Ensure TensorFlow.js and its backend are ready
    await tf.ready();

    const [modelWidth, modelHeight] = model.inputShape.slice(1, 3); // get model width and height

    tf.engine().startScope(); // start scoping tf engine
    const [input, xRatio_preprocess, yRatio_preprocess] = preprocess(source, modelWidth, modelHeight); // preprocess image
    // Note: xRatio_preprocess and yRatio_preprocess from preprocess might relate to padding/aspect ratio
    // and might not be the direct scaling factor from model input to original image size.
    // We will calculate the correct scaling factor based on original image size and model input size below.


    const res = model.net.execute(input); // inference model
    const transRes = res.transpose([0, 2, 1]); // transpose result [b, det, n] => [b, n, det]

    // Use tf.tidy to manage tensor disposal within this block
    // Return tensors needed for further processing or inspection
    const [boxes, scores, classes, nmsResult] = tf.tidy(() => {
        const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
        const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
        const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
        const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
        const boxes = tf
            .concat(
                [
                    y1,
                    x1,
                    tf.add(y1, h), //y2
                    tf.add(x1, w), //x2
                ],
                2
            )
            .squeeze(); // process boxes [y1, x1, y2, x2]

        // class scores
        const rawScores = transRes.slice([0, 0, 4], [-1, -1, numClass]).squeeze(0); // #6 only squeeze axis 0 to handle only 1 class models
        const [scores, classes] = [rawScores.max(1), rawScores.argMax(1)]; // get max scores and classes index

        // Perform NMS inside tidy
        const nmsResult = tf.image.nonMaxSuppression(
            boxes,
            scores,
            1000, // maxBoxes (example value, adjust as needed)
            0.3, // iouThreshold (example value, adjust as needed)
            0.001 // scoreThreshold (example value, adjust as needed)
        );

        // Dispose intermediate tensors created within this tidy block explicitly if needed,
        // though tf.tidy should handle most that are not returned.
        tf.dispose([rawScores, w, h, x1, y1]);

        // Return tensors needed outside tidy
        return [boxes, scores, classes, nmsResult];
    }); // end tf.tidy

    // --- Retrieve data asynchronously after tidy ---
    let boxes_data, scores_data, classes_data;
    try {
        // Gather data using nmsResult indices
        const nmsIndices = await nmsResult.array(); // Get the indices from the nmsResult tensor

        // Gather the boxes, scores, and classes based on the NMS indices
        const finalBoxes = boxes.gather(nmsIndices, 0);
        const finalScores = scores.gather(nmsIndices, 0);
        const finalClasses = classes.gather(nmsIndices, 0);

        // Get the data as arrays
        boxes_data = await finalBoxes.array();
        scores_data = await finalScores.array();
        classes_data = await finalClasses.array();

        // Dispose of the tensors created in this block
        tf.dispose([nmsResult, finalBoxes, finalScores, finalClasses]);

    } catch (error) {
        console.error("Error retrieving data from tensors after NMS:", error);
        // Dispose tensors if data retrieval fails
        tf.dispose([boxes, scores, classes, nmsResult, res, transRes, input]);
        tf.engine().endScope();
        callback();
        return { boxes: [], scores: [], classes: [] }; // Return empty arrays on error
    } finally {
        // Dispose of tensors returned from tidy that were not disposed in the try block
        tf.dispose([boxes, scores, classes]);
    }

    // --- Scale the boxes to the original image size ---
    const originalImageWidth = source.width;
    const originalImageHeight = source.height;

    // Calculate the maximum dimension of the original image (used for padding in preprocess)
    const maxSize = Math.max(originalImageWidth, originalImageHeight);

    // Calculate the scaling factor from the model input size to the padded square size
    // Since padding is applied to make the smaller dimension equal to the larger dimension,
    // the scaling factor is the ratio of the padded square size (maxSize) to the model input size.
    const scaleFactor = maxSize / MODEL_INPUT_WIDTH; // Assuming MODEL_INPUT_WIDTH === MODEL_INPUT_HEIGHT

    // Scale the box coordinates from model input space (640x640) to the original image size (1615x840)
    // Since padding is only on the bottom and right, the top-left corner aligns.
    const scaled_boxes_data = boxes_data.map(box => {
        const [y1_model, x1_model, y2_model, x2_model] = box;
        const x1_original = x1_model * scaleFactor;
        const y1_original = y1_model * scaleFactor;
        const x2_original = x2_model * scaleFactor;
        const y2_original = y2_model * scaleFactor;
        return [y1_original, x1_original, y2_original, x2_original];
    });
    // console.log("Scaled boxes data:", scaled_boxes_data);
    // console.log("Scores data:", scores_data);
    // console.log("Classes data:", classes_data);

    // Dispose of tensors created outside or explicitly returned from tidy that are no longer needed
    tf.dispose([res, transRes, input]);

    callback();

    tf.engine().endScope(); // end of scoping

    // Return the scaled boxes, scores, and classes
    return { boxes: scaled_boxes_data, scores: scores_data, classes: classes_data };
};