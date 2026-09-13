import os
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Graceful import for Google Gemini
GEMINI_CLIENT = None
try:
    from google import genai
    GEMINI_CLIENT = "google-genai"
except ImportError:
    try:
        import google.generativeai as genai_legacy
        GEMINI_CLIENT = "google-generativeai"
    except ImportError:
        GEMINI_CLIENT = None

# Graceful import for Pinecone
PINECONE_AVAILABLE = False
try:
    from pinecone import Pinecone
    PINECONE_AVAILABLE = True
except Exception:
    PINECONE_AVAILABLE = False

def calculate_temporal_metrics(query: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes exact temporal windows: This Week (past 7 days) vs Last Week (days 7-14 ago).
    Detects data boundaries to prevent AI from hallucinating missing history.
    """
    now = datetime.now()
    this_week_cutoff = now - timedelta(days=7)
    last_week_cutoff = now - timedelta(days=14)

    # Category matching map
    category_map = {
        "transport": ["transport", "travel", "uber", "ola", "metro", "bus", "auto", "cab", "petrol"],
        "food": ["food", "dining", "swiggy", "zomato", "canteen", "cafe", "starbucks", "burger", "pizza", "coffee"],
        "academics": ["books", "bookstore", "tuition", "udemy", "xerox", "course", "college"],
        "entertainment": ["netflix", "movie", "spotify", "prime", "gaming", "steam"],
        "shopping": ["shopping", "amazon", "flipkart", "blinkit", "zepto", "clothes"]
    }

    target_category = None
    query_lower = query.lower()
    for cat_name, keywords in category_map.items():
        if any(kw in query_lower for kw in keywords):
            target_category = cat_name
            break

    this_week_txs = []
    last_week_txs = []
    older_txs = []
    earliest_date = None

    for tx in transactions:
        try:
            date_str = tx.get("date")
            if not date_str:
                continue
            tx_date = datetime.fromisoformat(str(date_str).replace('Z', ''))
            
            if earliest_date is None or tx_date < earliest_date:
                earliest_date = tx_date

            if tx_date >= this_week_cutoff:
                this_week_txs.append(tx)
            elif tx_date >= last_week_cutoff:
                last_week_txs.append(tx)
            else:
                older_txs.append(tx)
        except Exception:
            continue

    def get_cat_sum(tx_list: List[Dict[str, Any]]) -> (float, List[Dict[str, Any]]):
        total = 0.0
        matched = []
        for t in tx_list:
            cat = str(t.get("category", "")).lower()
            merch = str(t.get("merchant", "")).lower()
            raw = str(t.get("rawText", "")).lower()
            amt = float(t.get("amount", 0.0))

            if not target_category:
                total += amt
                matched.append(t)
            else:
                keywords = category_map.get(target_category, [])
                if any(kw in cat or kw in merch or kw in raw for kw in keywords):
                    total += amt
                    matched.append(t)
        return round(total, 2), matched

    this_week_cat_sum, this_week_cat_txs = get_cat_sum(this_week_txs)
    last_week_cat_sum, last_week_cat_txs = get_cat_sum(last_week_txs)

    has_last_week_data = len(last_week_txs) > 0

    return {
        "target_category": target_category or "all spending",
        "earliest_date_str": earliest_date.strftime("%b %d, %Y") if earliest_date else "today",
        "has_last_week_data": has_last_week_data,
        "this_week_cat_sum": this_week_cat_sum,
        "this_week_cat_txs": this_week_cat_txs,
        "last_week_cat_sum": last_week_cat_sum,
        "last_week_cat_txs": last_week_cat_txs,
        "total_this_week": sum(float(t.get("amount", 0)) for t in this_week_txs),
        "total_last_week": sum(float(t.get("amount", 0)) for t in last_week_txs)
    }

def answer_financial_query_rag(
    query: str,
    transactions: List[Dict[str, Any]],
    current_balance: float,
    zero_balance_date: str,
    daily_limit: float
) -> Dict[str, Any]:
    """
    RAG Advisor orchestration using Gemini with temporal calculations & zero-hallucination guardrail.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    pinecone_key = os.getenv("PINECONE_API_KEY", "").strip()

    metrics = calculate_temporal_metrics(query, transactions)
    citations = metrics["this_week_cat_txs"] + metrics["last_week_cat_txs"]
    if not citations:
        citations = transactions[:4]

    # Check if a genuine Gemini API key is present
    is_gemini_configured = bool(gemini_key and not gemini_key.startswith("your_"))

    if is_gemini_configured:
        prompt = f"""You are a smart, factual, and practical AI Student Money Advisor for 'Stash'.
Answer the student's question accurately using ONLY the verified transaction facts provided below.
Do not invent any numbers. If past data is missing, explain the boundary politely.

Student Question: "{query}"

STUDENT FINANCIAL STATUS:
- Available Cash Balance: ₹{current_balance}
- Projected Zero-Balance Date: {zero_balance_date}
- Safe Daily Spending Limit: ₹{daily_limit}/day

GROUNDED TRANSACTION FACTS:
- Earliest Transaction Recorded On Account: {metrics['earliest_date_str']}
- Has Transaction Data for Last Week (7-14 days ago): {metrics['has_last_week_data']}
- Topic/Category Identified: {metrics['target_category']}
- This Week (Past 7 Days) Category Spend: ₹{metrics['this_week_cat_sum']} (Transactions: {[{t.get('merchant'): t.get('amount')} for t in metrics['this_week_cat_txs']]})
- Last Week Category Spend: ₹{metrics['last_week_cat_sum']} (Transactions: {[{t.get('merchant'): t.get('amount')} for t in metrics['last_week_cat_txs']]})

RULES:
1. If the student asks to compare this week with last week, and 'has_last_week_data' is False, explain that their history starts on {metrics['earliest_date_str']} and state what they spent this week. Do not hallucinate previous week numbers!
2. If data is present, provide the exact difference (e.g. spent ₹X more/less this week).
3. Be concise (3-4 sentences max) and provide 1 practical student budgeting tip."""

        try:
            if GEMINI_CLIENT == "google-genai":
                client = genai.Client(api_key=gemini_key)
                response = client.models.generate_content(
                    model='gemini-1.5-flash',
                    contents=prompt
                )
                return {
                    "answer": response.text.strip(),
                    "citations": citations[:5],
                    "model_used": "Google Gemini 1.5 Flash",
                    "grounded": True,
                    "metrics": metrics
                }
            elif GEMINI_CLIENT == "google-generativeai":
                import google.generativeai as legacy_genai
                legacy_genai.configure(api_key=gemini_key)
                m = legacy_genai.GenerativeModel("gemini-1.5-flash")
                response = m.generate_content(prompt)
                return {
                    "answer": response.text.strip(),
                    "citations": citations[:5],
                    "model_used": "Google Gemini 1.5 Flash",
                    "grounded": True,
                    "metrics": metrics
                }
        except Exception as e:
            print(f"Gemini API invocation error, using grounded fallback: {e}")

    # Deterministic Grounded Reasoning (Runs in Key Placeholder Mode)
    query_lower = query.lower()
    cat_name = metrics["target_category"]
    this_sum = metrics["this_week_cat_sum"]
    last_sum = metrics["last_week_cat_sum"]

    if not metrics["has_last_week_data"] and ("last week" in query_lower or "compare" in query_lower or "previous" in query_lower):
        answer = (
            f"You have spent ₹{this_sum} on {cat_name} this week. "
            f"However, I don't have records for last week because your transaction history starts on {metrics['earliest_date_str']}. "
            f"As you continue logging expenses, I will provide full week-over-week comparisons! "
            f"Tip: Keep your daily spending under ₹{daily_limit}/day to maintain your cash runway until {zero_balance_date}."
        )
    elif "last week" in query_lower or "compare" in query_lower:
        diff = abs(this_sum - last_sum)
        status = "more" if this_sum > last_sum else "less"
        answer = (
            f"You spent ₹{this_sum} on {cat_name} this week compared to ₹{last_sum} last week (₹{diff} {status} this week). "
            f"Your current cash balance is ₹{current_balance}, with a projected zero date of {zero_balance_date}. "
            f"Tip: Try capping discretionary orders to stay within your ₹{daily_limit}/day limit."
        )
    elif "afford" in query_lower or "buy" in query_lower or "can i" in query_lower:
        answer = (
            f"Your available balance is ₹{current_balance} and your zero-balance date is projected for {zero_balance_date}. "
            f"Your safe daily limit is ₹{daily_limit}/day. Any large unplanned expense will accelerate your burn rate and bring your zero-balance date forward."
        )
    else:
        answer = (
            f"Based on your ledger records, you have spent ₹{this_sum} on {cat_name} this week. "
            f"Your available cash is ₹{current_balance} and your daily target is ₹{daily_limit}/day. "
            f"You are currently on track to reach {zero_balance_date}."
        )

    return {
        "answer": answer,
        "citations": citations[:5],
        "model_used": "Deterministic Grounded RAG (Key Placeholder Mode)",
        "grounded": True,
        "metrics": metrics
    }
