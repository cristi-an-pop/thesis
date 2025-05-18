// src/utils/renderMasks.js

import { segmentationColors } from './segmentationColors'; // Assuming you have a file with colors per class

// This function draws the segmentation masks on the canvas.
// It takes the canvas context, the mask data (array of 2D arrays),
// and the class IDs for each mask to apply corresponding colors.
export const renderMasks = (ctx, masks_data, classes_data) => {
    if (!ctx || !masks_data || masks_data.length === 0) {
        console.warn("No canvas context or mask data to render masks.");
        return;
    }

    // Iterate through each detected mask
    masks_data.forEach((mask, index) => {
        const classId = classes_data[index];
        // Get a color for this class. Fallback to a default color if not found.
        const color = segmentationColors[classId] || '#FF00FF'; // Default to magenta

        // Set the fill color with some transparency
        ctx.fillStyle = color + '80'; // Add '80' for 50% opacity

        // Iterate through the pixels of the mask
        // The mask data is a 2D array [height][width]
        for (let y = 0; y < mask.length; y++) {
            for (let x = 0; x < mask[y].length; x++) {
                // If the mask value is 1 (part of the segmented object)
                if (mask[y][x] === 1) {
                    // Draw a small rectangle (pixel) on the canvas
                    // Assuming the canvas is already scaled to the original image size
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    });
};

// You'll likely need a file like segmentationColors.js with an array of colors:
// export const segmentationColors = [
//   '#FF0000', // Color for class 0
//   '#00FF00', // Color for class 1
//   '#0000FF', // Color for class 2
//   // ... more colors for other classes
// ];
