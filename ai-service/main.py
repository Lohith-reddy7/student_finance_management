import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

from nlp_engine import auto_tag_transaction
from broke_predictor import predict_zero_balance_date
from rag_advisor import answer_financial_query_rag

app = FastAPI(
    title="Student AI Finance Microservice",
    description="Python NLP Auto-Tagging, ML Zero-Balance Date Predictor & Gemini RAG Advisor",
    version="3.0.0"
)

# Pydantic Schemas
class TagRequest(BaseModel):
    raw_text: str

class PredictRequest(BaseModel):
    transactions: List[Dict[str, Any]]
    allowance_amount: float
    current_balance: float
    allowance_cycle_day: Optional[int] = 1
    current_date: Optional[str] = None

class RagRequest(BaseModel):
    query: str
    transactions: List[Dict[str, Any]]
    current_balance: float
    zero_balance_date: Optional[str] = "End of Month"
    daily_limit: Optional[float] = 200.0

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Python AI Microservice"}

@app.post("/api/nlp/tag")
def nlp_tag_endpoint(req: TagRequest):
    if not req.raw_text or not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text is required")
    return auto_tag_transaction(req.raw_text)

@app.post("/api/ml/predict-zero-date")
def ml_predict_endpoint(req: PredictRequest):
    return predict_zero_balance_date(
        transactions=req.transactions,
        allowance_amount=req.allowance_amount,
        current_balance=req.current_balance,
        allowance_cycle_day=req.allowance_cycle_day or 1,
        current_date_str=req.current_date
    )

@app.post("/api/rag/advise")
def rag_advise_endpoint(req: RagRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="query is required")
    return answer_financial_query_rag(
        query=req.query,
        transactions=req.transactions,
        current_balance=req.current_balance,
        zero_balance_date=req.zero_balance_date or "End of Month",
        daily_limit=req.daily_limit or 200.0
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    print(f"Starting Python AI Service on http://localhost:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
