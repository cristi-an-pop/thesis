// src/utils/segmentationColors.js

// Function to generate a random hex color code
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Generate an array of 32 random colors for segmentation masks
export const segmentationColors = [];
for (let i = 0; i < 32; i++) {
    segmentationColors.push(getRandomColor());
}

// Example usage:
// import { segmentationColors } from './segmentationColors';
// const colorForClass5 = segmentationColors[5];
