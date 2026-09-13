import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { ProfilePage } from './pages/ProfilePage';
import { AIAdvisor } from './pages/AIAdvisor';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { api } from './lib/api';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [allowance, setAllowance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = async () => {
    try {
      const [txRes, incRes, predRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/income'),
        api.get('/analytics/predict-zero')
      ]);
      setTransactions(txRes.data || []);
      setIncomes(incRes.data || []);
      setPrediction(predRes.data || {});
    } catch (err) {
      console.error('Failed to load user records:', err);
    }
  };

  // Check auth state on load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userRes = await api.get('/auth/me');
        setUser(userRes.data);
        setBalance(userRes.data.currentBalance || 0);
        setAllowance(userRes.data.allowanceAmount || 0);

        await fetchUserData();
      } catch (err) {
        console.error('Auth verification failed:', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLoginSuccess = async (userData: any, accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    setBalance(userData.currentBalance || 0);
    setAllowance(userData.allowanceAmount || 0);

    await fetchUserData();
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setTransactions([]);
    setIncomes([]);
    setPrediction({});
  };

  const handleAddTransaction = async (rawText: string) => {
    try {
      const res = await api.post('/transactions/parse', { rawText });
      if (res.data.transaction) {
        setTransactions((prev) => [res.data.transaction, ...prev]);
        setBalance(res.data.updatedBalance);
        
        const predRes = await api.get('/analytics/predict-zero');
        setPrediction(predRes.data || {});
      }
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const target = transactions.find((t) => t._id === id);
    if (!target) return;

    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      setBalance((prev) => prev + target.amount);

      const predRes = await api.get('/analytics/predict-zero');
      setPrediction(predRes.data || {});
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const handleAddIncome = async (title: string, amount: number, sourceCategory: string) => {
    try {
      const res = await api.post('/income', { title, amount, sourceCategory });
      if (res.data.income) {
        setIncomes((prev) => [res.data.income, ...prev]);
        setBalance(res.data.updatedBalance);

        const predRes = await api.get('/analytics/predict-zero');
        setPrediction(predRes.data || {});
      }
    } catch (err) {
      console.error('Failed to log extra income:', err);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      const res = await api.delete(`/income/${id}`);
      setIncomes((prev) => prev.filter((i) => i._id !== id));
      if (res.data.updatedBalance !== undefined) {
        setBalance(res.data.updatedBalance);
      }

      const predRes = await api.get('/analytics/predict-zero');
      setPrediction(predRes.data || {});
    } catch (err) {
      console.error('Failed to delete income:', err);
    }
  };

  const handleUpdateProfile = async (
    name: string,
    email: string,
    allowanceAmount: number,
    currentBalance: number,
    allowanceCycleDay: number
  ) => {
    try {
      const res = await api.put('/auth/profile', {
        name,
        email,
        allowanceAmount,
        currentBalance,
        allowanceCycleDay
      });
      setUser(res.data);
      setAllowance(res.data.allowanceAmount);
      setBalance(res.data.currentBalance);

      const predRes = await api.get('/analytics/predict-zero');
      setPrediction(predRes.data || {});
    } catch (err) {
      console.error('Failed to update profile setup:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-blue-700 font-bold text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-ping"></span>
          <span>Loading Stash Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/" replace /> : <RegisterPage onLoginSuccess={handleLoginSuccess} />
          }
        />

        {/* Protected App Routes */}
        <Route
          path="*"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : (
              <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
                <Navbar
                  user={user}
                  balance={balance}
                  allowance={allowance}
                  onLogout={handleLogout}
                />

                <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 md:p-6">
                  <Sidebar />

                  <main className="flex-1 min-w-0">
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <Dashboard
                            user={user}
                            transactions={transactions}
                            prediction={prediction}
                            onAddTransaction={handleAddTransaction}
                            balance={balance}
                          />
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <Transactions
                            transactions={transactions}
                            onAddTransaction={handleAddTransaction}
                            onDeleteTransaction={handleDeleteTransaction}
                          />
                        }
                      />
                      <Route
                        path="/advisor"
                        element={
                          <AIAdvisor
                            user={user}
                            transactions={transactions}
                            balance={balance}
                            onRefreshTransactions={fetchUserData}
                          />
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProfilePage
                            user={user}
                            incomes={incomes}
                            balance={balance}
                            allowance={allowance}
                            onUpdateProfile={handleUpdateProfile}
                            onAddIncome={handleAddIncome}
                            onDeleteIncome={handleDeleteIncome}
                          />
                        }
                      />
                    </Routes>
                  </main>
                </div>
              </div>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
