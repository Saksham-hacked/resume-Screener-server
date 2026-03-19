# NutaScreener — AI Resume Screening System

An AI-powered resume screening system built for the Nutrabay AI Automation Intern Assessment. Upload a job description, drop in your resumes, set your priorities, and get a ranked list of candidates with scores, strengths, gaps, and hiring recommendations — in seconds.

---

## The Problem

Manual resume screening is slow, inconsistent, and biased by fatigue. When you're hiring at scale, reading through 50 resumes one by one to find the top 5 candidates is a waste of recruiter time. NutaScreener automates that first pass entirely.

---

## What It Does

- **Parses resumes** — Upload PDFs, text is extracted automatically
- **Scores candidates** — Gemini AI evaluates each resume against the JD across 4 dimensions: Technical Skills, Experience, Education, Soft Skills
- **Respects your priorities** — Adjustable weightage sliders let recruiters define what matters most for the role
- **Ranks candidates** — Final weighted score determines rank; top candidates surface immediately
- **Explains decisions** — Every candidate gets a "Why this score" explanation, extracted skills, strengths, and gaps
- **Stores history** — All sessions saved in MongoDB; revisit any past screening anytime
- **Exports results** — One-click CSV export of the full ranked table

---

## Tech Stack

**Frontend**
- React 18 (Vite)
- Tailwind CSS
- React Router v6
- Axios
- Recharts (radar chart per candidate)
- React Dropzone
- React Hot Toast
- Lucide React

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- Google Gemini API (gemini-1.5-flash)
- pdf-parse (PDF text extraction)
- Multer (file uploads, memory storage)
- Express Validator

---

## Project Structure

```
nutrabay-screener/
├── client/                  # React frontend
│   └── src/
│       ├── components/
│       │   ├── layout/      # Navbar, Layout
│       │   ├── jd/          # JD input, saved JD list
│       │   ├── screening/   # Upload, weightage sliders
│       │   ├── results/     # Table, drawer, compare view
│       │   └── shared/      # Dropzone, spinner, toast, empty state
│       ├── pages/           # Home, Screening, Results, History
│       ├── hooks/           # useScreening, useJD, useSessions
│       ├── services/        # Axios API functions
│       └── utils/           # Score colors, CSV export, date format
│
└── server/                  # Node.js backend
    └── src/
        ├── config/          # MongoDB connection
        ├── controllers/     # JD, screening, session logic
        ├── models/          # JD, Candidate, Session schemas
        ├── routes/          # API route definitions
        ├── services/        # PDF parsing, Gemini API, scoring
        ├── middleware/      # Error handler, validation, multer
        └── utils/           # Prompt builder
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB running locally (or a MongoDB Atlas URI)
- Google Gemini API key

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/nutrabay-screener.git
cd nutrabay-screener
```

### 2. Setup the backend
```bash
cd server
npm install
cp .env.example .env
```

Fill in your `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nutrabay-screener
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the server:
```bash
npm run dev
```

### 3. Setup the frontend
```bash
cd ../client
npm install
cp .env.example .env
```

Fill in your `.env`:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

### 4. Open the app
```
http://localhost:5173
```

---

## How to Use

1. **Go to Screen Candidates**
2. **Add a Job Description** — paste text, upload a PDF, or pick a saved JD
3. **Set Weightages** — adjust the 4 sliders to reflect role priorities (must sum to 100%)
4. **Upload Resumes** — drag and drop up to 10 PDF resumes
5. **Click Screen Candidates** — AI processes each resume against the JD
6. **View Results** — ranked table with scores, badges, and candidate details
7. **Click any candidate** — see full breakdown, radar chart, skills, strengths, gaps
8. **Compare** — select 2-3 candidates for side-by-side comparison
9. **Export** — download results as CSV

---

## API Reference

### JD Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jd/text` | Save JD from text |
| POST | `/api/jd/upload` | Save JD from PDF |
| GET | `/api/jd` | Get all saved JDs |
| DELETE | `/api/jd/:id` | Delete a JD |

### Screening Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/screening/screen` | Screen resumes against JD |

### Session Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get all past sessions |
| GET | `/api/sessions/:id` | Get session + all candidates |
| DELETE | `/api/sessions/:id` | Delete session and candidates |

---

## Scoring Logic

Each resume is scored across 4 dimensions by Gemini AI (0-100 each). The final score is a weighted sum based on recruiter-defined priorities:

```
Final Score = (Technical × W1 + Experience × W2 + Education × W3 + Soft Skills × W4) / 100
```

Default weightages: Technical 40% · Experience 30% · Education 20% · Soft Skills 10%

**Recommendation thresholds:**
- 🟢 **Strong Fit** — Final score ≥ 70
- 🟡 **Moderate Fit** — Final score 45–69
- 🔴 **Not Fit** — Final score < 45

---

## What I'd Add With More Time

- **Semantic similarity layer** — use embeddings + cosine similarity for more nuanced matching beyond LLM scoring alone
- **Bias detection** — flag resumes where name, college, or gender may be influencing the score
- **Role templates** — pre-saved weightage configs for common roles (SDE, Marketing, Operations)
- **Email integration** — auto-send shortlist to hiring manager after screening
- **Auth** — multi-user support so different recruiters have their own session history

---

## Author

**Saksham Kaushish**  
BTech Electrical Engineering, NIT Jalandhar (2023–2027)  
[GitHub](https://github.com/Saksham-hacked) · [LinkedIn](https://linkedin.com/in/reach-saksham-kaushish) · kaushishsaksham@gmail.com