import sys
import os
import json
import base64
import numpy as np
from PIL import Image
import io

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'models', 'plant_disease_mobilenetv2')
MODEL_PATH = os.path.join(MODEL_DIR, 'model_quantized.onnx')
CONFIG_PATH = os.path.join(MODEL_DIR, 'config.json')

def load_labels():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            id2label = cfg.get('id2label', {})
            return {int(k): v for k, v in id2label.items()}
    return {}

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)

def preprocess_image(image: Image.Image):
    image = image.convert('RGB')
    image = image.resize((224, 224), Image.Resampling.BILINEAR)
    img_arr = np.array(image, dtype=np.float32) / 255.0
    img_arr = (img_arr - 0.5) / 0.5
    img_arr = np.transpose(img_arr, (2, 0, 1))
    return np.expand_dims(img_arr, axis=0).astype(np.float32)

def predict_from_source(source_str):
    import onnxruntime as ort

    if os.path.exists(source_str):
        img = Image.open(source_str)
    else:
        if ',' in source_str:
            source_str = source_str.split(',', 1)[1]
        decoded = base64.b64decode(source_str)
        img = Image.open(io.BytesIO(decoded))

    labels = load_labels()
    tensor = preprocess_image(img)

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    session = ort.InferenceSession(MODEL_PATH, opts, providers=['CPUExecutionProvider'])

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: tensor})
    logits = outputs[0][0]
    probs = softmax(logits)

    top_indices = np.argsort(probs)[::-1][:3]
    predictions = []
    for idx in top_indices:
        label = labels.get(idx, f"Class #{idx}")
        conf = float(probs[idx]) * 100.0
        label_lower = label.lower()
        if "healthy" in label_lower:
            severity = "None"
        elif any(k in label_lower for k in ["blight", "rot", "greening", "virus"]):
            severity = "High"
        elif any(k in label_lower for k in ["rust", "spot", "mildew", "scab"]):
            severity = "Medium"
        else:
            severity = "Low"

        predictions.append({
            "disease": label,
            "confidence": round(conf, 1),
            "severity": severity
        })

    return {
        "success": True,
        "source": "local-mobilenetv2-onnx",
        "primaryDisease": predictions[0],
        "predictions": predictions,
        "model": "MobileNetV2 (38-Class PlantVillage Deep Learning Model - Local ONNX Inference)"
    }

def main():
    try:
        raw_input = sys.stdin.read() if not sys.stdin.isatty() else None
        image_src = None
        if raw_input:
            try:
                req = json.loads(raw_input)
                image_src = req.get('image_base64') or req.get('image_path')
            except Exception:
                image_src = None
        elif len(sys.argv) > 1:
            image_src = sys.argv[1]

        if not image_src:
            # Fallback synthetic green leaf
            arr = np.zeros((224, 224, 3), dtype=np.uint8)
            arr[:, :, 1] = 180
            test_img = Image.fromarray(arr)
            buf = io.BytesIO()
            test_img.save(buf, format='JPEG')
            image_src = base64.b64encode(buf.getvalue()).decode('utf-8')

        result = predict_from_source(image_src)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
