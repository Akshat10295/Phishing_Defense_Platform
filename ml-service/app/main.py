import os
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/v1/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "ml-service"
    }), 200

@app.route('/predict/url', methods=['POST'])
def predict_url():
    data = request.get_json() or {}
    url = data.get('url', '')
    
    # Return placeholder risk details
    return jsonify({
        "risk_score": 0.85,
        "confidence": 0.91,
        "threat_category": "credential_harvesting",
        "explanations": [
            { "factor": "suspicious_domain_age", "impact": 0.25 },
            { "factor": "fake_login_form_detected", "impact": 0.20 },
            { "factor": "ssl_mismatch", "impact": 0.15 }
        ]
    }), 200

@app.route('/predict/email', methods=['POST'])
def predict_email():
    data = request.get_json() or {}
    body = data.get('body', '')
    
    return jsonify({
        "risk_score": 0.72,
        "confidence": 0.89,
        "flags": ["urgency_language", "suspicious_links"],
        "is_phishing": True
    }), 200

@app.route('/predict/similarity', methods=['POST'])
def predict_similarity():
    return jsonify({
        "similarity_score": 0.94,
        "is_clone": True,
        "matched_brand": "Microsoft"
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
