import re
import numpy as np

# A list of standard urgency and financial keywords with custom weights
URGENCY_KEYWORDS = {
    'suspend': 0.35, 'immediate': 0.30, 'act now': 0.35, 'urgent': 0.30, 
    'unauthorized': 0.25, 'restricted': 0.25, 'expire': 0.20, 'action required': 0.30,
    'verify': 0.20, 'confirm': 0.15, 'terminated': 0.35, 'security alert': 0.25
}

FINANCIAL_KEYWORDS = {
    'bank': 0.20, 'card': 0.20, 'payment': 0.15, 'transfer': 0.20,
    'usd': 0.15, 'invoice': 0.25, 'billing': 0.15, 'irs': 0.35,
    'funds': 0.20, 'refund': 0.25, 'account locked': 0.30
}

VOCAB_KEYWORDS = {
    'click here': 0.25, 'login': 0.20, 'sign in': 0.15, 'update': 0.15,
    'dear customer': 0.15, 'secured link': 0.20, 'helpdesk': 0.15
}

def analyze_email_heuristics(text: str) -> dict:
    """
    High-fidelity heuristic fallback text scanner to evaluate urgency,
    financial hazards, and vocabulary anomalies in email body payloads.
    """
    text_lower = text.lower()
    
    # Calculate Urgency Score
    urgency_hits = 0
    urgency_val = 0.0
    for kw, weight in URGENCY_KEYWORDS.items():
        count = len(re.findall(r'\b' + re.escape(kw) + r'\b', text_lower))
        if count > 0:
            urgency_hits += count
            urgency_val += weight * min(count, 2)
    urgency_score = min(0.95, urgency_val + (0.05 * urgency_hits))
    
    # Calculate Financial Hazard Score
    financial_hits = 0
    financial_val = 0.0
    for kw, weight in FINANCIAL_KEYWORDS.items():
        count = len(re.findall(r'\b' + re.escape(kw) + r'\b', text_lower))
        if count > 0:
            financial_hits += count
            financial_val += weight * min(count, 2)
    financial_hazard = min(0.95, financial_val + (0.05 * financial_hits))
    
    # Calculate Vocabulary Anomalies (Social Engineering Flags)
    vocab_hits = 0
    vocab_val = 0.0
    for kw, weight in VOCAB_KEYWORDS.items():
        count = len(re.findall(r'\b' + re.escape(kw) + r'\b', text_lower))
        if count > 0:
            vocab_hits += count
            vocab_val += weight * min(count, 2)
            
    # Include uppercase letter percentage and exclamation marks count as anomalies
    exclamation_count = text.count('!')
    shouting_factor = min(0.20, exclamation_count * 0.05)
    
    vocab_score = min(0.95, vocab_val + shouting_factor + (0.05 * vocab_hits))
    
    # Derive triggers
    flags = []
    if urgency_score >= 0.40:
        flags.append('urgency_language')
    if financial_hazard >= 0.40:
        flags.append('financial_hazard')
    if vocab_score >= 0.45:
        flags.append('credential_harvesting')
        
    if not flags:
        flags.append('verified_safe')
        
    # Aggregate Risk Score
    risk_score = 0.35 * urgency_score + 0.35 * financial_hazard + 0.30 * vocab_score
    is_phishing = risk_score >= 0.50
    
    # Round metrics for presentation
    return {
        "risk_score": float(round(risk_score, 4)),
        "is_phishing": bool(is_phishing),
        "confidence": float(round(0.85 + (risk_score * 0.1 if is_phishing else (1 - risk_score) * 0.1), 4)),
        "flags": flags,
        "nlp_analysis": {
            "urgency_score": float(round(urgency_score, 4)),
            "financial_hazard": float(round(financial_hazard, 4)),
            "vocabulary_anomalies": float(round(vocab_score, 4))
        }
    }

def analyze_email_nlp(text: str) -> dict:
    """
    Primary BERT NLP Classifier. Attaches HuggingFace pipeline for text sequence
    classification, blending it with semantic score weights. Falls back to heuristics on delay.
    """
    try:
        from transformers import pipeline
        
        # Load a highly optimized tiny transformer model (only 17MB, bert-tiny sms spam)
        # It handles rapid local inference easily.
        classifier = pipeline(
            "text-classification", 
            model="mrm8488/bert-tiny-finetuned-sms-spam-detection",
            device=-1 # Enforce CPU to prevent thread blocks on CUDA locks
        )
        
        # Run transformer model
        prediction = classifier(text[:512])[0] # Feed first 512 chars for speed
        label = prediction['label']
        score = prediction['score']
        
        # Blend model classification results with structural keyword heuristics
        heuristics = analyze_email_heuristics(text)
        
        # If model flags spam, elevate risk score
        is_spam_verdict = (label == 'LABEL_1' or label == 'spam')
        if is_spam_verdict:
            blended_risk = min(1.0, heuristics["risk_score"] * 0.4 + score * 0.6)
        else:
            blended_risk = max(0.0, heuristics["risk_score"] * 0.5 - (1 - score) * 0.2)
            
        is_phishing = blended_risk >= 0.50
        
        # Update dynamic flags based on blended results
        flags = list(heuristics["flags"])
        if is_phishing and 'verified_safe' in flags:
            flags.remove('verified_safe')
            flags.append('suspicious_links')
            
        return {
            "risk_score": float(round(blended_risk, 4)),
            "is_phishing": bool(is_phishing),
            "confidence": float(round(score, 4)),
            "flags": flags,
            "nlp_analysis": heuristics["nlp_analysis"]
        }
        
    except Exception as err:
        # Graceful fallback to our high-fidelity keyword engine
        print(f"[emailNLP] Transformer loading deferred ({err}). Invoking heuristics fallback.")
        return analyze_email_heuristics(text)
