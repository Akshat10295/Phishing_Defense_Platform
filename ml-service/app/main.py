import os
import pickle
from flask import Flask, jsonify, request

# Adjust paths to load local modules
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipelines.feature_extraction import extract_features
from explainability.shap_explainer import explain_url_features
from training.train_url_model import train_model
from pipelines.email_nlp import analyze_email_nlp
from pipelines.visual_similarity import compare_visual_similarity
from pipelines.qr_extractor import extract_qr_url

app = Flask(__name__)

# Cache references
model = None
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "url_classifier.pkl")

def get_threat_category(features: dict, risk_score: float) -> str:
    """Determine a dynamic threat category based on lexical feature signals."""
    if risk_score < 0.35:
        return "none"
        
    if features.get("brand_lookalike", 0) == 1:
        return "brand_impersonation"
    elif features.get("ip_presence", 0) == 1:
        return "malware_hosting"
    elif features.get("phishing_keywords", 0) >= 2:
        return "credential_harvesting"
    elif features.get("qty_subdomain", 0) >= 3:
        return "subdomain_takeover"
    
    return "general_phishing"

def init_service():
    """Verify that model exists or auto-train it, then load it into memory."""
    global model
    if not os.path.exists(MODEL_PATH):
        print(f"URL Classifier model not found at {MODEL_PATH}. Initiating auto-training on boot...")
        try:
            train_model()
        except Exception as e:
            print(f"Auto-training failed: {e}. Flask service will boot with heuristic fallback.")
            return
            
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
            print("Successfully loaded URL Classifier XGBoost model into memory.")
    except Exception as e:
        print(f"Failed to load model from disk: {e}. Running in heuristic fallback mode.")

# Run service initialization
init_service()

@app.route('/api/v1/health', methods=['GET'])
def health():
    global model
    return jsonify({
        "status": "healthy",
        "service": "ml-service",
        "model_loaded": model is not None,
        "environment": os.environ.get('FLASK_ENV', 'production')
    }), 200

@app.route('/predict/url', methods=['POST'])
def predict_url():
    global model
    data = request.get_json() or {}
    url = data.get('url', '')
    
    if not url:
        return jsonify({"success": False, "error": "URL parameter is required"}), 400
        
    # Extract features
    features = extract_features(url)
    
    # Run prediction
    risk_score = 0.0
    confidence = 0.5
    
    if model is not None:
        try:
            # Format features for model prediction [url_length, domain_length, ...]
            from pipelines.feature_extraction import get_feature_names
            feature_vector = [features[name] for name in get_feature_names()]
            
            # Predict probability
            proba = model.predict_proba([feature_vector])[0]
            # Risk score is the probability of class 1 (phishing)
            risk_score = float(proba[1])
            
            # Confidence is derived from proximity to the boundary (0.5 represents lowest confidence)
            confidence = float(max(proba[0], proba[1]))
            # Round for cleanliness
            risk_score = float(round(risk_score, 4))
            confidence = float(round(confidence, 4))
        except Exception as e:
            print(f"Model prediction error: {e}. Falling back to heuristics.")
            # Fallback to simple rule scoring
            risk_score = calculate_heuristic_score(features)
            confidence = 0.75
    else:
        # Heuristic fallback if model is completely offline
        risk_score = calculate_heuristic_score(features)
        confidence = 0.75
        
    # Get SHAP explanations
    explanations = explain_url_features(features)
    
    # Determine threat category
    category = get_threat_category(features, risk_score)
    
    return jsonify({
        "success": True,
        "risk_score": risk_score,
        "confidence": confidence,
        "threat_category": category,
        "explanations": explanations,
        "features": features
    }), 200

def calculate_heuristic_score(features: dict) -> float:
    """Calculate a rule-based risk score if XGBoost model is missing."""
    score = 0.1 # Baseline
    if features.get("phishing_keywords", 0) > 0:
        score += 0.25 * features["phishing_keywords"]
    if features.get("ip_presence", 0) == 1:
        score += 0.35
    if features.get("brand_lookalike", 0) == 1:
        score += 0.30
    if features.get("tld_risk", 0.0) > 0:
        score += 0.20
    if features.get("has_https", 1) == 0:
        score += 0.15
        
    return min(1.0, max(0.0, float(round(score, 4))))

@app.route('/predict/email', methods=['POST'])
def predict_email():
    """Run dynamic HuggingFace sequence classification on email bodies"""
    data = request.get_json() or {}
    body = data.get('body', '')
    
    if not body:
        return jsonify({"success": False, "error": "Please provide the email body payload for analysis."}), 400
        
    result = analyze_email_nlp(body)
    return jsonify(result), 200

@app.route('/predict/similarity', methods=['POST'])
def predict_similarity():
    """Siamese neural network evaluating webpage screenshot similarity (threshold < 0.15)"""
    if 'image1' not in request.files or 'image2' not in request.files:
        return jsonify({"success": False, "error": "Both screenshot image1 and image2 are required for similarity checking."}), 400
        
    img1_file = request.files['image1']
    img2_file = request.files['image2']
    
    result = compare_visual_similarity(img1_file.read(), img2_file.read())
    return jsonify(result), 200

@app.route('/predict/qr', methods=['POST'])
def predict_qr():
    """Scans screenshot files for embedded QR codes and extracts URLs"""
    if 'image' not in request.files:
        return jsonify({"success": False, "error": "Image file containing QR code is required."}), 400
        
    img_file = request.files['image']
    result = extract_qr_url(img_file.read())
    return jsonify(result), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
