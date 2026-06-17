# 🌍 EcoMind - Carbon Footprint Awareness Platform

An interactive, visually stunning, and highly optimized web platform localized for Indian citizens. It features advanced micro-animations, real-time CO₂ data streaming simulations, custom SVG data visualizations, gamified habit tracking, and expert sustainability coaching powered by **Google Gemini AI**.

[![Tech-Stack](https://img.shields.io/badge/Stack-Fullstack--Hybrid-mediumblue?style=for-the-badge)](#)
[![Python-Flask](https://img.shields.io/badge/Backend-Flask--Python-brightgreen?style=for-the-badge)](#)
[![Docker](https://img.shields.io/badge/Container-Docker-blue?style=for-the-badge)](#)
[![Gemini](https://img.shields.io/badge/AI-Google--Gemini--3.5-orange?style=for-the-badge)](#)

---

## 🌟 Features

- **Earth Pulse Live Header**: Displays an animated rotating Earth SVG alongside a real-time atmospheric CO₂ counter ticking up from 421 ppm, reinforcing global ecological context.
- **Smart 4-Step Wizard**: An elegant step-by-step calculator encompassing Transport, Home Energy (including standard Indian LPG Cylinders and Solar grid offsets), Diet Sliders, and consumer Shopping Habits.
- **Real-Time Circular SVG Score Gauge**: Dynamically updates and transitions color as the user fills in parameters (Green ➔ Yellow ➔ Orange ➔ Red). Incorporates a **Carbon Annual Age** days consumed logic.
- **Eco Habit Tracker (localStorage)**: Gamifies action items like avoiding plastic, short showers, eating vegetarian, and commuting via metro/walking. Features a daily fire streak indicator and unlocks incremental achievement badges (Seedling, Sapling, Tree, Forest).
- **Gemini AI Insights Coach**: Automatically analyses the user's localized footprint to deliver structured tips, a personalized Weekly Challenge, motivational triggers, and custom fun facts.
- **Comparison Dashboard**: Visualizes your monthly footprint against localized baseline benchmarks (Avg Indian: 150 kg, Paris Accord Limit: 83 kg, Global Citizen: 400 kg) using custom horizontal CSS chart grids and SVG category distribution donuts.
- **Share Eco-Scorecard**: Instantly renders visual carbon credential certificates with one-click Twitter/X feed sharing triggers and clipboard copy commands.

---

## 🛠️ Tech Stack

- **Backend**: Python + Flask / TypeScript Node + Express (Full double-stack support)
- **AI Integration**: Google Gemini AI (`gemini-3.5-flash` via `@google/genai` or python `google-generativeai`)
- **Frontend**: Pure HTML, Tailwind CSS Utility Layouts, Vanilla JavaScript/TypeScript
- **Deployment & Cloud**: Docker container systems, Google Cloud Run

---

## 🚀 Setup Instructions

### Local Development (Python + Flask)

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd carbon-footprint-platform
   ```

2. **Prepare environment configs**:
   Copy `.env.example` configurations to `.env` file:
   ```bash
   cp .env.example .env
   ```
   Add your verified `GEMINI_API_KEY` obtained from [Google AI Studio](https://aistudio.google.com).

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch Server**:
   ```bash
   python app.py
   ```
   The application is available at `http://localhost:8080`.

---

### Docker System Run

1. **Build Container**:
   ```bash
   docker build -t carbon-app .
   ```

2. **Run Container**:
   ```bash
   docker run -d -p 8080:8080 --env-file .env carbon-app
   ```

---

### Google Cloud Run Deployment

Deploy your container directly onto serverless Cloud Run grids in seconds:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/carbon-app
gcloud run deploy carbon-app \
  --image gcr.io/PROJECT_ID/carbon-app \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

---

## 📊 India-Specific Emission Factors

We utilize official regional grid averages and customized fuel counts to anchor Indian consumer footprint calculations:

| Emission Source | Factor Value | Metrics Unit |
| :--- | :--- | :--- |
| **Car (Petrol)** | `0.21` | kg CO₂ / km |
| **Car (Diesel)** | `0.17` | kg CO₂ / km |
| **City bus** | `0.089` | kg CO₂ / km |
| **Metro / local trains** | `0.041` | kg CO₂ / km |
| **Auto-Rickshaw** | `0.11` | kg CO₂ / km |
| **Domestic Flights** | `0.255` | kg CO₂ / km |
| **Grid Electricity** | `0.82` | kg CO₂ / kWh |
| **Home LPG Cylinder** | `39.6` | kg CO₂ / 14.2 kg cylinder |
| **Solar Grid Offset** | `-15.0` | kg CO₂ offset / month |
| **Recycling Offset** | `-10.0` | kg CO₂ offset / month |

---

## 🔌 Core API Endpoints

Our underlying JSON API conforms to production parameters with strict error handlers:

| Route | Method | Payload Scheme | Response Summary |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | *None* | returns service health status details |
| `/calculate` | `POST` | Questionnaire answers (km, kWh, cylinders) | Complete formatted category footprint data breaks |
| `/ai-insights` | `POST` | Calculation outputs & carbon summary | Double-quoted JSON structured coach feedback from Gemini |
| `/log-action` | `POST` | Action Identifier key | Real-time session habits logged, streak and badge updates |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
🌱 Designed with utmost dedication to localized climate action!
