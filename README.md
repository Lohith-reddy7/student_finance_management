# STASH: Student AI Finance App ⚡

A smart, simple, and sleek financial platform built specifically for students to manage irregular allowances, auto-tag messy bank SMS notifications using NLP, and predict when cash will run out using Machine Learning.

---

## 🌟 The 2 Core Features

1. **Auto-Tagging Transactions (Python NLP / SpaCy)**
   - Automatically parses messy bank SMS / UPI text (`"Paid Rs 240 to SWIGGY UPI ref 49102"`) to extract exact amount (`₹240`), merchant (`Swiggy`), budget category (`Food & Dining`), and confidence score (`96%`).
   - Includes a live SpaCy NLP Sandbox where students can paste messy text, test the extraction output, and save it directly to their ledger.

2. **Predicting When We Go Broke (Machine Learning)**
   - Uses Pandas & Scikit-Learn regression models to calculate daily spending velocity and project the exact **Zero-Balance Date** (e.g. `Sep 22, 2026`).
   - Calculates safe daily spending limits, renders an interactive Recharts depletion curve, and features a "What-If" Impulse Purchase Simulator.

---

## 🛠️ Project Structure

```
my2/
├── ai-service/             # Python FastAPI Microservice (Port 8001)
│   ├── main.py             # FastAPI REST Server
│   ├── nlp_engine.py       # SpaCy Auto-Tagging Engine
│   └── broke_predictor.py  # Pandas & ML Zero-Balance Date Predictor
├── backend/                # Node.js + Express MERN Backend (Port 8000)
│   └── src/
│       ├── models/         # Mongoose Schemas (User, Transaction)
│       ├── routes/         # REST API Routes (auth, transactions, analytics)
│       ├── services/       # Express to Python AI Bridge (aiBridge.js)
│       └── server.js       # Main Express Server
└── frontend/               # React + Vite + Tailwind CSS Dark Glassmorphism UI (Port 5173)
    └── src/
        ├── pages/          # Dashboard.tsx & Transactions.tsx
        ├── components/     # Navbar.tsx & Sidebar.tsx
        └── App.tsx         # Main React SPA Routing
```

---

## ⚡ How to Run the Application

### 1. Run Python AI Microservice (Port 8001)
```powershell
cd ai-service
.\venv\Scripts\python main.py
```

### 2. Run MERN Backend Server (Port 8000)
```powershell
cd backend
npm run dev
```

### 3. Run React Frontend (Port 5173)
```powershell
cd frontend
npm run dev
```
