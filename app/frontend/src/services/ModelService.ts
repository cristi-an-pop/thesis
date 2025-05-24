import * as tf from '@tensorflow/tfjs';

class ModelService {
  private model: tf.GraphModel | null = null;
  private labels = [
    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema", "Effusion", 
    "Emphysema", "Fibrosis", "Hernia", "Infiltration", "Mass", 
    "Nodule", "Pleural_Thickening", "Pneumonia", "Pneumothorax"
  ];

  async loadModel(): Promise<tf.GraphModel> {
    if (this.model) return this.model;
    
    try {
      console.log('Loading TensorFlow.js model...');
      this.model = await tf.loadGraphModel('/web_model/model.json');
      console.log('Model loaded successfully!');
      return this.model;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  async classifyImage(imageElement: HTMLImageElement): Promise<{label: string, probability: number}[]> {
    try {
      const model = await this.loadModel();
      
      // Preprocess the image
      const tensor = tf.browser.fromPixels(imageElement)
        .resizeBilinear([224, 224])
        .expandDims(0)
        .div(255.0);
      
      console.log('Input tensor shape:', tensor.shape);
      
      // Run inference
      const predictions = model.predict(tensor) as tf.Tensor;
      const probabilities = await predictions.data();
      
      console.log('Predictions shape:', predictions.shape);
      console.log('Raw probabilities:', Array.from(probabilities));
      
      // Clean up tensors
      tensor.dispose();
      predictions.dispose();
      
      // Format results
      const results = Array.from(probabilities).map((prob, idx) => ({
        label: this.labels[idx],
        probability: prob
      })).sort((a, b) => b.probability - a.probability);
      
      return results;
      
    } catch (error) {
      console.error('Error classifying image:', error);
      throw error;
    }
  }

  async generateGradCAM(imageElement: HTMLImageElement, targetClass?: number): Promise<HTMLCanvasElement> {
  try {
    const model = await this.loadModel();
    
    // Preprocess image
    const inputTensor = tf.browser.fromPixels(imageElement)
      .resizeBilinear([224, 224])
      .expandDims(0)
      .div(255.0);

    console.log('Input tensor shape:', inputTensor.shape);

    // Get predictions first
    const predictions = model.predict(inputTensor) as tf.Tensor;
    console.log('Predictions shape:', predictions.shape);
    
    // Use the class with highest prediction if no target specified
    const probabilities = await predictions.data();
    const classIndex = targetClass ?? Array.from(probabilities).indexOf(Math.max(...Array.from(probabilities)));
    
    console.log('Target class index:', classIndex);
    console.log('Class probability:', probabilities[classIndex]);

    // For now, create a simple attention visualization based on image gradients
    // This is a fallback when layer access isn't available
    const gradFunction = tf.grad((x: tf.Tensor) => {
      const preds = model.predict(x) as tf.Tensor;
      return preds.slice([0, classIndex], [1, 1]).squeeze();
    });
    
    const grads = gradFunction(inputTensor);
    console.log('Gradients shape:', grads.shape);
    
    // Create attention map from gradients
    const gradSquared = grads.square();
    const attentionMap = gradSquared.mean(-1); // Average across channels
    
    // Normalize to 0-1
    const minVal = attentionMap.min();
    const maxVal = attentionMap.max();
    const normalizedMap = attentionMap.sub(minVal).div(maxVal.sub(minVal));
    
    // Create canvas for visualization
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    
    // Convert to pixels
    const squeezedMap = normalizedMap.squeeze();
    const map2d = squeezedMap as tf.Tensor2D;
    await tf.browser.toPixels(map2d, canvas);
    
    // Cleanup tensors
    inputTensor.dispose();
    predictions.dispose();
    grads.dispose();
    gradSquared.dispose();
    attentionMap.dispose();
    normalizedMap.dispose();
    minVal.dispose();
    maxVal.dispose();
    
    return canvas;
    
  } catch (error) {
    console.error('Error in generateGradCAM:', error);
    if (error instanceof Error) {
      throw new Error(`Grad-CAM generation failed: ${error.message}`);
    } else {
      throw new Error('Grad-CAM generation failed: Unknown error');
    }
  }
}

async overlayGradCAM(originalImage: HTMLImageElement, gradCAMCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width || 224;
    canvas.height = originalImage.height || 224;
    const ctx = canvas.getContext('2d')!;
    
    // Draw original image
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    
    // Create colored heatmap overlay
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = 224;
    overlayCanvas.height = 224;
    const overlayCtx = overlayCanvas.getContext('2d')!;
    
    // Draw grayscale heatmap
    overlayCtx.drawImage(gradCAMCanvas, 0, 0);
    
    // Get image data to apply color mapping
    const imageData = overlayCtx.getImageData(0, 0, 224, 224);
    const data = imageData.data;
    
    // Apply jet colormap (blue to red)
    for (let i = 0; i < data.length; i += 4) {
      const intensity = data[i] / 255; // Use red channel as intensity
      
      // Jet colormap
      if (intensity < 0.25) {
        data[i] = 0;     // Red
        data[i + 1] = Math.floor(255 * intensity * 4); // Green
        data[i + 2] = 255; // Blue
      } else if (intensity < 0.5) {
        data[i] = 0;     // Red
        data[i + 1] = 255; // Green
        data[i + 2] = Math.floor(255 * (0.5 - intensity) * 4); // Blue
      } else if (intensity < 0.75) {
        data[i] = Math.floor(255 * (intensity - 0.5) * 4); // Red
        data[i + 1] = 255; // Green
        data[i + 2] = 0;   // Blue
      } else {
        data[i] = 255;   // Red
        data[i + 1] = Math.floor(255 * (1 - intensity) * 4); // Green
        data[i + 2] = 0; // Blue
      }
      
      // Set alpha based on intensity
      data[i + 3] = Math.floor(intensity * 180); // Semi-transparent
    }
    
    overlayCtx.putImageData(imageData, 0, 0);
    
    // Blend with original image
    ctx.globalAlpha = 0.6;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    
    // Reset context
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    
    return canvas;
    
  } catch (error) {
    console.error('Error in overlayGradCAM:', error);
    if (error instanceof Error) {
      throw new Error(`Overlay generation failed: ${error.message}`);
    } else {
      throw new Error('Overlay generation failed: Unknown error');
    }
  }
}
}

export default new ModelService();
