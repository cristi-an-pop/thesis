import * as tf from '@tensorflow/tfjs';
import ModelService from './ModelService';
import { ModelConfig } from '@/config/ModelConfig';

interface GradCAMResult {
  gradcamCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  confidence: number;
  processingTime: number;
}

class GradCAMService {
    private labels: string[] = ModelConfig.labels;

    async generateGradCAM(input: string | HTMLImageElement, diagnosisName: string): Promise<GradCAMResult> {
        const startTime = performance.now();
        
        try {
            const model = await ModelService.loadModel();
            const classIndex = this.getClassIndex(diagnosisName);
            
            let cleanImageElement: HTMLImageElement;
            if (typeof input === 'string') {
                cleanImageElement = await this.downloadImageToMemory(input);
            } else {
                cleanImageElement = input;
            }
            
            const inputTensor = this.preprocessImageMobileNetV2(cleanImageElement);
            
            const heatmapTensor = await this.computeGradCAMAdvanced(model, inputTensor, classIndex);
            
            const gradcamCanvas = await this.createJetColormapCanvas(heatmapTensor);
            const overlayCanvas = await this.createAdvancedOverlay(cleanImageElement, heatmapTensor);
            
            const prediction = model.predict(inputTensor) as tf.Tensor;
            const predictionData = await prediction.data();
            const confidence = predictionData[classIndex] * 100;
            
            inputTensor.dispose();
            heatmapTensor.dispose();
            prediction.dispose();
            
            const processingTime = (performance.now() - startTime) / 1000;
            
            return {
                gradcamCanvas,
                overlayCanvas,
                confidence,
                processingTime
            };
            
        } catch (error) {
            console.error('Error generating Grad-CAM:', error);
            throw new Error(`Failed to generate Grad-CAM: ${error}`);
        }
    }

    private preprocessImageMobileNetV2(imageElement: HTMLImageElement): tf.Tensor {
        return tf.tidy(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = 224;
            canvas.height = 224;
            ctx.drawImage(imageElement, 0, 0, 224, 224);
            
            const tensor = tf.browser.fromPixels(canvas)
                .expandDims(0)
                .div(127.5) 
                .sub(1);
            
            return tensor;
        });
    }

    private async computeGradCAMAdvanced(model: tf.GraphModel, inputTensor: tf.Tensor, classIndex: number): Promise<tf.Tensor> {
        return tf.tidy(() => {
            console.log(`Computing advanced GradCAM for class index: ${classIndex}`);
            
            const classOutput = (input: tf.Tensor) => {
                const predictions = model.predict(input) as tf.Tensor;
                return predictions.slice([0, classIndex], [1, 1]).squeeze();
            };
            
            const gradFunction = tf.grad(classOutput);
            const gradients = gradFunction(inputTensor);
            
            let heatmap = gradients.abs().mean(-1).squeeze(); // [224, 224]
            
            heatmap = heatmap.relu();
            heatmap = this.applyGaussianBlur(heatmap, 15);
            
            const maxVal = heatmap.max();
            if (maxVal.dataSync()[0] > 0) {
                heatmap = heatmap.div(maxVal);
            }
            
            console.log('Advanced heatmap computed successfully');
            return heatmap;
        });
    }

    private applyGaussianBlur(tensor: tf.Tensor, kernelSize: number = 3): tf.Tensor {
        return tf.tidy(() => {
            const sigma = kernelSize / 3;
            const kernel = this.createGaussianKernel(kernelSize, sigma) as tf.Tensor4D;
            
            const reshaped = tensor.expandDims(0).expandDims(-1);
            
            const blurred = tf.conv2d(reshaped as any, kernel, 1, 'same');
            
            return blurred.squeeze();
        });
    }

    private createGaussianKernel(size: number, sigma: number): tf.Tensor {
    return tf.tidy(() => {
        const center = Math.floor(size / 2);
        const kernel = tf.buffer([size, size, 1, 1]);
        
        let sum = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const x = i - center;
                const y = j - center;
                const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
                kernel.set(value, i, j, 0, 0);
                sum += value;
            }
        }
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const currentValue = kernel.get(i, j, 0, 0);
                kernel.set(currentValue / sum, i, j, 0, 0);
            }
        }
        
        return kernel.toTensor();
    });
}

    private async createJetColormapCanvas(heatmapTensor: tf.Tensor): Promise<HTMLCanvasElement> {
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d')!;
        
        const heatmapData = await heatmapTensor.data();
        const imageData = ctx.createImageData(224, 224);
        
        console.log('Jet colormap - Heatmap range:', Math.min(...heatmapData), 'to', Math.max(...heatmapData));
        
        for (let i = 0; i < heatmapData.length; i++) {
            const intensity = heatmapData[i]; // [0, 1]
            const pixelIndex = i * 4;
            
            let r, g, b;
            
            if (intensity < 0.125) {
                // Dark blue to blue
                const t = intensity / 0.125;
                r = 0;
                g = 0;
                b = Math.floor(128 + 127 * t);
            } else if (intensity < 0.375) {
                // Blue to cyan
                const t = (intensity - 0.125) / 0.25;
                r = 0;
                g = Math.floor(255 * t);
                b = 255;
            } else if (intensity < 0.625) {
                // Cyan to green
                const t = (intensity - 0.375) / 0.25;
                r = 0;
                g = 255;
                b = Math.floor(255 * (1 - t));
            } else if (intensity < 0.875) {
                // Green to yellow
                const t = (intensity - 0.625) / 0.25;
                r = Math.floor(255 * t);
                g = 255;
                b = 0;
            } else {
                // Yellow to red
                const t = (intensity - 0.875) / 0.125;
                r = 255;
                g = Math.floor(255 * (1 - t));
                b = 0;
            }
            
            imageData.data[pixelIndex] = r;
            imageData.data[pixelIndex + 1] = g;
            imageData.data[pixelIndex + 2] = b;
            imageData.data[pixelIndex + 3] = 255; // Full opacity
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    private async createAdvancedOverlay(imageElement: HTMLImageElement, heatmapTensor: tf.Tensor): Promise<HTMLCanvasElement> {
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d')!;
        
        const baseCanvas = document.createElement('canvas');
        const baseCtx = baseCanvas.getContext('2d')!;
        baseCanvas.width = 224;
        baseCanvas.height = 224;
        baseCtx.drawImage(imageElement, 0, 0, 224, 224);
        
        const baseImageData = baseCtx.getImageData(0, 0, 224, 224);
        
        const heatmapCanvas = await this.createJetColormapCanvas(heatmapTensor);
        const heatmapCtx = heatmapCanvas.getContext('2d')!;
        const heatmapImageData = heatmapCtx.getImageData(0, 0, 224, 224);

        const blendedImageData = ctx.createImageData(224, 224);
        const alpha = 0.5;
        
        for (let i = 0; i < baseImageData.data.length; i += 4) {
            blendedImageData.data[i] = Math.floor(
                baseImageData.data[i] * (1 - alpha) + heatmapImageData.data[i] * alpha
            );
            blendedImageData.data[i + 1] = Math.floor(
                baseImageData.data[i + 1] * (1 - alpha) + heatmapImageData.data[i + 1] * alpha
            );
            blendedImageData.data[i + 2] = Math.floor(
                baseImageData.data[i + 2] * (1 - alpha) + heatmapImageData.data[i + 2] * alpha
            );
            blendedImageData.data[i + 3] = 255; // Full opacity
        }
        
        ctx.putImageData(blendedImageData, 0, 0);
        return canvas;
    }

    private async downloadImageToMemory(imageUrl: string): Promise<HTMLImageElement> {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            return new Promise((resolve, reject) => {
                const img = new Image();
                
                img.onload = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(img);
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Failed to load image from blob'));
                };
                
                img.src = objectUrl;
            });
            
        } catch (error) {
            console.error('Failed to download image:', error);
            throw new Error(`Failed to download image: ${error}`);
        }
    }

    private getClassIndex(diagnosisName: string): number {
        const normalizedName = diagnosisName.toLowerCase().replace(/[^a-z]/g, '');
        
        const index = this.labels.findIndex(label => 
            label.toLowerCase().replace(/[^a-z]/g, '').includes(normalizedName) ||
            normalizedName.includes(label.toLowerCase().replace(/[^a-z]/g, ''))
        );
        
        return index >= 0 ? index : 0;
    }

    async isReady(): Promise<boolean> {
        return ModelService.isModelReady();
    }

    isModelLoading(): boolean {
        return ModelService.isModelLoading();
    }
}

export default new GradCAMService();