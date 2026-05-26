# Shennell AI Agent Platform

Shennell is a multi-agent AI platform with a bold, flirty-yet-ruthless host personality that orchestrates
specialized mini-agents for finance, healthcare, design, law, security, and more.

## Repo structure

- `backend/`: FastAPI + MongoDB API
- `frontend/`: Expo Router (React Native) client
- `memory/PRD.md`: Product requirements

## Prerequisites

- Python 3.11+
- Node.js 18+ (Yarn recommended)
- MongoDB instance
- Emergent LLM API key

## Main setup

### 1) Backend

1. Create `backend/.env`:

   ```bash
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=shennell
   EMERGENT_LLM_KEY=your_key_here
   ```

2. Install dependencies:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Run the API:

   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

### 2) Frontend

1. Create `frontend/.env`:

   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

2. Install dependencies:

   ```bash
   cd frontend
   yarn install
   ```

3. Start the app:

   ```bash
   yarn start
   ```

## Testing & linting

- Backend tests (requires the API running and `EXPO_PUBLIC_BACKEND_URL` set in `frontend/.env`):

  ```bash
  cd backend
  pytest
  ```

- Frontend lint:

  ```bash
  cd frontend
  yarn lint
  ```
