import tensorflow as tf
import numpy as np

# Load TFLite model
interpreter = tf.lite.Interpreter(model_path="model.tflite")
interpreter.allocate_tensors()

# Get input and output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print("Input details:", input_details)
print("Output details:", output_details)

class TFLiteModel(tf.Module):
    def __init__(self, model_path):
        super(TFLiteModel, self).__init__()
        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        
    @tf.function(input_signature=[tf.TensorSpec(shape=[None, 224, 224, 3], dtype=tf.float32)])
    def __call__(self, x):
        # Use the correct tensor indices
        input_index = self.input_details[0]['index']
        output_index = self.output_details[0]['index']
        return tf.py_function(self._predict, [x, input_index, output_index], tf.float32)
    
    def _predict(self, x, input_index, output_index):
        # Set input tensor
        self.interpreter.set_tensor(input_index.numpy(), x.numpy())
        self.interpreter.invoke()
        # Get output tensor
        return self.interpreter.get_tensor(output_index.numpy())

# Create and save the model
model = TFLiteModel("model.tflite")
tf.saved_model.save(model, "saved_model")

print("Saved model created successfully!")
print("Now run: tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model saved_model web_model")