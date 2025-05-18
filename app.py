import gradio as gr
import tensorflow as tf
from tensorflow.keras.models import Model
import numpy as np
import cv2 # OpenCV for image processing

# --- Configuration ---
MODEL_PATH = 'best_model_finetuned.h5' # Make sure this path is correct
IMG_SIZE = (224, 224)
SELECTED_CONDITIONS = ['Pneumonia', 'Effusion', 'Cardiomegaly']
# For DenseNet121, a common last convolutional block's concatenated output layer
# If you used a different model or know the exact layer, you might need to change this.
GRAD_CAM_TARGET_LAYER_NAME = 'conv5_block16_concat'

# --- Load the Trained Model ---
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"Model '{MODEL_PATH}' loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Please ensure the model file exists at the specified path and is a valid Keras model.")
    model = None # Set model to None if loading fails

# --- Grad-CAM Functions (adapted from your script) ---
def grad_cam(model_instance, img_array_input, class_idx_val, layer_name):
    """Generate Grad-CAM heatmap for a specific class index."""
    grad_model = Model(
        inputs=[model_instance.inputs],
        outputs=[model_instance.get_layer(layer_name).output, model_instance.output]
    )
    with tf.GradientTape() as tape:
        # Cast image to float32
        img_array_casted = tf.cast(img_array_input, tf.float32)
        conv_outputs_val, predictions_val = grad_model(img_array_casted)

        if class_idx_val is None or class_idx_val < 0 or class_idx_val >= predictions_val.shape[1]:
            print(f"Warning: Invalid class_idx_val {class_idx_val} for predictions shape {predictions_val.shape}. Using class 0.")
            class_idx_val = 0 # Default to first class if index is invalid
            if predictions_val.shape[1] == 0: # Should not happen with a loaded model
                 return np.zeros((conv_outputs_val.shape[1], conv_outputs_val.shape[2]))


        loss_val = predictions_val[:, class_idx_val]

    # Get gradients
    grads_val = tape.gradient(loss_val, conv_outputs_val)
    if grads_val is None: # Should not happen if layer is connected
        print(f"Warning: Gradients are None for layer {layer_name} and class index {class_idx_val}.")
        return np.zeros((conv_outputs_val.shape[1], conv_outputs_val.shape[2]))

    grads_val = grads_val[0] # Reduce batch dimension
    output_val = conv_outputs_val[0] # Reduce batch dimension

    # Calculate weights and generate CAM
    weights_val = tf.reduce_mean(grads_val, axis=(0, 1))
    cam_output = tf.reduce_sum(tf.multiply(weights_val, output_val), axis=-1)

    # ReLU and normalize
    cam_output = tf.maximum(cam_output, 0)
    if tf.reduce_max(cam_output) > 0: # Avoid division by zero
        cam_output = cam_output / tf.reduce_max(cam_output)
    return cam_output.numpy()

def overlay_gradcam(img_original_rgb, cam_heatmap, alpha=0.5):
    """Overlay Grad-CAM heatmap on the original image."""
    if img_original_rgb is None or cam_heatmap is None:
        return None

    # Resize heatmap to match original image dimensions
    cam_resized_heatmap = cv2.resize(cam_heatmap, (img_original_rgb.shape[1], img_original_rgb.shape[0]))

    # Apply colormap to heatmap
    heatmap_colored = cv2.applyColorMap(np.uint8(255 * cam_resized_heatmap), cv2.COLORMAP_JET)
    # heatmap_colored is in BGR format by default from cv2.applyColorMap

    # Ensure original image is in BGR uint8 format for cv2.addWeighted
    img_bgr_uint8 = cv2.cvtColor(img_original_rgb.astype(np.uint8), cv2.COLOR_RGB2BGR)

    # Superimpose heatmap
    superimposed_bgr = cv2.addWeighted(img_bgr_uint8, 1 - alpha, heatmap_colored, alpha, 0)
    superimposed_rgb = cv2.cvtColor(superimposed_bgr, cv2.COLOR_BGR2RGB) # Convert back to RGB for display

    return superimposed_rgb

# --- Prediction and Visualization Function for Gradio ---
def predict_and_visualize_xray(input_image_pil):
    """
    Takes a PIL image from Gradio, preprocesses it, gets predictions,
    and generates Grad-CAM overlays.
    """
    if model is None:
        return "Error: Model not loaded. Please check server logs.", None, None, None

    # Convert PIL Image to NumPy array (Gradio provides PIL by default for gr.Image)
    # Ensure it's RGB
    input_image_np = np.array(input_image_pil.convert("RGB"))


    # 1. Preprocess the image for the model
    img_resized = cv2.resize(input_image_np, IMG_SIZE)
    img_normalized = img_resized.astype(np.float32) / 255.0
    img_batch = np.expand_dims(img_normalized, axis=0) # Create a batch of 1

    # 2. Get model predictions
    predictions = model.predict(img_batch)[0] # Get probabilities for the first (only) image in batch

    # Format predictions as a dictionary for easier display
    output_predictions = {SELECTED_CONDITIONS[i]: float(predictions[i]) for i in range(len(SELECTED_CONDITIONS))}

    # 3. Generate Grad-CAM overlays for each condition
    grad_cam_overlays = []
    # For overlay, use the resized image (0-255 range, uint8)
    # img_resized_uint8 = img_resized.astype(np.uint8) # overlay_gradcam now handles this

    for i, condition_name in enumerate(SELECTED_CONDITIONS):
        class_index = i
        heatmap = grad_cam(model, img_batch, class_index, GRAD_CAM_TARGET_LAYER_NAME)
        overlay = overlay_gradcam(img_resized, heatmap) # Pass img_resized (0-255 range)
        if overlay is None: # Handle potential errors in Grad-CAM generation
            # Create a placeholder image if overlay fails
            overlay = np.zeros((IMG_SIZE[0], IMG_SIZE[1], 3), dtype=np.uint8)
            cv2.putText(overlay, "Grad-CAM Error", (10, IMG_SIZE[0]//2), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,0,0), 1)
        grad_cam_overlays.append(overlay)

    # Ensure we return the correct number of overlays
    # If fewer overlays were generated than conditions, pad with blank images
    while len(grad_cam_overlays) < len(SELECTED_CONDITIONS):
        blank_overlay = np.zeros((IMG_SIZE[0], IMG_SIZE[1], 3), dtype=np.uint8)
        cv2.putText(blank_overlay, "N/A", (10, IMG_SIZE[0]//2), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1)
        grad_cam_overlays.append(blank_overlay)


    return output_predictions, grad_cam_overlays[0], grad_cam_overlays[1], grad_cam_overlays[2]


# --- Gradio Interface Definition ---
iface_title = "Chest X-ray Diagnosis AI"
iface_description = (
    "Upload a chest X-ray image. The AI will predict probabilities for Pneumonia, Effusion, and Cardiomegaly. "
    "Grad-CAM visualizations highlight areas the model focused on for each prediction."
    "\nModel: Fine-tuned DenseNet121. (Note: This is a research prototype, not for clinical use.)"
)

# Define inputs and outputs
image_input = gr.Image(type="pil", label="Upload Chest X-ray") # Input as PIL image
predictions_output = gr.Label(num_top_classes=len(SELECTED_CONDITIONS), label="Predictions")

# Create separate image outputs for each Grad-CAM
gradcam_outputs = []
for condition in SELECTED_CONDITIONS:
    gradcam_outputs.append(gr.Image(label=f"Grad-CAM: {condition}", type="numpy")) # Output as NumPy array

# Check if model loaded before creating the interface
if model is not None:
    # Use gr.Blocks for more layout control if needed, but gr.Interface is simpler for this.
    app_interface = gr.Interface(
        fn=predict_and_visualize_xray,
        inputs=image_input,
        outputs=[predictions_output] + gradcam_outputs, # Combine outputs
        title=iface_title,
        description=iface_description,
        examples=[["00000013_005.png"], ["00000032_001.png"]], # Add paths to example images if available
        allow_flagging="never"
    )
else:
    # Create a dummy interface if model loading failed, informing the user.
    with gr.Blocks() as app_interface:
        gr.Markdown(f"""
        # Error: AI Model Not Loaded
        The chest X-ray diagnosis model (`{MODEL_PATH}`) could not be loaded.
        Please check the file path and ensure the model is valid.
        The application cannot function without the model. See server logs for details.
        """)

# --- Launch the App ---
if __name__ == "__main__":
    if model is not None:
        print("Launching Gradio app...")
        app_interface.launch()
    else:
        print("Gradio app cannot launch because the model failed to load.")
        # Optionally, launch the dummy interface to show the error in the browser
        # app_interface.launch()
