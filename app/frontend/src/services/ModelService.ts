import * as tf from '@tensorflow/tfjs';
import { ModelConfig } from '@/config/ModelConfig';

class ModelService {
  private model: tf.GraphModel | null = null;
  private isLoading = false;
  private loadingPromise: Promise<tf.GraphModel> | null = null;
  private labels: string[] = ModelConfig.labels;

  async loadModel(): Promise<tf.GraphModel> {
    if (this.model) return this.model;
    
    if (this.loadingPromise) return this.loadingPromise;
    
    this.isLoading = true;
    this.loadingPromise = this._loadModel();
    
    try {
      this.model = await this.loadingPromise;
      return this.model;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  private async _loadModel(): Promise<tf.GraphModel> {
    try {
      const model = await tf.loadGraphModel('/web_model/model.json');
      console.log('Model loaded successfully!');
      return model;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  isModelReady(): boolean {
    return this.model !== null;
  }

  isModelLoading(): boolean {
    return this.isLoading;
  }

  private preprocessImage(imageElement: HTMLImageElement): tf.Tensor {
    return tf.browser.fromPixels(imageElement)
      .resizeBilinear([224, 224])
      .expandDims(0)
      .div(255.0);
  }

  async classifyImageFile(file: File): Promise<{label: string, probability: number}[]> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = async () => {
        try {
          const results = await this.classifyImage(img);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image for classification'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  async classifyImage(imageElement: HTMLImageElement): Promise<{label: string, probability: number}[]> {
    try {
      if (!this.model) {
        throw new Error('Model not loaded.');
      }
      
      const tensor = this.preprocessImage(imageElement);
      const predictions = this.model.predict(tensor) as tf.Tensor;
      const probabilities = await predictions.data();
      
      tensor.dispose();
      predictions.dispose();
      
      const results = Array.from(probabilities)
        .map((prob, idx) => ({
          label: this.labels[idx],
          probability: prob
        }))
        .filter(result => result.probability > 0.5)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);
      
      return results;
      
    } catch (error) {
      console.error('Error classifying image:', error);
      throw error;
    }
  }

  getLabelIndex(label: string): number {
    const index = this.labels.indexOf(label);
    if (index === -1) {
      throw new Error(`Label "${label}" not found in model labels.`);
    }
    return index;
  }
}

export default new ModelService();
