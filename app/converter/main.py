import tensorflow as tf
import os
import numpy as np

# Define your labels first
SELECTED_CONDITIONS = [
    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema", "Effusion", 
    "Emphysema", "Fibrosis", "Hernia", "Infiltration", "Mass", 
    "Nodule", "Pleural_Thickening", "Pneumonia", "Pneumothorax"
]

# Register the custom loss function
@tf.keras.utils.register_keras_serializable(package='Custom', name='weighted_binary_crossentropy')
def weighted_binary_crossentropy(y_true, y_pred):
    epsilon = tf.keras.backend.epsilon()
    y_true = tf.cast(y_true, tf.float32)
    y_pred = tf.clip_by_value(y_pred, epsilon, 1.0 - epsilon)
    logits_pred = tf.math.log(y_pred / (1.0 - y_pred))
    
    # Use default weights
    pos_weight = tf.ones_like(y_true)
    
    loss = tf.nn.weighted_cross_entropy_with_logits(
        labels=y_true,
        logits=logits_pred,
        pos_weight=pos_weight
    )
    return tf.reduce_mean(loss)

def get_weighted_binary_crossentropy(pos_weights_param=None, label_smoothing=0.01):
    pos_weights = pos_weights_param if pos_weights_param is not None else np.ones(len(SELECTED_CONDITIONS))
    pos_weights_tensor = tf.constant(pos_weights, dtype=tf.float32)
    
    def loss_fn(y_true, y_pred):
        y_true = tf.cast(y_true, tf.float32)
        if label_smoothing > 0:
            y_true = y_true * (1.0 - label_smoothing) + 0.5 * label_smoothing
        
        epsilon = tf.keras.backend.epsilon()
        y_pred_clipped = tf.clip_by_value(y_pred, epsilon, 1.0 - epsilon)
        logits_pred = tf.math.log(y_pred_clipped / (1.0 - y_pred_clipped))
        
        loss = tf.nn.weighted_cross_entropy_with_logits(
            labels=y_true,
            logits=logits_pred,
            pos_weight=pos_weights_tensor
        )
        return tf.reduce_mean(loss)
    
    return loss_fn

# Custom objects for loading the model
custom_objects = {
    'weighted_binary_crossentropy': weighted_binary_crossentropy,
    'get_weighted_binary_crossentropy': get_weighted_binary_crossentropy
}

print("Loading Keras model...")
try:
    # Load model without compiling to avoid loss function issues
    model = tf.keras.models.load_model('full_model_from_weights.keras', 
                                       custom_objects=custom_objects, 
                                       compile=False)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# Save as SavedModel for TensorFlow.js conversion
print("Saving as SavedModel...")
tf.saved_model.save(model, "saved_model")
print("SavedModel saved!")

# Also convert to TFLite
print("Converting to TFLite...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

with open('model.tflite', 'wb') as f:
    f.write(tflite_model)
print("Basic TFLite model saved")

# Optimized conversion
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
optimized_tflite_model = converter.convert()

with open('model_optimized.tflite', 'wb') as f:
    f.write(optimized_tflite_model)
print("Optimized TFLite model saved")

# Print size comparison
try:
    keras_size = os.path.getsize('full_model_from_weights.keras') / (1024 * 1024)
    tflite_size = os.path.getsize('model.tflite') / (1024 * 1024)
    optimized_size = os.path.getsize('model_optimized.tflite') / (1024 * 1024)

    print(f"Keras model size: {keras_size:.2f} MB")
    print(f"TFLite model size: {tflite_size:.2f} MB")
    print(f"Optimized TFLite model size: {optimized_size:.2f} MB")
except FileNotFoundError as e:
    print(f"Could not find file for size comparison: {e}")

print("\nNow you can convert to TensorFlow.js with:")
print("tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model saved_model web_model")