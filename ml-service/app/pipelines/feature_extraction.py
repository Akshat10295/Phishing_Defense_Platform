import re
import math
from urllib.parse import urlparse

# List of highly trusted brands to check for lookalike domains
TRUSTED_BRANDS = ["google", "paypal", "microsoft", "apple", "amazon", "netflix", "facebook", "yahoo", "linkedin"]

# High risk Top-Level Domains (TLDs)
HIGH_RISK_TLDS = [".xyz", ".top", ".tk", ".ml", ".cf", ".gq", ".club", ".work", ".info", ".click", ".link", ".loan", ".biz", ".icu", ".fit"]

def get_entropy(text: str) -> float:
    """Calculate the Shannon entropy of a string."""
    if not text:
        return 0.0
    entropy = 0.0
    text_len = len(text)
    for char in set(text):
        p_x = text.count(char) / text_len
        entropy += - p_x * math.log2(p_x)
    return float(round(entropy, 4))

def check_ip_presence(domain: str) -> int:
    """Check if the domain looks like an IPv4 or IPv6 address."""
    # Simple IPv4 pattern
    ipv4_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    if re.match(ipv4_pattern, domain):
        return 1
    # Check for hex/IP in general
    if any(c.isdigit() for c in domain) and domain.count(".") >= 3:
        # Extra check for typical IP-like strings
        clean_domain = domain.replace(".", "")
        if clean_domain.isdigit():
            return 1
    return 0

def check_brand_lookalike(domain: str, url: str) -> int:
    """
    Check if a trusted brand name is used in the URL
    but the official brand domain is not the host.
    Example: paypal-update.com (suspicious) vs paypal.com (legitimate)
    """
    domain = domain.lower()
    url = url.lower()
    
    # Strip TLD and 'www.' from domain to check main domain name
    main_domain = domain
    if main_domain.startswith("www."):
        main_domain = main_domain[4:]
    
    # Simple TLD stripping
    parts = main_domain.split(".")
    if len(parts) >= 2:
        main_domain = parts[-2]
    elif len(parts) == 1:
        main_domain = parts[0]
        
    for brand in TRUSTED_BRANDS:
        # Brand name is in the URL
        if brand in url:
            # If the domain doesn't match the brand exactly, or is a compound domain (e.g. paypal-security.com)
            if brand != main_domain:
                return 1
    return 0

def get_tld_risk(domain: str) -> float:
    """Return risk multiplier if the domain ends with a dangerous TLD."""
    domain = domain.lower()
    for tld in HIGH_RISK_TLDS:
        if domain.endswith(tld):
            return 1.0
    return 0.0

def get_phishing_keyword_count(url: str) -> int:
    """Count high-frequency phishing keywords in the URL."""
    url = url.lower()
    keywords = [
        "login", "verify", "secure", "account", "update", "signin", 
        "banking", "webscr", "ebayisapi", "confirm", "security", 
        "wallet", "portal", "support", "billing", "active", "recover"
    ]
    count = 0
    for keyword in keywords:
        # Match keywords as sub-strings or path segments
        count += url.count(keyword)
    return count

def extract_features(url: str) -> dict:
    """
    Extract 14 numeric lexical and behavioral features from a raw URL.
    Returns a dict mapping feature names to their float/int values.
    """
    if not url:
        return {
            "url_length": 0, "domain_length": 0, "entropy": 0.0,
            "qty_dot": 0, "qty_hyphen": 0, "qty_underline": 0,
            "qty_slash": 0, "qty_at": 0, "qty_question": 0,
            "qty_subdomain": 0, "ip_presence": 0, "tld_risk": 0.0,
            "brand_lookalike": 0, "has_https": 0, "phishing_keywords": 0
        }
        
    # Auto-add scheme if not present for correct parsing
    parsed_url = url
    if not (url.startswith("http://") or url.startswith("https://")):
        parsed_url = "http://" + url
        
    try:
        parsed = urlparse(parsed_url)
        domain = parsed.netloc or ""
        path = parsed.path or ""
    except Exception:
        domain = ""
        path = ""
        
    # 1. URL & Domain Lengths
    url_length = len(url)
    domain_length = len(domain)
    
    # 2. Shannon Entropy of Domain
    entropy = get_entropy(domain)
    
    # 3. Special Character Counts in URL
    qty_dot = url.count(".")
    qty_hyphen = url.count("-")
    qty_underline = url.count("_")
    qty_slash = url.count("/")
    qty_at = url.count("@")
    qty_question = url.count("?")
    
    # 4. Subdomains count
    # Domain e.g. "sub.example.co.uk" -> count dot splits minus TLD parts
    subdomain_parts = domain.split(".")
    if subdomain_parts and subdomain_parts[0] == "www":
        subdomain_parts = subdomain_parts[1:]
    qty_subdomain = max(0, len(subdomain_parts) - 2)
    
    # 5. IP Presence
    ip_presence = check_ip_presence(domain)
    
    # 6. TLD Risk
    tld_risk = get_tld_risk(domain)
    
    # 7. Brand Lookalike flag
    brand_lookalike = check_brand_lookalike(domain, url)
    
    # 8. HTTPS Scheme
    has_https = 1 if url.lower().startswith("https://") else 0
    
    # 9. Phishing Keywords
    phishing_keywords = get_phishing_keyword_count(url)
    
    return {
        "url_length": url_length,
        "domain_length": domain_length,
        "entropy": entropy,
        "qty_dot": qty_dot,
        "qty_hyphen": qty_hyphen,
        "qty_underline": qty_underline,
        "qty_slash": qty_slash,
        "qty_at": qty_at,
        "qty_question": qty_question,
        "qty_subdomain": qty_subdomain,
        "ip_presence": ip_presence,
        "tld_risk": tld_risk,
        "brand_lookalike": brand_lookalike,
        "has_https": has_https,
        "phishing_keywords": phishing_keywords
    }

def get_feature_names() -> list:
    """Return the ordered list of features expected by the ML model."""
    return [
        "url_length", "domain_length", "entropy", "qty_dot", "qty_hyphen",
        "qty_underline", "qty_slash", "qty_at", "qty_question", "qty_subdomain",
        "ip_presence", "tld_risk", "brand_lookalike", "has_https", "phishing_keywords"
    ]
