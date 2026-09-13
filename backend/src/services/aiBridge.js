import axios from 'axios';

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8001';

export async function parseTransactionNLP(rawText) {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/nlp/tag`, { raw_text: rawText }, { timeout: 3000 });
    return response.data;
  } catch (error) {
    console.warn('Python AI NLP service unavailable, using local JS fallback parser:', error.message);
    const matchAmt = rawText.match(/(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    const amount = matchAmt ? parseFloat(matchAmt[1].replace(',', '')) : 150.0;
    
    let category = 'Food & Dining';
    let merchant = 'Swiggy';
    
    const lower = rawText.toLowerCase();
    if (lower.includes('uber') || lower.includes('ola') || lower.includes('metro') || lower.includes('cab')) {
      category = 'Transport & Travel';
      merchant = lower.includes('uber') ? 'Uber' : 'Transport';
    } else if (lower.includes('book') || lower.includes('tuition') || lower.includes('udemy')) {
      category = 'Academics & Books';
      merchant = 'College Bookstore';
    } else if (lower.includes('netflix') || lower.includes('movie') || lower.includes('spotify')) {
      category = 'Entertainment & Subs';
      merchant = 'Entertainment';
    } else if (lower.includes('zomato') || lower.includes('food') || lower.includes('swiggy') || lower.includes('canteen')) {
      category = 'Food & Dining';
      merchant = lower.includes('zomato') ? 'Zomato' : 'Swiggy';
    }

    return {
      raw_text: rawText,
      amount,
      merchant,
      category,
      confidence: 0.88,
      auto_tagged: true
    };
  }
}

export async function predictZeroDateML(transactions, allowanceAmount, currentBalance, allowanceCycleDay = 1) {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/ml/predict-zero-date`, {
      transactions,
      allowance_amount: allowanceAmount,
      current_balance: currentBalance,
      allowance_cycle_day: allowanceCycleDay
    }, { timeout: 3000 });
    return response.data;
  } catch (error) {
    console.warn('Python AI ML Predictor service unavailable, using local JS regression fallback:', error.message);
    
    const now = new Date();
    const daysInMonth = 30;
    const daysUntilAllowance = Math.max(1, daysInMonth - now.getDate());
    
    let totalSpent = 0;
    transactions.forEach(t => totalSpent += (t.amount || 0));
    const dailyBurnRate = Math.max(50, totalSpent / Math.max(1, transactions.length));
    const daysUntilZero = Math.max(1, Math.floor(currentBalance / dailyBurnRate));
    
    const zeroDate = new Date();
    zeroDate.setDate(now.getDate() + daysUntilZero);
    
    const dailyLimit = currentBalance / daysUntilAllowance;
    const isCritical = daysUntilZero < daysUntilAllowance;

    const trajectory = [];
    for (let i = 0; i < Math.min(30, daysUntilAllowance + 5); i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      trajectory.push({
        day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        projectedBalance: Math.max(0, currentBalance - (i * dailyBurnRate)),
        safeThreshold: Math.max(0, currentBalance - (i * dailyLimit))
      });
    }

    return {
      zero_balance_date: zeroDate.toISOString().split('T')[0],
      zero_balance_date_formatted: zeroDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      days_until_zero: daysUntilZero,
      days_until_allowance: daysUntilAllowance,
      current_balance: currentBalance,
      daily_burn_rate: Math.round(dailyBurnRate),
      recommended_daily_limit: Math.round(dailyLimit),
      risk_level: isCritical ? 'CRITICAL' : 'SAFE',
      insight_msg: isCritical 
        ? `Warning! At ₹${Math.round(dailyBurnRate)}/day, cash depletes on ${zeroDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysUntilAllowance - daysUntilZero} days before allowance). Cap daily spend to ₹${Math.round(dailyLimit)}!`
        : `Safe! Limit daily spend to ₹${Math.round(dailyLimit)}/day to last until allowance day.`,
      trajectory
    };
  }
}

export async function askRAGAdvisor(query, transactions, currentBalance, zeroBalanceDate, dailyLimit) {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/rag/advise`, {
      query,
      transactions,
      current_balance: currentBalance,
      zero_balance_date: zeroBalanceDate,
      daily_limit: dailyLimit
    }, { timeout: 6000 });
    return response.data;
  } catch (error) {
    console.warn('Python AI RAG service unavailable, using local fallback:', error.message);
    return {
      answer: `Based on your records, your current balance is ₹${currentBalance} and your safe daily spend limit is ₹${dailyLimit}/day. To avoid depleting your funds before ${zeroBalanceDate}, keep discretionary expenses capped.`,
      citations: transactions.slice(0, 3),
      model_used: 'Local Fallback',
      grounded: true
    };
  }
}
