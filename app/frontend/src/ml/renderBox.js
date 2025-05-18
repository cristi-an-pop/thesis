// src/utils/renderBox.js

import { labels } from './detect_labels'; // Assuming your detection labels are in detect_labels.json

// This function draws the bounding boxes and labels on the canvas.
// It takes the image element (for dimensions), the canvas reference,
// and the scaled detection results (boxes, scores, classes).
export const renderBoxes = (image, canvasRef, boxes_data, scores_data, classes_data) => {
    const canvas = canvasRef.current;
    if (!canvas) {
        console.error("Canvas element not found.");
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get canvas 2D context.");
        return;
    }

    // Ensure the canvas dimensions match the image dimensions for correct drawing
    // This might be redundant if already set in CanvasDrawer, but good for robustness
    canvas.width = image.width;
    canvas.height = image.height;

    // Note: Drawing the image is typically done *before* calling renderBoxes
    // in the CanvasDrawer component to ensure the boxes are drawn on top.
    // If you call renderBoxes directly and need the image drawn, add:
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(image, 0, 0, image.width, image.height);


    // Set font and line styles for drawing boxes and text
    ctx.font = '14px Arial';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 2;

    // Iterate through the detected boxes
    for (let i = 0; i < boxes_data.length; i += 4) {
        // The boxes_data should already be scaled to the original image dimensions
        const [y1, x1, y2, x2] = [
            boxes_data[i],
            boxes_data[i + 1],
            boxes_data[i + 2],
            boxes_data[i + 3],
        ];
        const score = scores_data[i / 4];
        const classId = classes_data[i / 4];
        const label = labels[classId]; // Get label from imported labels

        // Calculate box dimensions
        const width = x2 - x1;
        const height = y2 - y1;

        // Draw the bounding box
        ctx.strokeStyle = '#00FF00'; // Green color for boxes
        ctx.strokeRect(x1, y1, width, height);

        // Draw the background for the label text
        ctx.fillStyle = '#00FF00'; // Green background
        const text = `${label}: ${score.toFixed(2)}`;
        const textWidth = ctx.measureText(text).width;
        const textHeight = 14; // Approximate text height based on font size
        // Position the text background slightly above the box if there's space
        const textY = y1 > textHeight ? y1 - textHeight : y1;
        ctx.fillRect(x1, textY, textWidth + 4, textHeight); // Add some padding

        // Draw the label text
        ctx.fillStyle = '#000000'; // Black text color
        // Position the text slightly inside the background rectangle
        ctx.fillText(text, x1 + 2, textY + 2); // Add some padding
    }
};
