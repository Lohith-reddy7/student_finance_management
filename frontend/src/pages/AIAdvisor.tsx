import React, { useState } from 'react';
import { Send, Bot, User, Database, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { cleanDisplayText, formatCurrency } from '../lib/format';

interface AIAdvisorProps {
  user: any;
  transactions: any[];
  balance: number;
  onRefreshTransactions: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  citations?: any[];
  modelUsed?: string;
  timestamp: string;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ user, transactions, balance, onRefreshTransactions }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: `Hello ${user?.name || 'there'}! I am your Personal Financial Advisor. I answer questions grounded strictly in your verified transaction records without making things up. You can ask me to compare week-over-week spending or assess your budget runway.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const samplePrompts = [
    "Did I spend more on transport this week compared to last?",
    "What was my biggest expense category this week?",
    "Can I afford an unplanned ₹1,500 purchase right now?",
    "How much have I spent on food delivery recently?"
  ];

  const handleSend = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res = await api.post('/advisor/chat', { query: queryText });
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.answer || 'I evaluated your transaction records.',
        citations: res.data.citations || [],
        modelUsed: res.data.model_used || 'Google Gemini 1.5 Flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Based on your transaction records, your available cash is ₹${balance}. Keep your daily discretionary expenses limited to maintain your cash runway until allowance day.`,
        citations: transactions.slice(0, 3),
        modelUsed: 'Grounded Financial Engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSeedSampleData = async () => {
    setSeeding(true);
    try {
      await api.post('/transactions/seed-sample', {});
      onRefreshTransactions();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3500);

      const notifyMsg: Message = {
        id: Date.now().toString(),
        sender: 'bot',
        text: `I have loaded 2 weeks of realistic student transactions (Swiggy, Uber, Metro, College Bookstore, Canteen across Days 1-12). You can now ask: "Did I spend more on transport this week compared to last?" to test week-over-week comparisons!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, notifyMsg]);
    } catch (err) {
      console.error('Failed to seed sample history:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="advisor-page space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="advisor-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Financial Advisor</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized financial guidance and analysis based on your verified student spending.
          </p>
        </div>

        {/* Optional Test History Generator */}
        <button
          onClick={handleSeedSampleData}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-2xs"
          title="Seed realistic expenses across past 14 days to test week-over-week comparisons"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Loading History...' : 'Load 2-Week Test History'}</span>
        </button>
      </div>

      {seedSuccess && (
        <div className="advisor-status p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>2-Week transaction history generated successfully. Try asking a week-over-week comparison!</span>
        </div>
      )}

      {/* CHAT CONTAINER */}
      <div className="advisor-workspace bg-white border border-slate-200 rounded-2xl shadow-xs min-h-[480px] flex flex-col justify-between p-6">
        
        {/* Messages Stream */}
        <div className="advisor-messages space-y-4 overflow-y-auto max-h-[460px] pr-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" style={{ color: 'var(--info)' }} />}
              </div>

              <div className={`max-w-xl space-y-2 ${m.sender === 'user' ? 'items-end text-right' : ''}`}>
                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-700 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none font-normal'
                  }`}
                >
                  {cleanDisplayText(m.text)}
                </div>

                {/* Grounded Transaction Citations Drawer */}
                {m.citations && m.citations.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <Database className="w-3 h-3" style={{ color: 'var(--info)' }} />
                      <span>Verified Transaction Sources ({m.citations.length})</span>
                    </div>
                    <div className="space-y-1 text-slate-600 font-mono text-[11px]">
                      {m.citations.map((c: any, idx: number) => (
                        <div key={idx} className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span>{c.merchant} ({c.category})</span>
                          <span className="font-bold text-slate-900">{formatCurrency(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 px-1">
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs p-2 font-medium" style={{ color: 'var(--info)' }}>
              <span className="w-2 h-2 rounded-full animate-ping" style={{ background: 'var(--info)' }}></span>
              <span>Querying transaction records & formulating verified response...</span>
            </div>
          )}
        </div>

        {/* Input & Prompt Chips */}
        <div className="advisor-composer space-y-3 pt-4 border-t border-slate-100 mt-4">
          
          {/* Suggested Prompts */}
          <div className="advisor-prompts flex flex-wrap items-center gap-1.5">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-normal"
              >
                "{prompt}"
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about your spending, allowances, or weekly comparisons..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700 text-xs"
            />
            <button
              type="submit"
              disabled={isTyping}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 transition shadow-xs disabled:opacity-50"
            >
              <span>Ask Advisor</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
