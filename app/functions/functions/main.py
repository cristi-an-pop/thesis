import io
import base64
import numpy as np
import os
from PIL import Image
from firebase_functions import https_fn
from firebase_admin import initialize_app, ml

# Initialize Firebase
initialize_app()

# Your labels
LABELS = [
    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema", "Effusion", 
    "Emphysema", "Fibrosis", "Hernia", "Infiltration", "Mass", 
    "Nodule", "Pleural_Thickening", "Pneumonia", "Pneumothorax"
]

# No need to manage model files manually!
model = None

async def get_model():
    """Get model from Firebase ML"""
    global model
    
    if model is not None:
        return model
    
    try:
        # Get model reference from Firebase ML
        model_ref = ml.get_model('chest1')  # Replace with your model ID from Firebase console
        
        # Download the model
        model_path = '/tmp/model.tflite'
        await model_ref.download_to_file(model_path)
        
        # Load model with TFLite
        import tflite_runtime.interpreter as tflite
        interpreter = tflite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        
        return interpreter
    except Exception as e:
        print(f"Error loading model from Firebase ML: {e}")
        return None

@https_fn.on_call()
async def classify_image(req: https_fn.CallableRequest) -> dict:
    try:
        # Auth check
        if not req.auth:
            return {"error": "Unauthorized"}
            
        # Get image
        image_data = req.data.get("image")
        if not image_data:
            return {"error": "No image provided"}
        
        # Get interpreter from Firebase ML
        interpreter = await get_model()
        if not interpreter:
            return {"error": "Model not available"}
        
        # Process image
        image_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert('RGB').resize((224, 224))
        input_data = np.array(img, dtype=np.float32) / 255.0
        
        # Get input/output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        # Run inference
        interpreter.set_tensor(input_details[0]['index'], [input_data])
        interpreter.invoke()
        predictions = interpreter.get_tensor(output_details[0]['index'])[0]
        
        # Format results
        results = [{"label": LABELS[i], "probability": float(prob)} 
                 for i, prob in enumerate(predictions)]
        results.sort(key=lambda x: x["probability"], reverse=True)
        
        return {"success": True, "predictions": results}
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}