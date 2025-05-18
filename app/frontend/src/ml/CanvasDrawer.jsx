// CanvasDrawer.jsx

import React, { useEffect } from 'react';
import { renderBoxes } from './renderBox'; // Assuming renderBox.js is in src/utils
import { renderMasks } from './renderMasks'; // Import the new renderMasks function

// This component handles drawing the image and detection/segmentation results on a canvas.
function CanvasDrawer({ imageSrc, detectionResults, segmentationResults, canvasRef }) { // Added segmentationResults prop

    // Use useEffect to trigger drawing whenever imageSrc, detectionResults, or segmentationResults change
    useEffect(() => {
        const canvas = canvasRef.current;
        const image = new Image(); // Create a new Image object to draw

        image.onload = () => {
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Clear the canvas before drawing
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Set canvas dimensions to match the image for correct drawing
                    canvas.width = image.width;
                    canvas.height = image.height;

                    // Draw the original image onto the canvas
                    ctx.drawImage(image, 0, 0, image.width, image.height);

                    // If there are detection results, draw the boxes and labels
                    if (detectionResults && detectionResults.boxes && detectionResults.boxes.length > 0) {
                        // renderBoxes expects image, canvasRef, boxes, scores, classes
                        renderBoxes(image, canvasRef, detectionResults.boxes, detectionResults.scores, detectionResults.classes);
                    }

                    // If there are segmentation results, draw the masks
                    if (segmentationResults && segmentationResults.masks && segmentationResults.masks.length > 0) {
                        // renderMasks expects canvas context, masks_data, classes_data
                        renderMasks(ctx, segmentationResults.masks, segmentationResults.classes);
                    }
                }
            }
        };

        image.onerror = (error) => {
            console.error("Error loading image for drawing:", error);
            // Handle image loading error for drawing
        };

        // Set the source of the image. This will trigger the onload event.
        if (imageSrc) {
            image.src = imageSrc;
        } else {
            // If no imageSrc, clear the canvas
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Optionally reset canvas dimensions or draw a placeholder
                }
            }
        }

    }, [imageSrc, detectionResults, segmentationResults, canvasRef]); // Added segmentationResults to dependencies

    // The component only needs to render the canvas element
    return (
        <canvas ref={canvasRef} className="mt-4 border border-gray-300 mx-auto"></canvas>
    );
}

export default CanvasDrawer;
