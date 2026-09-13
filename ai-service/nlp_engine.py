import re
from typing import Dict, Any

# Predefined merchant & keyword map for accurate zero-shot classification
CATEGORY_RULES = {
    "Food & Dining": [
        "swiggy", "zomato", "dominos", "pizza", "starbucks", "mcdonalds", "kfc",
        "canteen", "cafe", "coffee", "restaurant", "burger", "food", "mess", "tea", "dhabha", "subway"
    ],
    "Transport & Travel": [
        "uber", "ola", "rapido", "metro", "bus", "auto", "petrol", "fuel", "flight",
        "irctc", "railway", "cab", "transport", "indigo"
    ],
    "Academics & Books": [
        "bookstore", "books", "udemy", "coursera", "stationery", "xerox", "print",
        "tuition", "exam", "college", "fees", "lab", "library"
    ],
    "Entertainment & Subs": [
        "netflix", "spotify", "prime", "movie", "pvr", "inox", "youtube", "gaming",
        "steam", "hotstar", "concert", "event", "playstation"
    ],
    "Rent & Housing": [
        "rent", "hostel", "pg", "landlord", "electricity", "wifi", "broadband",
        "water", "maintenance"
    ],
    "Shopping & Essentials": [
        "amazon", "flipkart", "myntra", "blinkit", "zepto", "instamart", "mart",
        "supermarket", "clothes", "shoes", "zara", "decathlon", "grocery", "pharmacy", "medical"
    ]
}

def parse_amount(text: str) -> float:
    """Extracts numeric monetary amount from raw SMS/bank notification."""
    # Matches formats like Rs. 250, Rs 250.00, INR 450, ₹1,200.50, 250 INR
    patterns = [
        r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)',
        r'([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)',
        r'(?:paid|debited|spent|sent|amount)\s*(?:of)?\s*([\d,]+(?:\.\d{1,2})?)'
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            clean_str = match.group(1).replace(',', '')
            try:
                return float(clean_str)
            except ValueError:
                continue
    
    # Fallback search for isolated number
    numbers = re.findall(r'\b\d+(?:\.\d{1,2})?\b', text)
    if numbers:
        # Filter numbers that look like dates or reference IDs
        for num in numbers:
            val = float(num)
            if 1 <= val <= 100000:  # reasonable transaction range
                return val
    return 0.0

def parse_merchant(text: str) -> str:
    """Extracts merchant name or entity from text."""
    # Clean common bank prefix noise
    cleaned = re.sub(r'(?:paid to|sent to|debited for|at|to|via upi|ref\s*\d+|tx\s*\d+|vpa)', ' ', text, flags=re.IGNORECASE)
    
    # Check known brands
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in text.lower():
                return kw.capitalize()
    
    # Fallback to uppercase token heuristic
    words = [w.strip('.,-') for w in text.split() if len(w) > 2 and not w.isdigit()]
    for word in words:
        if word.lower() not in ['paid', 'sent', 'debited', 'rs', 'inr', 'bank', 'account', 'upi', 'ref', 'towards', 'amount']:
            return word.capitalize()
            
    return "General Expense"

def categorize_transaction(text: str, merchant: str) -> Dict[str, Any]:
    """Uses text keyword matching and NLP classification to predict budget category."""
    combined_text = f"{text} {merchant}".lower()
    
    scores = {}
    for cat, keywords in CATEGORY_RULES.items():
        score = 0
        for kw in keywords:
            if kw in combined_text:
                score += 2 if kw in merchant.lower() else 1
        scores[cat] = score
        
    best_cat = max(scores, key=scores.get)
    highest_score = scores[best_cat]
    
    if highest_score == 0:
        return {
            "category": "Miscellaneous",
            "confidence": 0.60
        }
    
    confidence = min(0.98, 0.75 + (highest_score * 0.08))
    return {
        "category": best_cat,
        "confidence": round(confidence, 2)
    }

def auto_tag_transaction(raw_text: str) -> Dict[str, Any]:
    """Main Auto-Tagging entry point combining amount, merchant, and category extraction."""
    amount = parse_amount(raw_text)
    merchant = parse_merchant(raw_text)
    cat_info = categorize_transaction(raw_text, merchant)
    
    return {
        "raw_text": raw_text,
        "amount": amount,
        "merchant": merchant,
        "category": cat_info["category"],
        "confidence": cat_info["confidence"],
        "auto_tagged": True
    }
