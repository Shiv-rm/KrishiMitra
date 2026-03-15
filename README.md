# KrishiMitra

KrishiMitra is a smart agricultural assistant designed to help farmers make data-driven decisions. It provides crop recommendations based on soil and environmental data, powered by machine learning and AI.

## Features

- **Crop Recommendation:** Predicts the best crops to grow using an XGBoost model.
- **AI Assistant:** Integrated with Google Gemini AI for agricultural queries.
- **Multilingual Support:** Accessible in multiple languages to support diverse farming communities.
- **Weather & Soil Analysis:** Data-driven insights for better farm management.
- **User Authentication:** Secure login and registration for personalized experiences.

## Tech Stack

- **Frontend:** HTML/CSS, JavaScript (Vite)
- **Backend:** Node.js (Express)
- **Machine Learning:** Python (XGBoost, Scikit-learn, Pandas)
- **Database:** PostgreSQL / SQLite
- **AI Integration:** Google Generative AI (Gemini)

## Environment Variables

Create a `.env` file in the root directory and add the following keys:

- `GEMINI_API_KEY`: Your Google Gemini API key for AI chat and image analysis.
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgres://user:password@localhost:5432/krishimitra`).
- `JWT_SECRET`: A secret string for signing JSON Web Tokens (optional).
- `PORT`: The port number for the backend server (optional, defaults to 3000).

## Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+)
- [Python 3.x](https://www.python.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Homebrew](https://brew.sh/) (for macOS users)

## Installation

### 1. System Dependencies (macOS)
The machine learning model (XGBoost) requires OpenMP for parallel processing. Install it via Homebrew:
```bash
brew install libomp
```

### 2. Backend Setup
Navigate to the root directory and install Node.js dependencies:
```bash
npm install
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

### 4. Machine Learning Setup
Create a virtual environment and install Python dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the Application

### Start the Backend
From the root directory:
```bash
node backend/backend.js
```

### Start the Frontend
From the `frontend` directory:
```bash
npm run dev
```

## Project Structure

- `backend/`: Express server, database logic, and API routes.
- `frontend/`: Vite-based frontend application.
- `requirements.txt`: Python package dependencies.
- `predict.py`: Python script for ML model predictions.
