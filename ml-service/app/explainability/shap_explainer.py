import os
import pickle
import numpy as np
import shap
import pandas as pd

# Set paths
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipelines.feature_extraction import get_feature_names

# Cache directory & paths
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "url_classifier.pkl")

# Human-readable mapping for features to look spectacular on the React dashboard
FEATURE_LABELS = {
    "url_length": "Overall URL Length Factor",
    "domain_length": "Domain Name Length Heuristic",
    "entropy": "Domain Character Randomness (Entropy)",
    "qty_dot": "Dot Special Character Count",
    "qty_hyphen": "Hyphen Padding Count",
    "qty_underline": "Underscore Delimiter Presence",
    "qty_slash": "Deep Path Redirection (Slash Count)",
    "qty_at": "Credentials Ingestion Symbol (@ Count)",
    "qty_question": "Active Parameters Presence (? Count)",
    "qty_subdomain": "Multi-Level Subdomain Structure",
    "ip_presence": "Numeric IP Address Host",
    "tld_risk": "High-Risk Top Level Domain (.xyz, .top)",
    "brand_lookalike": "Spoofed Brand Name Pattern",
    "has_https": "Secure Layer Transport (HTTPS)",
    "phishing_keywords": "Social Engineering Keywords Density"
}

_model = None
_explainer = None

def get_explainer_resources():
    """Load model and initialize SHAP explainer lazily."""
    global _model, _explainer
    if _explainer is not None:
        return _model, _explainer
        
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"URL Classifier model not found at {MODEL_PATH}. Train the model first.")
        
    with open(MODEL_PATH, "rb") as f:
        _model = pickle.load(f)
        
    # TreeExplainer is ideal for XGBoost
    _explainer = shap.TreeExplainer(_model)
    return _model, _explainer

def explain_url_features(features: dict) -> list:
    """
    Compute SHAP impact values for a single url features dictionary.
    Returns a list of dictionaries: [{"factor": label, "impact": float}]
    """
    try:
        model, explainer = get_explainer_resources()
    except Exception as e:
        print(f"Error loading explainer resources: {e}")
        # Graceful fallback: return heuristic explanations if model isn't trained yet
        return get_heuristic_explanations(features)
        
    feature_names = get_feature_names()
    # Build 2D DataFrame (1 sample) matching feature names
    X = pd.DataFrame([[features[name] for name in feature_names]], columns=feature_names)
    
    try:
        # Calculate SHAP values
        shap_values = explainer.shap_values(X)
        
        # Handle SHAP output variations
        if isinstance(shap_values, list):
            # For list outputs (class 0, class 1 arrays), extract class 1 (phishing class)
            values = shap_values[1][0]
        elif len(shap_values.shape) == 3:
            # Multi-class output representation [samples, features, classes]
            values = shap_values[0, :, 1]
        elif len(shap_values.shape) == 2:
            # 2D array representation [samples, features]
            values = shap_values[0]
        else:
            values = shap_values
            
    except Exception as e:
        print(f"SHAP calculations error: {e}. Falling back to heuristic impacts.")
        return get_heuristic_explanations(features)
        
    explanations = []
    for i, name in enumerate(feature_names):
        impact = float(values[i])
        # Only report features that had a non-negligible impact (abs > 0.001) to keep charts clean
        if abs(impact) > 0.001:
            explanations.append({
                "factor": name,
                "label": FEATURE_LABELS.get(name, name),
                "impact": round(impact, 4)
            })
            
    # Sort by absolute impact descending so the most significant factors show up first
    explanations.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return explanations

def get_heuristic_explanations(features: dict) -> list:
    """Fallback heuristics if model training is not complete yet."""
    explanations = []
    if features.get("phishing_keywords", 0) > 0:
        explanations.append({
            "factor": "phishing_keywords",
            "label": FEATURE_LABELS["phishing_keywords"],
            "impact": 0.25 * features["phishing_keywords"]
        })
    if features.get("ip_presence", 0) == 1:
        explanations.append({
            "factor": "ip_presence",
            "label": FEATURE_LABELS["ip_presence"],
            "impact": 0.35
        })
    if features.get("brand_lookalike", 0) == 1:
        explanations.append({
            "factor": "brand_lookalike",
            "label": FEATURE_LABELS["brand_lookalike"],
            "impact": 0.28
        })
    if features.get("tld_risk", 0.0) > 0:
        explanations.append({
            "factor": "tld_risk",
            "label": FEATURE_LABELS["tld_risk"],
            "impact": 0.22
        })
    if features.get("has_https", 1) == 0:
        explanations.append({
            "factor": "has_https",
            "label": FEATURE_LABELS["has_https"],
            "impact": 0.15
        })
    return explanations
