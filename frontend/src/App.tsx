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
  const [appError, setAppError] = useState('');

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
      setAppError('We could not load your latest financial records. Please refresh and try again.');
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

  useEffect(() => {
    const root = document.documentElement;
    let settleTimer: number | undefined;

    const handleScroll = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      root.classList.add('is-scrolling');
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => root.classList.remove('is-scrolling'), 180);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(settleTimer);
      root.classList.remove('is-scrolling');
    };
  }, []);

  const handleLoginSuccess = async (userData: any, accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    setBalance(userData.currentBalance || 0);
    setAllowance(userData.allowanceAmount || 0);
    setAppError('');

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

  const handleAddTransaction = async (rawText: string): Promise<boolean> => {
    try {
      const res = await api.post('/transactions/parse', { rawText });
      if (res.data.transaction) {
        setTransactions((prev) => [res.data.transaction, ...prev]);
        setBalance(res.data.updatedBalance);
        
        const predRes = await api.get('/analytics/predict-zero');
        setPrediction(predRes.data || {});
        setAppError('');
        return true;
      }
      setAppError('The transaction could not be saved. Please try again.');
      return false;
    } catch (err) {
      console.error('Failed to add transaction:', err);
      setAppError('The transaction could not be saved. Check the text and try again.');
      return false;
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
      setAppError('');
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setAppError('The transaction could not be deleted. Please try again.');
    }
  };

  const handleAddIncome = async (title: string, amount: number, sourceCategory: string): Promise<boolean> => {
    try {
      const res = await api.post('/income', { title, amount, sourceCategory });
      if (res.data.income) {
        setIncomes((prev) => [res.data.income, ...prev]);
        setBalance(res.data.updatedBalance);

        const predRes = await api.get('/analytics/predict-zero');
        setPrediction(predRes.data || {});
        setAppError('');
        return true;
      }
      setAppError('The extra income entry could not be saved. Please try again.');
      return false;
    } catch (err) {
      console.error('Failed to log extra income:', err);
      setAppError('The extra income entry could not be saved. Please try again.');
      return false;
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
      setAppError('');
    } catch (err) {
      console.error('Failed to delete income:', err);
      setAppError('The extra income entry could not be deleted. Please try again.');
    }
  };

  const handleUpdateProfile = async (
    name: string,
    email: string,
    allowanceAmount: number,
    currentBalance: number,
    allowanceCycleDay: number
  ): Promise<boolean> => {
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
      setAppError('');
      return true;
    } catch (err) {
      console.error('Failed to update profile setup:', err);
      setAppError('Your profile could not be updated. Please try again.');
      return false;
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
              <div className="app-shell text-slate-900 flex flex-col">
                {appError && (
                  <div className="app-error" role="alert">
                    <span>{appError}</span>
                    <button type="button" onClick={() => setAppError('')} aria-label="Dismiss error">Dismiss</button>
                  </div>
                )}
                <Navbar
                  user={user}
                  balance={balance}
                  allowance={allowance}
                  onLogout={handleLogout}
                />

                <div className="app-content content-grid flex-1 w-full">
                  <Sidebar />

                  <main className="page-wrap">
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <Dashboard
                            user={user}
                            incomes={incomes}
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
