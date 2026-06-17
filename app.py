import os
import json
import random
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv

# Load secret environment configs
load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "ecomind_secure_session_token_key")
CORS(app)

# --------------------------------------------------------
# India-Specific Carbon Emission Factors (kg CO2)
# --------------------------------------------------------
EMISSION_FACTORS = {
    "car_petrol": 0.21,      # kg CO2/km
    "car_diesel": 0.17,      # kg CO2/km  
    "bus": 0.089,            # kg CO2/km
    "metro": 0.041,          # kg CO2/km
    "auto": 0.11,            # kg CO2/km
    "flight_domestic": 0.255, # kg CO2/km (assuming 1000 km per domestic segment)
    "electricity": 0.82,     # kg CO2/kWh
    "lpg": 39.6,             # kg CO2 per cylinder (14.2 kg size)
    "solar_offset": -15.0,    # offset value per month
    "diet_vegan": 50.0,      # kg/month
    "diet_vegetarian": 80.0, # kg/month
    "diet_omnivore": 130.0,  # kg/month
    "diet_heavy_meat": 200.0,# kg/month
    "fashion_high": 80.0,    # kg/month
    "fashion_medium": 40.0,  # kg/month
    "fashion_low": 15.0,     # kg/month
    "electronics_yes": 30.0, # kg/month
    "recycling_offset": -10.0 # offset value per month
}

PRESET_ACTIONS = {
    "walk": {"label": "Walked instead of drove", "offset": 2.1},
    "veg": {"label": "Ate vegetarian today", "offset": 0.8},
    "recycle": {"label": "Recycled waste", "offset": 0.3},
    "lights": {"label": "Turned off unused lights", "offset": 0.1},
    "shower": {"label": "Took a short shower", "offset": 0.5},
    "plastic": {"label": "Avoided single-use plastic", "offset": 0.2},
    "plant": {"label": "Planted something", "offset": 5.0}, # lifetime savings
    "transit": {"label": "Used public transport", "offset": 1.5},
    "wfh": {"label": "Worked from home", "offset": 0.9},
    "reusable": {"label": "Used reusable container", "offset": 0.2}
}

# Try importing google-generativeai safely for robust production resilience
GEMINI_AVAILABLE = False
try:
    import google.generativeai as genai
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        genai.configure(api_key=gemini_key)
        GEMINI_AVAILABLE = True
except ImportError:
    pass


# GET / -> Serve index.html template or root
@app.route("/")
def home():
    try:
        return render_template("index.html")
    except Exception:
        # Fallback raw index string or localized info
        return jsonify({
            "message": "Welcome to EcoMind Carbon Footprint Platform API. Please serve the index.html from static resources or build templates."
        })


# GET /health -> Return platform sanity status check
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "carbon-footprint-platform",
        "python_runtime": "3.11+"
    })


# POST /calculate -> compute CO2 from form data and return detailed metrics breaks
@app.route("/calculate", methods=["POST"])
@app.route("/api/calculate", methods=["POST"])
def calculate():
    try:
        data = request.get_json() or {}
        
        # S01: Transport Calculation
        car_km = float(data.get("car_km", 0))
        car_type = data.get("car_type", "petrol")
        car_factor = EMISSION_FACTORS["car_diesel"] if car_type == "diesel" else EMISSION_FACTORS["car_petrol"]
        
        car_co2 = car_km * car_factor * 4.33
        bus_co2 = float(data.get("bus_km", 0)) * EMISSION_FACTORS["bus"] * 4.33
        metro_co2 = float(data.get("metro_km", 0)) * EMISSION_FACTORS["metro"] * 4.33
        auto_co2 = float(data.get("auto_km", 0)) * EMISSION_FACTORS["auto"] * 4.33
        
        # Flight CO2 (Assumes 1000 km per domestic segment in India)
        flights_qty = float(data.get("flights_year", 0))
        flight_co2 = (flights_qty * 1000.0 * EMISSION_FACTORS["flight_domestic"]) / 12.0
        
        transport_total = car_co2 + bus_co2 + metro_co2 + auto_co2 + flight_co2

        # S02: Home Energy
        electricity_bill = float(data.get("electricity_kwh", 0))
        electricity_co2 = electricity_bill * EMISSION_FACTORS["electricity"]
        
        lpg_units = float(data.get("lpg_cylinders", 0))
        lpg_co2 = lpg_units * EMISSION_FACTORS["lpg"]
        
        solar_panels = data.get("solar_panels", "no")
        solar_offset = EMISSION_FACTORS["solar_offset"] if solar_panels == "yes" else 0.0
        
        energy_total = max(0.0, electricity_co2 + lpg_co2 + solar_offset)

        # S03: Diet & Nutrition Slider
        diet_variety = data.get("diet_type", "vegetarian")
        if diet_variety == "vegan":
            diet_co2 = EMISSION_FACTORS["diet_vegan"]
        elif diet_variety == "omnivore":
            diet_co2 = EMISSION_FACTORS["diet_omnivore"]
        elif diet_variety == "heavy_meat":
            diet_co2 = EMISSION_FACTORS["diet_heavy_meat"]
        else:
            diet_co2 = EMISSION_FACTORS["diet_vegetarian"]

        # S04: Lifestyle Shopping Offsets
        fast_fashion = data.get("fast_fashion", "medium")
        if fast_fashion == "high":
            fashion_co2 = EMISSION_FACTORS["fashion_high"]
        elif fast_fashion == "low":
            fashion_co2 = EMISSION_FACTORS["fashion_low"]
        else:
            fashion_co2 = EMISSION_FACTORS["fashion_medium"]
            
        electronics = data.get("electronics_bought", "no")
        electronics_co2 = EMISSION_FACTORS["electronics_yes"] if electronics == "yes" else 0.0
        
        recycling_habit = data.get("recycling", "no")
        recycle_offset = EMISSION_FACTORS["recycling_offset"] if recycling_habit == "yes" else 0.0
        
        lifestyle_total = max(0.0, fashion_co2 + electronics_co2 + recycle_offset)

        # Overall Sum
        grand_total = transport_total + energy_total + diet_co2 + lifestyle_total
        
        # Footprint global ratios comparisons
        earths_ratio = max(0.1, round((grand_total / 150.0), 2))
        earth_allotment_days = int((grand_total / 400.0) * 365)

        return jsonify({
            "success": True,
            "breakdown": {
                "transport": round(transport_total, 2),
                "energy": round(energy_total, 2),
                "diet": round(diet_co2, 2),
                "lifestyle": round(lifestyle_total, 2)
            },
            "total": round(grand_total, 2),
            "earthsNeeded": earths_ratio,
            "earthDaysUsed": earth_allotment_days,
            "comparisons": {
                "parisTarget": 83,
                "averageIndian": 150,
                "globalAverage": 400
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# POST /ai-insights -> query Google Gemini API safely with JSON fallback
@app.route("/ai-insights", methods=["POST"])
@app.route("/api/ai-insights", methods=["POST"])
def ai_insights():
    try:
        payload = request.get_json() or {}
        user_total = payload.get("total", 150.0)
        breakdown = payload.get("breakdown", {})
        inputs = payload.get("inputs", {})

        if not GEMINI_AVAILABLE:
            raise ValueError("Google Generative AI service is uninitialized or key is absent.")

        # Prepare precise sustainability instruction system prompt matching guidelines
        system_instruction = (
            "You are EcoMind, an expert sustainability coach for Indian citizens. "
            "Analyze the user's carbon footprint data and respond ONLY in this exact JSON format with no extra text:\n"
            "{\n"
            '  "score": <0-100 green score where 100 is best and 0 is worst>,\n'
            '  "grade": "<A+/A/B/C/D>",\n'
            '  "tips": [\n'
            '    {"icon": "<emoji>", "title": "<short title>", "action": "<specific action suitable for India>", "impact": "<CO2 saved per month in kg as string integer>"}\n'
            "  ],\n"
            '  "motivation": "<one powerful sentence>",\n'
            '  "comparison": "<compare user to typical Indian 150kg/month and global 400kg/month concisely>",\n'
            '  "weekly_challenge": "<one specific personal challenge for this week>",\n'
            '  "fun_fact": "<surprising climate fact related to their biggest emission source in India>"\n'
            "}"
        )

        user_prompt = f"""
        Analyze this footprint data context:
        - Monthly Footprint: {user_total} kg CO2e
        - Transport Details: {breakdown.get('transport', 0)} kg CO2e (Car: {inputs.get('car_km', 0)} km, Type: {inputs.get('car_type', 'petrol')})
        - Household Power: {breakdown.get('energy', 0)} kg CO2e (Electric: {inputs.get('electricity_kwh', 0)} kWh)
        - Diet Habits: {breakdown.get('diet', 80)} kg CO2e (Type: {inputs.get('diet_type', 'vegetarian')})
        - Habits Offset: {breakdown.get('lifestyle', 15)} kg CO2e (Recycling choice: {inputs.get('recycling', 'no')})
        """

        # Using correct Python SDK calling structure
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction
        )
        response = model.generate_content(
            user_prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        parsed_json = json.loads(response.text.strip())
        return jsonify({
            "success": True,
            "source": "gemini",
            "insights": parsed_json
        })

    except Exception as err:
        # Fallback to pristine mock tips representation as requested
        print(f"[Python App Failover] {err}")
        return jsonify({
            "success": True,
            "source": "fallback",
            "insights": {
                "score": 85 if user_total < 120 else 55,
                "grade": "A" if user_total < 120 else "C",
                "tips": [
                    {"icon": "🚶", "title": "Bicycle Trips", "action": "Pedal or walk for office runs below 4km.", "impact": "20"},
                    {"icon": "🥗", "title": "Plant Foods", "action": "Prefer organic millets, pulses, and greens directly.", "impact": "30"},
                    {"icon": "💡", "title": "Energy Star", "action": "Leverage standard 5-star inverter home appliances.", "impact": "15"},
                    {"icon": "🚇", "title": "Namma Metro", "action": "Swap ride-hailing cabs for electric city trains.", "impact": "55"},
                    {"icon": "🌱", "title": "Recycle Plastic", "action": "Separate cardboard and PET bottles for dry recyclers.", "impact": "10"}
                ],
                "motivation": "Small shifts in consumer habits forge a giant climate preservation legacy.",
                "comparison": f"Your monthly footprint matches {user_total} kg. Relative to typical Indian (150 kg) limit.",
                "weekly_challenge": "Do not purchase packaged processed food crops this week.",
                "fun_fact": "Traditional Indian home recycling is naturally high, saving upwards of 12 kg CO2 monthly!"
            }
        })


# POST /log-action -> save eco-habit to session map and return adjusted streak counts
@app.route("/log-action", methods=["POST"])
@app.route("/api/log-action", methods=["POST"])
def log_action():
    try:
        payload = request.get_json() or {}
        action_id = payload.get("actionId")

        if not action_id or action_id not in PRESET_ACTIONS:
            return jsonify({"success": False, "error": "Invalid action tag submitted."}), 400

        # Retrieve session-specific details
        if "streak" not in session:
            session["streak"] = 0
        if "total_saved" not in session:
            session["total_saved"] = 0.0
        if "completed" not in session:
            session["completed"] = {}

        action = PRESET_ACTIONS[action_id]
        
        # Simple dynamic checking logic
        if action_id not in session["completed"]:
            session["completed"][action_id] = True
            session["total_saved"] += action["offset"]
            session["streak"] += 1

        # Badge awards
        badges_list = []
        streak = session["streak"]
        if streak >= 3: badges_list.append("Seedling")
        if streak >= 7: badges_list.append("Sapling")
        if streak >= 30: badges_list.append("Tree")
        if streak >= 90: badges_list.append("Forest")

        return jsonify({
            "success": True,
            "actionLogged": action["label"],
            "streak": session["streak"],
            "totalSaved": round(session["total_saved"], 2),
            "badges": badges_list,
            "completedActions": session["completed"]
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    # Host on standard 0.0.0.0, binding to PORT environment configuration or 8080 default
    host_ip = "0.0.0.0"
    target_port = int(os.environ.get("PORT", 8080))
    app.run(host=host_ip, port=target_port, debug=False)
