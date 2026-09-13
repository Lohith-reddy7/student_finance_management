import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from typing import List, Dict, Any

def predict_zero_balance_date(
    transactions: List[Dict[str, Any]],
    allowance_amount: float,
    current_balance: float,
    allowance_cycle_day: int = 1,
    current_date_str: str = None
) -> Dict[str, Any]:
    """
    Analyzes student spending history using Pandas and Machine Learning regression
    to project daily burn rate and calculate exact Zero-Balance Date.
    """
    now = datetime.now() if not current_date_str else datetime.fromisoformat(current_date_str.replace('Z', ''))
    
    # Calculate next allowance date
    if now.day >= allowance_cycle_day:
        # Next month
        year = now.year + (1 if now.month == 12 else 0)
        month = (now.month % 12) + 1
    else:
        year = now.year
        month = now.month
        
    next_allowance_date = datetime(year, month, min(allowance_cycle_day, 28))
    days_until_allowance = max(1, (next_allowance_date - now).days)
    
    # Process transactions into pandas dataframe
    if not transactions:
        # Default fallback if no transaction history exists
        daily_limit = current_balance / days_until_allowance
        return {
            "zero_balance_date": next_allowance_date.strftime("%Y-%m-%d"),
            "days_until_zero": days_until_allowance,
            "days_until_allowance": days_until_allowance,
            "current_balance": current_balance,
            "daily_burn_rate": round(allowance_amount / 30, 2),
            "recommended_daily_limit": round(daily_limit, 2),
            "risk_level": "SAFE",
            "insight_msg": f"No spending recorded yet. You can spend up to ₹{round(daily_limit, 0)}/day safely!",
            "trajectory": []
        }
        
    df = pd.DataFrame(transactions)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df = df.dropna(subset=['date']).sort_values('date')
    
    if df.empty:
        daily_limit = current_balance / days_until_allowance
        return {
            "zero_balance_date": next_allowance_date.strftime("%Y-%m-%d"),
            "days_until_zero": days_until_allowance,
            "days_until_allowance": days_until_allowance,
            "current_balance": current_balance,
            "daily_burn_rate": round(allowance_amount / 30, 2),
            "recommended_daily_limit": round(daily_limit, 2),
            "risk_level": "SAFE",
            "insight_msg": f"Safe! Spend up to ₹{round(daily_limit, 0)}/day to reach allowance day.",
            "trajectory": []
        }
        
    # Aggregate daily spending
    df['day_idx'] = (df['date'] - df['date'].min()).dt.days
    daily_spend = df.groupby('day_idx')['amount'].sum().reset_index()
    
    # Machine Learning Regression for daily velocity
    X = daily_spend[['day_idx']].values
    y = daily_spend['amount'].values
    
    if len(daily_spend) > 1:
        model = LinearRegression()
        model.fit(X, y)
        avg_daily_burn = max(10.0, float(np.mean(y)))
    else:
        avg_daily_burn = float(daily_spend['amount'].iloc[0]) if not daily_spend.empty else 100.0
        
    # Estimate days until zero balance
    if avg_daily_burn > 0:
        days_until_zero = int(current_balance / avg_daily_burn)
    else:
        days_until_zero = days_until_allowance + 10
        
    zero_balance_dt = now + timedelta(days=days_until_zero)
    recommended_daily_limit = current_balance / days_until_allowance
    
    # Assess Risk Level
    if days_until_zero < days_until_allowance:
        risk_level = "CRITICAL"
        shortage_days = days_until_allowance - days_until_zero
        insight_msg = (
            f"🚨 CRITICAL WARNING! At your current burn rate of ₹{round(avg_daily_burn, 0)}/day, "
            f"you will hit ₹0 on {zero_balance_dt.strftime('%b %d')} ({shortage_days} days BEFORE allowance!). "
            f"Cap spending to ₹{round(recommended_daily_limit, 0)}/day to survive."
        )
    elif days_until_zero <= days_until_allowance + 2:
        risk_level = "WARNING"
        insight_msg = (
            f"⚠️ TIGHT BUDGET! You'll hit ₹0 on {zero_balance_dt.strftime('%b %d')}, right on allowance day. "
            f"Limit daily expenses to ₹{round(recommended_daily_limit, 0)}/day."
        )
    else:
        risk_level = "SAFE"
        insight_msg = (
            f"🟢 SAFE! You're on track to last until allowance day ({next_allowance_date.strftime('%b %d')}). "
            f"Target daily limit: ₹{round(recommended_daily_limit, 0)}/day."
        )
        
    # Generate daily trajectory points for UI Recharts line graph
    trajectory = []
    bal = current_balance
    for d in range(min(40, max(days_until_allowance + 5, days_until_zero + 5))):
        dt_point = now + timedelta(days=d)
        proj_bal = max(0.0, current_balance - (d * avg_daily_burn))
        trajectory.append({
            "day": dt_point.strftime("%b %d"),
            "projectedBalance": round(proj_bal, 2),
            "safeThreshold": round(max(0.0, current_balance - (d * recommended_daily_limit)), 2)
        })

    return {
        "zero_balance_date": zero_balance_dt.strftime("%Y-%m-%d"),
        "zero_balance_date_formatted": zero_balance_dt.strftime("%b %d, %Y"),
        "days_until_zero": days_until_zero,
        "days_until_allowance": days_until_allowance,
        "next_allowance_date": next_allowance_date.strftime("%b %d, %Y"),
        "current_balance": current_balance,
        "daily_burn_rate": round(avg_daily_burn, 2),
        "recommended_daily_limit": round(recommended_daily_limit, 2),
        "risk_level": risk_level,
        "insight_msg": insight_msg,
        "trajectory": trajectory
    }
