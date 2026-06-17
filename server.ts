import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Strict HTTP Security Headers Middleware (Security Improvement)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Lightweight IP Rate Limiter to prevent endpoint abuse (Security Improvement)
interface RateLimit {
  count: number;
  resetTime: number;
}
const apiRateLimits = new Map<string, RateLimit>();

const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "anonymous";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxLimit = 120; // 120 requests maximum per window
  
  let userLimit = apiRateLimits.get(ip);
  if (!userLimit || now > userLimit.resetTime) {
    userLimit = { count: 0, resetTime: now + windowMs };
  }
  
  userLimit.count++;
  apiRateLimits.set(ip, userLimit);
  
  if (userLimit.count > maxLimit) {
    return res.status(429).json({
      success: false,
      error: "Too many requests from this IP. Please slow down and try again later."
    });
  }
  next();
};

app.use("/api", apiRateLimiter);

// In-memory sessions store for habit tracking (keyed by a simple guestId or session ID)
interface HabitSession {
  streak: number;
  lastActiveDate: string | null;
  totalSaved: number;
  completedActions: Record<string, boolean>; // e.g., { "walk": true }
}
const sessionsStore: Record<string, HabitSession> = {};

// Helper to get or create session
function getOrCreateSession(guestId: string): HabitSession {
  if (!sessionsStore[guestId]) {
    sessionsStore[guestId] = {
      streak: 0,
      lastActiveDate: null,
      totalSaved: 0,
      completedActions: {}
    };
  }
  return sessionsStore[guestId];
}

// --------------------------------------------------------
// India-specific emission factors defined by the prompt:
// --------------------------------------------------------
const EMISSION_FACTORS = {
  car_petrol: 0.21,   // kg CO2/km
  car_diesel: 0.17,   // kg CO2/km
  bus: 0.089,         // kg CO2/km
  metro: 0.041,       // kg CO2/km
  auto: 0.11,         // kg CO2/km
  flight: 0.255,      // kg CO2/km, assuming avg 1000 km per domestic trip
  electricity: 0.82,  // kg CO2/kWh
  lpg: 39.6,          // kg CO2 per cylinder (14.2 kg)
  solar_offset: -15,   // kg CO2/month offset
  diet_vegan: 50,     // kg CO2/month
  diet_vegetarian: 80,
  diet_omnivore: 130,
  diet_heavy_meat: 200,
  fashion_high: 80,   // kg/month
  fashion_medium: 40,
  fashion_low: 15,
  electronics_yes: 30, // kg/month
  recycling_offset: -10 // kg/month
};

// 1. HEALTH ENDPOINT
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "carbon-footprint-platform",
    timestamp: new Date().toISOString()
  });
});

// 2. CALCULATE ENDPOINT - compute carbon breakdown from user questionnaire
app.post("/api/calculate", (req, res) => {
  try {
    let {
      car_km = 0,
      car_type = "petrol",
      bus_km = 0,
      metro_km = 0,
      auto_km = 0,
      flights_year = 0,
      electricity_kwh = 0,
      lpg_cylinders = 0,
      solar_panels = "no",
      diet_type = "vegetarian",
      fast_fashion = "medium",
      electronics_bought = "no",
      recycling = "no"
    } = req.body;

    // Strict Input Validation & Range Sanitization (Security improvement)
    car_km = Math.max(0, Math.min(100000, Number(car_km) || 0));
    bus_km = Math.max(0, Math.min(100000, Number(bus_km) || 0));
    metro_km = Math.max(0, Math.min(100000, Number(metro_km) || 0));
    auto_km = Math.max(0, Math.min(100000, Number(auto_km) || 0));
    flights_year = Math.max(0, Math.min(1000, Number(flights_year) || 0));
    electricity_kwh = Math.max(0, Math.min(100000, Number(electricity_kwh) || 0));
    lpg_cylinders = Math.max(0, Math.min(1000, Number(lpg_cylinders) || 0));

    if (typeof car_type !== "string" || !["petrol", "diesel"].includes(car_type)) {
      car_type = "petrol";
    }
    if (typeof solar_panels !== "string" || !["yes", "no"].includes(solar_panels)) {
      solar_panels = "no";
    }
    if (typeof diet_type !== "string" || !["vegan", "vegetarian", "omnivore", "heavy_meat"].includes(diet_type)) {
      diet_type = "vegetarian";
    }
    if (typeof fast_fashion !== "string" || !["high", "medium", "low"].includes(fast_fashion)) {
      fast_fashion = "medium";
    }
    if (typeof electronics_bought !== "string" || !["yes", "no"].includes(electronics_bought)) {
      electronics_bought = "no";
    }
    if (typeof recycling !== "string" || !["yes", "no"].includes(recycling)) {
      recycling = "no";
    }

    // Standard weekly to monthly multiplier: 4.33
    const carFactor = car_type === "diesel" ? EMISSION_FACTORS.car_diesel : EMISSION_FACTORS.car_petrol;
    const carCO2 = car_km * carFactor * 4.33;
    const busCO2 = bus_km * EMISSION_FACTORS.bus * 4.33;
    const metroCO2 = metro_km * EMISSION_FACTORS.metro * 4.33;
    const autoCO2 = auto_km * EMISSION_FACTORS.auto * 4.33;
    // Assume average domestic flight in India is 1000km
    const flightCO2 = (flights_year * 1000 * EMISSION_FACTORS.flight) / 12;

    const transportTotal = carCO2 + busCO2 + metroCO2 + autoCO2 + flightCO2;

    const electricityCO2 = electricity_kwh * EMISSION_FACTORS.electricity;
    const lpgCO2 = lpg_cylinders * EMISSION_FACTORS.lpg;
    const solarOffset = solar_panels === "yes" ? EMISSION_FACTORS.solar_offset : 0;

    const energyTotal = Math.max(0, electricityCO2 + lpgCO2 + solarOffset);

    let dietCO2 = EMISSION_FACTORS.diet_vegetarian;
    if (diet_type === "vegan") dietCO2 = EMISSION_FACTORS.diet_vegan;
    else if (diet_type === "omnivore") dietCO2 = EMISSION_FACTORS.diet_omnivore;
    else if (diet_type === "heavy_meat") dietCO2 = EMISSION_FACTORS.diet_heavy_meat;

    let fashionCO2 = EMISSION_FACTORS.fashion_medium;
    if (fast_fashion === "high") fashionCO2 = EMISSION_FACTORS.fashion_high;
    else if (fast_fashion === "low") fashionCO2 = EMISSION_FACTORS.fashion_low;

    const electronicsCO2 = electronics_bought === "yes" ? EMISSION_FACTORS.electronics_yes : 0;
    const recyclingOffset = recycling === "yes" ? EMISSION_FACTORS.recycling_offset : 0;

    const lifestyleTotal = Math.max(0, fashionCO2 + electronicsCO2 + recyclingOffset);

    const totalFootprint = transportTotal + energyTotal + dietCO2 + lifestyleTotal;

    // Paris Agreement Target (83 kg/month), Average Indian (150 kg/month), Global Avg (400 kg/month)
    // "Earths needed" calculation
    const earthsNeeded = Math.max(0.1, Number((totalFootprint / 150).toFixed(2)));

    // Carbon Age / Earth days used up
    // formula: footprint/global avg (400) * 365
    const earthDaysUsed = Math.round((totalFootprint / 400) * 365);

    res.json({
      success: true,
      breakdown: {
        transport: Number(transportTotal.toFixed(2)),
        energy: Number(energyTotal.toFixed(2)),
        diet: Number(dietCO2.toFixed(2)),
        lifestyle: Number(lifestyleTotal.toFixed(2))
      },
      total: Number(totalFootprint.toFixed(2)),
      earthsNeeded,
      earthDaysUsed,
      comparisons: {
        parisTarget: 83,
        averageIndian: 150,
        globalAverage: 400
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || "Invalid input parameters." });
  }
});

// 3. AI INSIGHTS ENDPOINT - using Google Gemini AI
app.post("/api/ai-insights", async (req, res) => {
  try {
    let { total, breakdown, inputs } = req.body;

    if (total === undefined || total === null) {
      return res.status(400).json({ success: false, error: "Missing footprint calculation dataset." });
    }

    // Strict Input Validation & Range Sanitization (Security improvement)
    const sanitizedTotal = Math.max(0, Math.min(1000000, Number(total) || 150));
    
    const sanitizedBreakdown = {
      transport: Math.max(0, Math.min(1000000, Number(breakdown?.transport) || 0)),
      energy: Math.max(0, Math.min(1000000, Number(breakdown?.energy) || 0)),
      diet: Math.max(0, Math.min(1000000, Number(breakdown?.diet) || 0)),
      lifestyle: Math.max(0, Math.min(1000000, Number(breakdown?.lifestyle) || 0))
    };

    const sanitizedInputs = {
      car_km: Math.max(0, Math.min(100000, Number(inputs?.car_km) || 0)),
      car_type: String(inputs?.car_type || "petrol").replace(/[^a-z]/gi, ""),
      bus_km: Math.max(0, Math.min(100000, Number(inputs?.bus_km) || 0)),
      metro_km: Math.max(0, Math.min(100000, Number(inputs?.metro_km) || 0)),
      auto_km: Math.max(0, Math.min(100000, Number(inputs?.auto_km) || 0)),
      flights_year: Math.max(0, Math.min(1000, Number(inputs?.flights_year) || 0)),
      electricity_kwh: Math.max(0, Math.min(100000, Number(inputs?.electricity_kwh) || 0)),
      lpg_cylinders: Math.max(0, Math.min(1000, Number(inputs?.lpg_cylinders) || 0)),
      solar_panels: String(inputs?.solar_panels || "no").replace(/[^a-z]/gi, ""),
      diet_type: String(inputs?.diet_type || "vegetarian").replace(/[^a-z_]/gi, ""),
      fast_fashion: String(inputs?.fast_fashion || "medium").replace(/[^a-z_]/gi, ""),
      electronics_bought: String(inputs?.electronics_bought || "no").replace(/[^a-z]/gi, ""),
      recycling: String(inputs?.recycling || "no").replace(/[^a-z]/gi, "")
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined. Using high-fidelity fallbacks.");
      return res.json({
        success: true,
        source: "fallback",
        insights: getFallbackInsights(sanitizedTotal, sanitizedBreakdown)
      });
    }

    // Initialize modern @google/genai as required by gemini-api skill
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const userFactSummary = `
      User calculated footprint: ${sanitizedTotal} kg CO2e/month.
      Breakdown:
      - Transport: ${sanitizedBreakdown.transport} kg CO2e/month
      - Home Energy: ${sanitizedBreakdown.energy} kg CO2e/month
      - Diet: ${sanitizedBreakdown.diet} kg CO2e/month
      - Shopping/Habits: ${sanitizedBreakdown.lifestyle} kg CO2e/month

      Detailed inputs:
      - Car distance: ${sanitizedInputs.car_km} km/week (${sanitizedInputs.car_type})
      - Bus commuting: ${sanitizedInputs.bus_km} km/week
      - Metro/Train commuting: ${sanitizedInputs.metro_km} km/week
      - Auto commuting: ${sanitizedInputs.auto_km} km/week
      - Annual domestic flights count: ${sanitizedInputs.flights_year}
      - Energy grid power: ${sanitizedInputs.electricity_kwh} kWh
      - Home LPG consumption: ${sanitizedInputs.lpg_cylinders} cylinders/month
      - Solar offsets applied: ${sanitizedInputs.solar_panels}
      - Diet approach: ${sanitizedInputs.diet_type}
      - Fast fashion shopping: ${sanitizedInputs.fast_fashion}
      - Electronics purchase frequency: ${sanitizedInputs.electronics_bought}
      - Recycling commitment: ${sanitizedInputs.recycling}
    `;

    const systemInstruction = `You are EcoMind, an expert sustainability coach for Indian citizens. 
Analyze the user's carbon footprint data and respond ONLY in this exact JSON format with no extra text:
{
  "score": <0-100 green score where 100 means lowest emission and 0 means highest emission relative to global goals>,
  "grade": "<A+/A/B/C/D>",
  "tips": [
    {"icon": "<emoji>", "title": "<short title>", "action": "<specific action suitable for Indian lifestyle>", "impact": "<CO2 saved per month in kg as string integer>"}
  ],
  "motivation": "<one powerful green action motivational sentence>",
  "comparison": "<compare user's total with average Indian 150kg/month and global 400kg/month concisely>",
  "weekly_challenge": "<one practical, impactful sustainability challenge for this week>",
  "fun_fact": "<surprising climate or environmental fact related to their biggest emission source in India>"
}
Make sure all tips lists contain exactly 5 tips. Ground tips in active Indian solutions (e.g. CNG, solar grid connection, electric auto commutes, traditional zero-waste household recycling, local seasonal foods). Keys and strings must use valid double quotes.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userFactSummary,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            grade: { type: Type.STRING },
            tips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  icon: { type: Type.STRING },
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ["icon", "title", "action", "impact"]
              }
            },
            motivation: { type: Type.STRING },
            comparison: { type: Type.STRING },
            weekly_challenge: { type: Type.STRING },
            fun_fact: { type: Type.STRING }
          },
          required: ["score", "grade", "tips", "motivation", "comparison", "weekly_challenge", "fun_fact"]
        }
      }
    });

    const textResult = response.text || "{}";
    const insightsData = JSON.parse(textResult.trim());

    res.json({
      success: true,
      source: "gemini",
      insights: insightsData
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Silent failover to top-notch presets as mandated by the instructions
    const userTotal = req.body.total || 150;
    const userBreakdown = req.body.breakdown || {};
    res.json({
      success: true,
      source: "fallback-error",
      insights: getFallbackInsights(userTotal, userBreakdown)
    });
  }
});

// Dynamic Local-Fallback Insight generator aligned perfectly to instructions
function getFallbackInsights(total: number, breakdown: any) {
  let score = 90;
  let grade = "A";

  if (total > 350) {
    score = 25;
    grade = "D";
  } else if (total > 200) {
    score = 55;
    grade = "C";
  } else if (total > 100) {
    score = 75;
    grade = "B";
  }

  // Pre-configured tips matches Prompt
  const fallbackTips = [
    { icon: "🚶", title: "Walk or Bicycle", action: "Opt for walking, bicycling, or using localized cycle rickshaws for all travel distances under 3km.", impact: "15" },
    { icon: "🥗", title: "Eat Local & Seasonal", action: "Decrease heavy dairy or meat consumption, preferring traditional seasonal crops, lentils, and local organic veggies.", impact: "25" },
    { icon: "💡", title: "Smart Air Conditioning", action: "Maintain household cooling systems at a stable 24-26°C, swapping to efficient inverter tech.", impact: "18" },
    { icon: "🚌", title: "Ride Metro/Trains", action: "Ditch local app cabs or single-passenger cars in favor of public transport grids during heavy office commute hours.", impact: "45" },
    { icon: "🌱", title: "Rooftop Solar Connect", action: "Integrate standard passive solar water heating or grid solar modules to bypass electricity emission loads.", impact: "15" }
  ];

  return {
    score,
    grade,
    tips: fallbackTips,
    motivation: "Small variations in daily routines add up and forge a resilient, green sustainable future for our planet.",
    comparison: `Your emission of ${total} kg/month compares to the typical Indian active baseline of 150 kg/month and the global threshold of 400 kg/month.`,
    weekly_challenge: "Avoid buying items wrapped in single-use plastic, opting for your own canvas/tote bag for grocery visits.",
    fun_fact: "Energy sector activities form over 70% of India's aggregate greenhouse gases, which means efficient home power makes the absolute highest real-world dent!"
  };
}

// 4. LOG ACTION ENDPOINT - tracks green achievements and updates streaks
app.post("/api/log-action", (req, res) => {
  try {
    let { actionId, guestId } = req.body;
    if (!actionId || !guestId || typeof actionId !== "string" || typeof guestId !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid action ID or guest identifier." });
    }

    // Sanitize guestId to prevent arbitrary key attacks/NoSQL injects in memory maps
    guestId = guestId.replace(/[^a-zA-Z0-9_\-\.]/g, "");
    if (!guestId) {
      return res.status(400).json({ success: false, error: "Invalid guest identifier format." });
    }

    const session = getOrCreateSession(guestId);
    
    // Preset actions with CO2 impact values
    const PRESET_ACTIONS: Record<string, { label: string; offset: number }> = {
      walk: { label: "Walked instead of drove", offset: 2.1 },
      veg: { label: "Ate vegetarian today", offset: 0.8 },
      recycle: { label: "Recycled waste", offset: 0.3 },
      lights: { label: "Turned off unused lights", offset: 0.1 },
      shower: { label: "Took a short shower", offset: 0.5 },
      plastic: { label: "Avoided single-use plastic", offset: 0.2 },
      plant: { label: "Planted something", offset: 5.0 }, // lifetime
      transit: { label: "Used public transport", offset: 1.5 },
      wfh: { label: "Worked from home", offset: 0.9 },
      reusable: { label: "Used reusable container", offset: 0.2 }
    };

    const action = PRESET_ACTIONS[actionId];
    if (!action) {
      return res.status(404).json({ success: false, error: "Target action preset not found." });
    }

    // In-memory calculations to protect streaks across single-session visits
    // Streak logic simple day difference tracker
    const todayStr = new Date().toISOString().split("T")[0];
    
    if (session.lastActiveDate === todayStr) {
      // Already logged today, can log other actions or repeat to accumulate total saved
      session.totalSaved += action.offset;
    } else {
      // Check if logged yesterday to advance streak
      if (session.lastActiveDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        if (session.lastActiveDate === yesterdayStr) {
          session.streak += 1;
        } else {
          session.streak = 1; // resetting streak
        }
      } else {
        session.streak = 1; // first activity
      }
      session.lastActiveDate = todayStr;
      session.totalSaved += action.offset;
    }

    session.completedActions[actionId] = true;

    // Check badges requirements
    const badges = [];
    if (session.streak >= 3) badges.push("Seedling");
    if (session.streak >= 7) badges.push("Sapling");
    if (session.streak >= 30) badges.push("Tree");
    if (session.streak >= 90) badges.push("Forest");

    res.json({
      success: true,
      actionLogged: action.label,
      streak: session.streak,
      totalSaved: Number(session.totalSaved.toFixed(2)),
      badges,
      completedActions: session.completedActions
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to log action." });
  }
});

// Initialize Express-Vite Fullstack Integration as defined in setup guidelines
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode setup with Vite
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static files deployment
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[EcoMind Server] Live on port ${PORT}`);
  });
}

startServer();
