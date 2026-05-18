import os
import pickle
from flask import Flask, jsonify, request

# Adjust paths to load local modules
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipelines.feature_extraction import extract_features
from explainability.shap_explainer import explain_url_features
from training.train_url_model import train_model

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
    """NLP email scan placeholder (Phase 4 scope)"""
    data = request.get_json() or {}
    body = data.get('body', '')
    
    # Let's keep the placeholder highly functional
    is_phishing = False
    risk_score = 0.12
    flags = []
    
    body_lower = body.lower()
    if "suspend" in body_lower or "verify" in body_lower or "immediate" in body_lower or "act now" in body_lower:
        is_phishing = True
        risk_score = 0.82
        flags.append("urgency_language")
        
    if "http" in body_lower or "login" in body_lower:
        risk_score = min(1.0, risk_score + 0.15)
        flags.append("suspicious_links")
        
    return jsonify({
        "success": True,
        "risk_score": float(round(risk_score, 4)),
        "confidence": 0.89,
        "flags": flags,
        "is_phishing": is_phishing
    }), 200

@app.route('/predict/similarity', methods=['POST'])
def predict_similarity():
    """Visual page clone Siamese network placeholder (Phase 4 scope)"""
    return jsonify({
        "success": True,
        "similarity_score": 0.05,
        "is_clone": False,
        "matched_brand": "None"
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
