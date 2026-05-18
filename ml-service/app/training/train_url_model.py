import os
import random
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import xgboost as xgb

# Set path relative to project structure
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipelines.feature_extraction import extract_features, get_feature_names

# Define domains and keywords for generating realistic synthetic data
SAFE_DOMAINS = [
    "google.com", "github.com", "wikipedia.org", "amazon.com", "netflix.com", 
    "youtube.com", "apple.com", "microsoft.com", "zoom.us", "slack.com", 
    "medium.com", "reddit.com", "nytimes.com", "cnn.com", "bbc.co.uk",
    "stackoverflow.com", "linkedin.com", "twitter.com", "instagram.com"
]

PHISHING_KEYWORDS = [
    "login", "verify", "secure", "account", "update", "signin", 
    "banking", "webscr", "ebayisapi", "confirm", "security", 
    "wallet", "portal", "support", "billing", "active", "recover"
]

SUSPICIOUS_TLDS = [".xyz", ".top", ".tk", ".ml", ".cf", ".gq", ".club", ".work", ".info", ".click", ".link"]
SAFE_TLDS = [".com", ".org", ".net", ".edu", ".gov", ".co.uk", ".io"]

BRANDS = ["paypal", "netflix", "microsoft", "google", "apple", "amazon", "chase", "wellsfargo", "bankofamerica"]

def generate_benign_url() -> str:
    """Generate a highly realistic benign URL."""
    domain = random.choice(SAFE_DOMAINS)
    scheme = "https://"
    
    # Path levels
    path_opts = ["", "/search", "/title", "/wiki", "/profile", "/browse", "/en-us", "/questions"]
    path = random.choice(path_opts)
    
    if path:
        # Add random safe subfolders/files
        subdirs = ["about", "trending", "feed", "index.html", "main", "article"]
        if random.random() > 0.5:
            path += "/" + random.choice(subdirs)
            
    # Add optional safe query parameters
    query = ""
    if random.random() > 0.6:
        query = f"?q={random.randint(100, 9999)}&ref={random.choice(['home', 'nav', 'footer'])}"
        
    return f"{scheme}{domain}{path}{query}"

def generate_phishing_url() -> str:
    """Generate a highly realistic phishing/lookalike URL."""
    scheme = "https://" if random.random() > 0.4 else "http://"
    
    # Trigger IP presence
    if random.random() > 0.85:
        ip = f"{random.randint(100, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        path = f"/{random.choice(BRANDS)}/{random.choice(PHISHING_KEYWORDS)}"
        return f"{scheme}{ip}{path}"
        
    # Standard lookalike domains
    brand = random.choice(BRANDS)
    tld = random.choice(SUSPICIOUS_TLDS) if random.random() > 0.3 else random.choice(SAFE_TLDS)
    
    # Lookalike variations
    variation = random.choice([
        f"{brand}-verify",
        f"secure-{brand}",
        f"login-{brand}-update",
        f"{brand}-support-portal",
        f"account-{brand}-verification",
        f"signin-{brand}"
    ])
    
    # Combine subdomains
    subdomain = "www."
    if random.random() > 0.5:
        subdomain = f"{random.choice(PHISHING_KEYWORDS)}."
        
    domain = f"{subdomain}{variation}{tld}"
    
    # Threat path keyword density
    path = f"/{random.choice(PHISHING_KEYWORDS)}"
    if random.random() > 0.5:
        path += f"/{random.choice(PHISHING_KEYWORDS)}"
        
    # Optional parameters with special chars
    query = ""
    if random.random() > 0.5:
        query = f"?email={random.choice(['user', 'client'])}@{random.choice(['gmail.com', 'yahoo.com'])}&secure=true"
        
    return f"{scheme}{domain}{path}{query}"

def train_model() -> str:
    """
    Generate synthetic dataset, extract features, train XGBoost model,
    evaluate accuracy, and save model binary to models directory.
    """
    print("Initializing dataset generation...")
    dataset = []
    
    # Generate 2,500 benign and 2,500 phishing samples (Balanced)
    for _ in range(2500):
        url = generate_benign_url()
        dataset.append((url, 0)) # 0 = Benign
        
    for _ in range(2500):
        url = generate_phishing_url()
        dataset.append((url, 1)) # 1 = Phishing
        
    # Shuffle for randomness
    random.shuffle(dataset)
    
    print("Extracting features from generated dataset...")
    feature_rows = []
    labels = []
    
    for url, label in dataset:
        features = extract_features(url)
        # Convert dictionary to ordered list of feature values
        feature_vector = [features[name] for name in get_feature_names()]
        feature_rows.append(feature_vector)
        labels.append(label)
        
    # Load into Pandas DataFrame
    X = pd.DataFrame(feature_rows, columns=get_feature_names())
    y = np.array(labels)
    
    print(f"Dataset generated. Shape: {X.shape}. Class distribution: Benign={np.sum(y==0)}, Phishing={np.sum(y==1)}")
    
    # Split training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training XGBoost Classifier...")
    # Train model
    model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="logloss"
    )
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel training completed. Test Set Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Benign (Safe)", "Phishing (Threat)"]))
    
    # Feature Importance analysis
    importances = model.feature_importances_
    feat_imp = pd.Series(importances, index=get_feature_names()).sort_values(ascending=False)
    print("\nTop 5 Feature Importances:")
    print(feat_imp.head(5))
    
    # Ensure models directory exists
    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # Serialize model via pickle
    model_path = os.path.join(models_dir, "url_classifier.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
        
    print(f"\nSuccessfully serialized and saved model to: {model_path}")
    return model_path

if __name__ == "__main__":
    train_model()
