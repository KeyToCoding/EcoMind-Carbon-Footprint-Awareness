// EcoMind Vanilla TS Frontend Entrypoint
import "./index.css";

function initializeApp() {
  // Generate random guest identification token to maintain session persistence
  let guestId = localStorage.getItem("ecomind_guest_id");
  if (!guestId) {
    guestId = "guest_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("ecomind_guest_id", guestId);
  }

  // --------------------------------------------------------
  // CONSTANTS & SELECTIONS
  // --------------------------------------------------------
  const PRESET_ACTIONS = [
    { id: "walk", emoji: "🚶", label: "Walked / cycled instead of driving", offset: 2.1 },
    { id: "veg", emoji: "🥗", label: "Ate fully plant-based / vegetarian", offset: 0.8 },
    { id: "recycle", emoji: "♻️", label: "Recycled household dry waste", offset: 0.3 },
    { id: "lights", emoji: "💡", label: "Turned off all unused lights", offset: 0.1 },
    { id: "shower", emoji: "🚿", label: "Took a quick water-saving shower", offset: 0.5 },
    { id: "plastic", emoji: "🛍️", label: "Displaced single-use plastics", offset: 0.2 },
    { id: "plant", emoji: "🌱", label: "Planted sapling / household plants", offset: 5.0 },
    { id: "transit", emoji: "🚌", label: "Commuted via city public transit", offset: 1.5 },
    { id: "wfh", emoji: "💻", label: "Worked from home / minimized travel", offset: 0.9 },
    { id: "reusable", emoji: "🥡", label: "Supported reusable meal containers", offset: 0.2 }
  ];

  // --------------------------------------------------------
  // LOCAL STORAGE & CALCULATIONS FALLBACK STORAGE ENGINE
  // --------------------------------------------------------
  const getLocalHabitState = () => {
    try {
      const saved = localStorage.getItem("ecomind_habit_state_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      streak: 0,
      lastActiveDate: null as string | null,
      totalSaved: 0,
      completedActions: {} as Record<string, boolean>
    };
  };

  const saveLocalHabitState = (state: any) => {
    try {
      localStorage.setItem("ecomind_habit_state_v1", JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  };

  function localLogEcoAction(actionId: string) {
    const state = getLocalHabitState();
    const action = PRESET_ACTIONS.find((act) => act.id === actionId);
    if (!action) return state;

    if (!state.completedActions[actionId]) {
      state.completedActions[actionId] = true;
      state.totalSaved = Number((state.totalSaved + action.offset).toFixed(1));

      const todayString = new Date().toISOString().split("T")[0];
      const lastActive = state.lastActiveDate;

      if (!lastActive) {
        state.streak = 1;
      } else {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(todayString);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          state.streak += 1;
        } else if (diffDays > 1) {
          state.streak = 1;
        }
      }
      state.lastActiveDate = todayString;
      saveLocalHabitState(state);
    }
    return state;
  }

  function localCalculate(formObj: any) {
    const EMISSION_FACTORS = {
      car_petrol: 0.21,
      car_diesel: 0.17,
      bus: 0.089,
      metro: 0.041,
      auto: 0.11,
      flight: 0.255,
      electricity: 0.82,
      lpg: 39.6,
      solar_offset: -15,
      diet_vegan: 50,
      diet_vegetarian: 80,
      diet_omnivore: 130,
      diet_heavy_meat: 200,
      fashion_high: 80,
      fashion_medium: 40,
      fashion_low: 15,
      electronics_yes: 30,
      recycling_offset: -10
    };

    const car_km = Number(formObj.car_km) || 0;
    const car_type = formObj.car_type || "petrol";
    const bus_km = Number(formObj.bus_km) || 0;
    const metro_km = Number(formObj.metro_km) || 0;
    const auto_km = Number(formObj.auto_km) || 0;
    const flights_year = Number(formObj.flights_year) || 0;
    const electricity_kwh = Number(formObj.electricity_kwh) || 0;
    const lpg_cylinders = Number(formObj.lpg_cylinders) || 0;
    const solar_panels = formObj.solar_panels || "no";
    const diet_type = formObj.diet_type || "vegetarian";
    const fast_fashion = formObj.fast_fashion || "medium";
    const electronics_bought = formObj.electronics_bought || "no";
    const recycling = formObj.recycling || "no";

    const carFactor = car_type === "diesel" ? EMISSION_FACTORS.car_diesel : EMISSION_FACTORS.car_petrol;
    const carCO2 = car_km * carFactor * 4.33;
    const busCO2 = bus_km * EMISSION_FACTORS.bus * 4.33;
    const metroCO2 = metro_km * EMISSION_FACTORS.metro * 4.33;
    const autoCO2 = auto_km * EMISSION_FACTORS.auto * 4.33;
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

    const earthsNeeded = Math.max(0.1, Number((totalFootprint / 150).toFixed(2)));
    const earthDaysUsed = Math.round((totalFootprint / 400) * 365);

    return {
      success: true,
      total: Number(totalFootprint.toFixed(2)),
      breakdown: {
        transport: Number(transportTotal.toFixed(2)),
        energy: Number(energyTotal.toFixed(2)),
        diet: Number(dietCO2.toFixed(2)),
        lifestyle: Number(lifestyleTotal.toFixed(2))
      },
      earthsNeeded,
      earthDaysUsed,
      comparisons: {
        parisTarget: 83,
        averageIndian: 150,
        globalAverage: 400
      }
    };
  }

  function localGetFallbackInsights(total: number, breakdown: any) {
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
      motivation: "Small changes multiplied by millions of people can truly heal our environment.",
      comparison: `Your footprint of ${total.toFixed(1)} kg CO2e is ${total < 150 ? 'below' : 'above'} the average Indian limit (150 kg/mo).`,
      weekly_challenge: "Switch off all standby electronics and walk/carpool at least twice this week.",
      fun_fact: "India is one of the only major economies whose climate commitments align strongly with Paris agreement levels!"
    };
  }

  // DOM Elements - Stepper Navigation
  const stepPanes = document.querySelectorAll(".step-pane") as NodeListOf<HTMLElement>;
  const stepIndicator = document.getElementById("step-indicator") as HTMLElement;
  const progressBar = document.getElementById("calculator-progress") as HTMLElement;
  const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement;
  const btnNext = document.getElementById("btn-next") as HTMLButtonElement;
  const calcForm = document.getElementById("calculator-form") as HTMLFormElement;

  // DOM Elements - Form Range Labels
  const carKm = document.getElementById("car_km") as HTMLInputElement;
  const carKmVal = document.getElementById("car-km-val") as HTMLElement;
  const busKm = document.getElementById("bus_km") as HTMLInputElement;
  const busKmVal = document.getElementById("bus-km-val") as HTMLElement;
  const metroKm = document.getElementById("metro_km") as HTMLInputElement;
  const metroKmVal = document.getElementById("metro-km-val") as HTMLElement;
  const autoKm = document.getElementById("auto_km") as HTMLInputElement;
  const autoKmVal = document.getElementById("auto-km-val") as HTMLElement;
  const flightsYear = document.getElementById("flights_year") as HTMLInputElement;
  const flightsVal = document.getElementById("flights-val") as HTMLElement;

  const electricityKwh = document.getElementById("electricity_kwh") as HTMLInputElement;
  const electricityVal = document.getElementById("elec-val") as HTMLElement;
  const lpgCylinders = document.getElementById("lpg_cylinders") as HTMLInputElement;
  const lpgVal = document.getElementById("lpg-val") as HTMLElement;

  const dietSlider = document.getElementById("diet_slider") as HTMLInputElement;
  const dietLabel = document.getElementById("diet-label") as HTMLElement;
  const dietTypeHidden = document.getElementById("diet_type") as HTMLInputElement;
  const foodWasteSlider = document.getElementById("electricity_kwh") as HTMLInputElement; // fallback handle
  const wasteLabel = document.getElementById("waste-label") as HTMLElement;
  const foodWasteInput = document.getElementById("food_waste") as HTMLInputElement;

  const fashionSlider = document.getElementById("fashion_slider") as HTMLInputElement;
  const fashionLabel = document.getElementById("fashion-label") as HTMLElement;
  const fashionTypeHidden = document.getElementById("fast_fashion") as HTMLInputElement;

  // DOM Toggles
  const btnSolarYes = document.getElementById("solar-yes") as HTMLButtonElement;
  const btnSolarNo = document.getElementById("solar-no") as HTMLButtonElement;
  const solarHiddenInput = document.getElementById("solar_panels") as HTMLInputElement;

  const btnElecYes = document.getElementById("elec-yes") as HTMLButtonElement;
  const btnElecNo = document.getElementById("elec-no") as HTMLButtonElement;
  const elecHiddenInput = document.getElementById("electronics_bought") as HTMLInputElement;

  const btnRecycleYes = document.getElementById("recycle-yes") as HTMLButtonElement;
  const btnRecycleNo = document.getElementById("recycle-no") as HTMLButtonElement;
  const recycleHiddenInput = document.getElementById("recycling") as HTMLInputElement;

  // Score Dashboard Elements
  const gaugeProgressCircle = document.getElementById("gauge-progress-circle") as unknown as SVGGeometryElement;
  const scoreCounterNum = document.getElementById("score-counter-num") as HTMLElement;
  const gaugeRatingBadge = document.getElementById("gauge-rating-badge") as HTMLElement;
  const carbonAgeDays = document.getElementById("carbon-age-days") as HTMLElement;
  const earthsNeededCount = document.getElementById("earths-needed-count") as HTMLElement;
  const userTotalNum = document.getElementById("user-total-comparison-num") as HTMLElement;
  const compareBarUser = document.getElementById("compare-bar-user") as HTMLElement;
  const userPercentageIndicator = document.getElementById("user-percentage-indicator") as HTMLElement;

  // Donut Segments
  const donutTrans = document.getElementById("donut-seg-trans") as unknown as SVGGeometryElement;
  const donutEnergy = document.getElementById("donut-seg-energy") as unknown as SVGGeometryElement;
  const donutDiet = document.getElementById("donut-seg-diet") as unknown as SVGGeometryElement;
  const donutShop = document.getElementById("donut-seg-shop") as unknown as SVGGeometryElement;

  const percTrans = document.getElementById("perc-trans") as HTMLElement;
  const percEnergy = document.getElementById("perc-energy") as HTMLElement;
  const percDiet = document.getElementById("perc-diet") as HTMLElement;
  const percShop = document.getElementById("perc-shop") as HTMLElement;

  // AI & Coach Content
  const coachContent = document.getElementById("ai-coach-content") as HTMLElement;
  const aiCoachBlank = document.getElementById("ai-blank-state") as HTMLElement;
  const aiCoachLoading = document.getElementById("ai-loading-spinner") as HTMLElement;
  const aiDataContainer = document.getElementById("ai-data-container") as HTMLElement;
  const coachWeeklyChallenge = document.getElementById("ai-weekly-challenge") as HTMLElement;
  const coachMotivation = document.getElementById("ai-motivation") as HTMLElement;
  const coachComparisonText = document.getElementById("ai-comparison-text") as HTMLElement;
  const coachTipsGrid = document.getElementById("ai-tips-grid") as HTMLElement;
  const coachFunFact = document.getElementById("ai-fun-fact") as HTMLElement;
  const btnAIResponse = document.getElementById("btn-ai-recalc") as HTMLButtonElement;

  // ECO Habitat Track States
  const totalSavedIndicator = document.getElementById("total-saved-indicator") as HTMLElement;
  const streakHeaderStr = document.getElementById("streak-header") as HTMLElement;
  const streakTextLabel = document.getElementById("streak-text") as HTMLElement;
  const streakFireEmoji = document.getElementById("streak-fire-emoji") as HTMLElement;
  const badgesSecs = {
    seedling: document.getElementById("badge-seedling") as HTMLElement,
    sapling: document.getElementById("badge-sapling") as HTMLElement,
    tree: document.getElementById("badge-tree") as HTMLElement,
    forest: document.getElementById("badge-forest") as HTMLElement
  };

  // Share system Elements
  const btnShare = document.getElementById("btn-share-score") as HTMLButtonElement;
  const btnCloseShare = document.getElementById("btn-close-share") as HTMLButtonElement;
  const shareModal = document.getElementById("share-modal") as HTMLElement;
  const certGrade = document.getElementById("cert-grade") as HTMLElement;
  const certTotal = document.getElementById("cert-total") as HTMLElement;
  const certDays = document.getElementById("cert-days") as HTMLElement;
  const btnTwitter = document.getElementById("btn-share-twitter") as HTMLAnchorElement;
  const btnCopy = document.getElementById("btn-copy-link") as HTMLButtonElement;

  // Tracking State Values
  let currentStep = 1;
  let activeTotalEmission = 0;
  let activeBreakdownSet = { transport: 0, energy: 0, diet: 80, lifestyle: 15 };
  let currentScoreGrade = "A";

  // --------------------------------------------------------
  // EARTH PULSE REAL-TIME ATMOSPHERIC CO2 COUNTER
  // --------------------------------------------------------
  const co2CounterNode = document.getElementById("co2-counter") as HTMLElement;
  if (co2CounterNode) {
    setInterval(() => {
      // Base trend average 421.15
      // Small real-time variance based on Date milliseconds to simulate continuous measuring heartbeat
      const ms = Date.now() % 100000;
      const flux = 421.1542 + (ms * 0.000009);
      co2CounterNode.textContent = flux.toFixed(4);
    }, 150);
  }

  // --------------------------------------------------------
  // PROGRESSIVE BACKGROUND FLOATING PARTICLES
  // --------------------------------------------------------
  const particleContainer = document.getElementById("particle-container");
  if (particleContainer) {
    const emojis = ["🌱", "🍃", "🍀", "🫧"];
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div");
      particle.className = "leaf-particle";
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.fontSize = `${Math.random() * 12 + 10}px`;
      particleContainer.appendChild(particle);
    }
  }

  // --------------------------------------------------------
  // WIZARD STEP NAVIGATION ENGINE
  // --------------------------------------------------------
  function renderStep(step: number) {
    stepPanes.forEach((pane) => {
      const paneStep = Number(pane.getAttribute("data-step"));
      if (paneStep === step) {
        pane.classList.remove("hidden");
      } else {
        pane.classList.add("hidden");
      }
    });

    stepIndicator.textContent = `STEP ${step} OF 4`;
    progressBar.style.width = `${(step / 4) * 100}%`;

    // Button states
    if (step === 1) {
      btnPrev.disabled = true;
      btnPrev.classList.add("text-text-muted", "cursor-not-allowed");
      btnPrev.classList.remove("text-white", "hover:bg-green-primary/5", "cursor-pointer");
    } else {
      btnPrev.disabled = false;
      btnPrev.classList.remove("text-text-muted", "cursor-not-allowed");
      btnPrev.classList.add("text-white", "hover:bg-green-primary/5", "cursor-pointer");
    }

    if (step === 4) {
      btnNext.textContent = "CALCULATE NOW";
    } else {
      btnNext.textContent = "NEXT STEP →";
    }
  }

  btnNext.addEventListener("click", async () => {
    if (currentStep < 4) {
      currentStep++;
      renderStep(currentStep);
    } else {
      // Step 4 final click triggers server computation
      await triggerEmissionsCalculation();
    }
  });

  btnPrev.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      renderStep(currentStep);
    }
  });

  // --------------------------------------------------------
  // INPUT RANGE SLIDERS DYNAMIC EVENT BINDINGS
  // --------------------------------------------------------
  carKm.addEventListener("input", (e) => {
    carKmVal.textContent = `${(e.target as HTMLInputElement).value} km/week`;
  });

  busKm.addEventListener("input", (e) => {
    busKmVal.textContent = `${(e.target as HTMLInputElement).value} km/week`;
  });

  metroKm.addEventListener("input", (e) => {
    metroKmVal.textContent = `${(e.target as HTMLInputElement).value} km/week`;
  });

  autoKm.addEventListener("input", (e) => {
    autoKmVal.textContent = `${(e.target as HTMLInputElement).value} km/week`;
  });

  flightsYear.addEventListener("input", (e) => {
    flightsVal.textContent = `${(e.target as HTMLInputElement).value} flights/yr`;
  });

  electricityKwh.addEventListener("input", (e) => {
    electricityVal.textContent = `${(e.target as HTMLInputElement).value} kWh/month`;
  });

  lpgCylinders.addEventListener("input", (e) => {
    lpgVal.textContent = `${(e.target as HTMLInputElement).value} cylinder/month`;
  });

  dietSlider.addEventListener("input", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    let label = "Vegetarian";
    let type = "vegetarian";
    if (val === 1) {
      label = "Vegan 🌱";
      type = "vegan";
    } else if (val === 2) {
      label = "Vegetarian 🥗";
      type = "vegetarian";
    } else if (val === 3) {
      label = "Omnivore 🍖";
      type = "omnivore";
    } else if (val === 4) {
      label = "Heavy Meat Consumer 🥩";
      type = "heavy_meat";
    }
    dietLabel.textContent = label;
    dietTypeHidden.value = type;
  });

  if (foodWasteInput) {
    foodWasteInput.addEventListener("input", (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      let label = "Moderate";
      if (val === 1) label = "Minimal Zero-Waste 🥬";
      else if (val === 2) label = "Moderate Crop Waste 🗑️";
      else if (val === 3) label = "High Food Waste 🦖";
      wasteLabel.textContent = label;
    });
  }

  fashionSlider.addEventListener("input", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    let label = "Medium (40kg CO₂)";
    let type = "medium";
    if (val === 1) {
      label = "Low (15kg CO₂)";
      type = "low";
    } else if (val === 2) {
      label = "Medium (40kg CO₂)";
      type = "medium";
    } else if (val === 3) {
      label = "High Fast-Fashion (80kg CO₂)";
      type = "high";
    }
    fashionLabel.textContent = label;
    fashionTypeHidden.value = type;
  });

  // --------------------------------------------------------
  // DYNAMIC BUTTON TOGGLES WITH INPUT VALUE BINDINGS
  // --------------------------------------------------------
  function setupToggle(btnYes: HTMLButtonElement, btnNo: HTMLButtonElement, hiddenInp: HTMLInputElement, defaultVal: string) {
    btnYes.addEventListener("click", () => {
      hiddenInp.value = "yes";
      btnYes.classList.replace("bg-bg-card", "bg-green-primary");
      btnYes.classList.replace("text-text-muted", "text-bg-dark");
      btnNo.classList.replace("bg-green-primary", "bg-bg-card");
      btnNo.classList.replace("text-bg-dark", "text-text-muted");
    });

    btnNo.addEventListener("click", () => {
      hiddenInp.value = "no";
      btnNo.classList.replace("bg-bg-card", "bg-green-primary");
      btnNo.classList.replace("text-text-muted", "text-bg-dark");
      btnYes.classList.replace("bg-green-primary", "bg-bg-card");
      btnYes.classList.replace("text-bg-dark", "text-text-muted");
    });
  }

  setupToggle(btnSolarYes, btnSolarNo, solarHiddenInput, "no");
  setupToggle(btnElecYes, btnElecNo, elecHiddenInput, "no");
  setupToggle(btnRecycleYes, btnRecycleNo, recycleHiddenInput, "no");

  // --------------------------------------------------------
  // GAUGE METER & CHART RENDER LOGIC
  // --------------------------------------------------------
  function updateCircularGauge(value: number) {
    // 251.2 circumference
    // Maximum normalization 500 kg
    const percentage = Math.min(100, (value / 500) * 100);
    const strokeValue = 251.2 - (251.2 * percentage) / 100;

    if (gaugeProgressCircle) {
      gaugeProgressCircle.style.strokeDashoffset = String(strokeValue);
    }

    // Direct Ticking up counter JS effect
    let startVal = 0;
    const endVal = Math.round(value);
    const duration = 1000;
    const startTime = performance.now();

    function animateCount(timestamp: number) {
      const progress = timestamp - startTime;
      const current = Math.min(endVal, Math.floor((progress / duration) * endVal));
      scoreCounterNum.textContent = String(current);
      if (progress < duration) {
        requestAnimationFrame(animateCount);
      } else {
        scoreCounterNum.textContent = String(endVal);
      }
    }
    requestAnimationFrame(animateCount);

    // Visual classification color maps
    const badge = gaugeRatingBadge;
    const glow = document.getElementById("gauge-glow") as HTMLElement;

    badge.classList.remove(
      "bg-green-primary/10", "bg-accent-yellow/10", "bg-accent-orange/10", "bg-accent-red/10",
      "text-green-soft", "text-accent-yellow", "text-accent-orange", "text-accent-red",
      "border-green-primary/20", "border-accent-yellow/20", "border-accent-orange/20", "border-accent-red/20"
    );

    if (value <= 100) {
      badge.textContent = "EXCELLENT (0-100 kg CO₂)";
      badge.classList.add("bg-green-primary/10", "text-green-soft", "border-green-primary/20");
      if (gaugeProgressCircle) gaugeProgressCircle.style.stroke = "#00C853";
      glow.style.backgroundColor = "rgba(0, 200, 83, 0.12)";
    } else if (value <= 200) {
      badge.textContent = "WARM WARNING (100-200 kg CO₂)";
      badge.classList.add("bg-accent-yellow/10", "text-accent-yellow", "border-accent-yellow/20");
      if (gaugeProgressCircle) gaugeProgressCircle.style.stroke = "#FFD600";
      glow.style.backgroundColor = "rgba(255, 214, 0, 0.12)";
    } else if (value <= 350) {
      badge.textContent = "MODERATE DANGER (200-350 kg CO₂)";
      badge.classList.add("bg-accent-orange/10", "text-accent-orange", "border-accent-orange/20");
      if (gaugeProgressCircle) gaugeProgressCircle.style.stroke = "#FF6D00";
      glow.style.backgroundColor = "rgba(255, 109, 0, 0.12)";
    } else {
      badge.textContent = "CRITICAL LIMIT (350kg+ CO₂)";
      badge.classList.add("bg-accent-red/10", "text-accent-red", "border-accent-red/20");
      if (gaugeProgressCircle) gaugeProgressCircle.style.stroke = "#D50000";
      glow.style.backgroundColor = "rgba(213, 0, 0, 0.12)";
    }
  }

  function updateVisualComparisons(total: number, breakdown: any, earths: number, days: number) {
    // Progress width comparisons
    // Normalizing against reference standard of 400kg as 100%
    const userPercentage = Math.round((total / 400) * 100);
    userTotalNum.textContent = `${total.toFixed(1)} kg/mo`;
    compareBarUser.style.width = `${Math.min(100, userPercentage)}%`;
    userPercentageIndicator.textContent = `${userPercentage}% vs Global Limits`;

    carbonAgeDays.textContent = `${days} Earth Days`;
    earthsNeededCount.textContent = `${earths.toFixed(2)} Earths`;

    // Donut Segments Calculations
    const transCO2 = breakdown.transport || 0;
    const energyCO2 = breakdown.energy || 0;
    const dietCO2 = breakdown.diet || 0;
    const styleCO2 = breakdown.lifestyle || 0;

    const baseSum = Math.max(1, transCO2 + energyCO2 + dietCO2 + styleCO2);

    const pTrans = Math.round((transCO2 / baseSum) * 100);
    const pEnergy = Math.round((energyCO2 / baseSum) * 100);
    const pDiet = Math.round((dietCO2 / baseSum) * 100);
    const pShop = Math.round((styleCO2 / baseSum) * 100);

    percTrans.textContent = `${pTrans}%`;
    percEnergy.textContent = `${pEnergy}%`;
    percDiet.textContent = `${pDiet}%`;
    percShop.textContent = `${pShop}%`;

    // Update SVG segments stroke arrays
    // Each segment has exact circumference = 100 because of radius 15.915
    if (donutTrans) {
      donutTrans.style.strokeDasharray = `${pTrans} ${100 - pTrans}`;
      donutTrans.style.strokeDashoffset = "100";
    }
    if (donutEnergy) {
      donutEnergy.style.strokeDasharray = `${pEnergy} ${100 - pEnergy}`;
      donutEnergy.style.strokeDashoffset = String(100 - pTrans);
    }
    if (donutDiet) {
      donutDiet.style.strokeDasharray = `${pDiet} ${100 - pDiet}`;
      donutDiet.style.strokeDashoffset = String(100 - pTrans - pEnergy);
    }
    if (donutShop) {
      donutShop.style.strokeDasharray = `${pShop} ${100 - pShop}`;
      donutShop.style.strokeDashoffset = String(100 - pTrans - pEnergy - pDiet);
    }
  }

  // --------------------------------------------------------
  // FULL CALCULATION HANDLER
  // --------------------------------------------------------
  async function triggerEmissionsCalculation() {
    const dataFormBytes = new FormData(calcForm);
    const formObj: Record<string, any> = {};
    dataFormBytes.forEach((val, key) => {
      formObj[key] = val;
    });

    try {
      // Step button trigger style loading
      btnNext.disabled = true;
      btnNext.textContent = "CALCULATING...";

      let data;
      try {
        const response = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formObj)
        });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("HTTP error " + response.status + " or unexpected content-type: " + contentType);
        }
        data = await response.json();
      } catch (innerErr) {
        console.warn("Backend API calculation offline, running client-side simulation:", innerErr);
        data = localCalculate(formObj);
      }

      if (data && data.success) {
        activeTotalEmission = data.total;
        activeBreakdownSet = data.breakdown;

        updateCircularGauge(data.total);
        updateVisualComparisons(data.total, data.breakdown, data.earthsNeeded, data.earthDaysUsed);

        // Instantly trigger Gemini AI insights coach advice automatically
        await triggerAIInsightsCoach(data.total, data.breakdown, formObj);
      }
    } catch (e) {
      console.error("Footprint Calculation error:", e);
    } finally {
      btnNext.disabled = false;
      btnNext.textContent = "RE-CALCULATE";
    }
  }

  // --------------------------------------------------------
  // EXTRACTION GEMINI AI COACH ADVICE INTERACTION
  // --------------------------------------------------------
  async function triggerAIInsightsCoach(totalVal: number, breakdownVal: any, formInputs: any) {
    aiCoachBlank.classList.add("hidden");
    aiCoachLoading.classList.remove("hidden");
    aiDataContainer.classList.add("hidden");

    try {
      let data;
      try {
        const response = await fetch("/api/ai-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total: totalVal,
            breakdown: breakdownVal,
            inputs: formInputs
          })
        });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("HTTP error " + response.status + " or unexpected content-type: " + contentType);
        }
        data = await response.json();
      } catch (innerErr) {
        console.warn("AI Coach API offline, running client-side insights logic:", innerErr);
        data = {
          success: true,
          insights: localGetFallbackInsights(totalVal, breakdownVal)
        };
      }

      if (data && data.success && data.insights) {
        const ins = data.insights;
        currentScoreGrade = ins.grade || "A";

        // Display results
        coachWeeklyChallenge.textContent = ins.weekly_challenge || "Swap one taxi ride for walking.";
        coachMotivation.textContent = `"${ins.motivation || ""}"`;
        coachComparisonText.textContent = ins.comparison || "";
        coachFunFact.textContent = ins.fun_fact || "";

        // Tips items populated
        coachTipsGrid.innerHTML = "";
        const tipsList = ins.tips || [];
        tipsList.forEach((tip: any) => {
          const card = document.createElement("div");
          card.className = "flip-card";
          card.innerHTML = `
            <div class="flip-card-inner">
              <div class="flip-card-front">
                <span class="text-3xl mb-2">${tip.icon || "💡"}</span>
                <span class="text-sm font-bold tracking-tight text-white">${tip.title || "Carbon Save"}</span>
                <span class="text-[10px] text-green-soft font-mono uppercase tracking-wider mt-1.5">Hover to Reveal Tip</span>
              </div>
              <div class="flip-card-back">
                <p class="text-xs text-text-primary px-2 text-center font-sans font-medium line-clamp-3">${tip.action || "Improve home energy load."}</p>
                <span class="text-[11px] font-bold text-accent-yellow mt-3 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">Defuses ${tip.impact || "12"}kg CO₂ / mo</span>
              </div>
            </div>
          `;
          coachTipsGrid.appendChild(card);
        });

        aiCoachLoading.classList.add("hidden");
        aiDataContainer.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Gemini Coach Advice rendering crash:", err);
      aiCoachLoading.classList.add("hidden");
      aiCoachBlank.classList.remove("hidden");
    }
  }

  btnAIResponse.addEventListener("click", () => {
    const dataFormBytes = new FormData(calcForm);
    const formObj: Record<string, any> = {};
    dataFormBytes.forEach((val, key) => {
      formObj[key] = val;
    });
    triggerAIInsightsCoach(activeTotalEmission, activeBreakdownSet, formObj);
  });

  // --------------------------------------------------------
  // HABIT TRACKER CLIENT LOGIC
  // --------------------------------------------------------
  const habitsListGrid = document.getElementById("habits-list-grid");

  function renderHabitsTracker(completedMap: Record<string, boolean> = getLocalHabitState().completedActions) {
    if (!habitsListGrid) return;
    habitsListGrid.innerHTML = "";

    // Sync streak and savings visual states initially
    const localState = getLocalHabitState();
    totalSavedIndicator.textContent = `🌱 ${localState.totalSaved.toFixed(1)} kg CO2 saved`;
    streakHeaderStr.textContent = `🔥 ${localState.streak} Days`;
    streakTextLabel.textContent = `${localState.streak} Day Streak!`;
    updateStreakBadges(localState.streak);

    PRESET_ACTIONS.forEach((act) => {
      const isCompleted = completedMap[act.id] || false;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
        isCompleted
          ? "bg-green-primary/10 border-green-primary/50 text-white"
          : "bg-bg-dark/40 border-green-primary/10 hover:border-green-primary/30 text-text-primary uppercase tracking-wider text-xs"
      }`;

      btn.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl">${act.emoji}</span>
          <div class="flex flex-col">
            <span class="text-xs font-semibold normal-case text-white leading-tight">${act.label}</span>
            <span class="text-[10px] text-green-soft font-mono mt-0.5">${act.offset > 0 ? "Defuses -" + act.offset + "kg CO₂" : "Impact Saved"}</span>
          </div>
        </div>
        <span class="text-lg text-green-soft">${isCompleted ? "✅" : "➕"}</span>
      `;

      btn.addEventListener("click", async () => {
        if (isCompleted) {
          // Already checked, show brief notification
          return;
        }
        await logEcoActionToServer(act.id);
      });

      habitsListGrid.appendChild(btn);
    });
  }

  async function logEcoActionToServer(actionId: string) {
    // Optimistically update local client-side state
    const localUpdated = localLogEcoAction(actionId);

    try {
      const response = await fetch("/api/log-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, guestId })
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("HTTP error " + response.status + " or unexpected content-type: " + contentType);
      }
      const data = await response.json();

      if (data.success) {
        // Sync to remote if exists, otherwise local already synced
        totalSavedIndicator.textContent = `🌱 ${data.totalSaved.toFixed(1)} kg CO2 saved`;
        streakHeaderStr.textContent = `🔥 ${data.streak} Days`;
        streakTextLabel.textContent = `${data.streak} Day Streak!`;
        updateStreakBadges(data.streak);
        renderHabitsTracker(data.completedActions);
        return;
      }
    } catch (e) {
      console.warn("Backend API log-action offline, using updated localStorage state:", e);
    }

    // Fallback: update UI from local client state
    totalSavedIndicator.textContent = `🌱 ${localUpdated.totalSaved.toFixed(1)} kg CO2 saved`;
    streakHeaderStr.textContent = `🔥 ${localUpdated.streak} Days`;
    streakTextLabel.textContent = `${localUpdated.streak} Day Streak!`;
    updateStreakBadges(localUpdated.streak);
    renderHabitsTracker(localUpdated.completedActions);
  }

  function updateStreakBadges(streak: number) {
    if (streak >= 3) {
      badgesSecs.seedling.classList.remove("opacity-30", "grayscale");
      badgesSecs.seedling.classList.add("scale-110", "transition-all");
    }
    if (streak >= 7) {
      badgesSecs.sapling.classList.remove("opacity-30", "grayscale");
      badgesSecs.sapling.classList.add("scale-110", "transition-all");
    }
    if (streak >= 30) {
      badgesSecs.tree.classList.remove("opacity-30", "grayscale");
      badgesSecs.tree.classList.add("scale-110", "transition-all");
    }
    if (streak >= 90) {
      badgesSecs.forest.classList.remove("opacity-30", "grayscale");
      badgesSecs.forest.classList.add("scale-110", "transition-all");
    }
  }

  // --------------------------------------------------------
  // SOCIAL SHARE SYSTEM
  // --------------------------------------------------------
  btnShare.addEventListener("click", () => {
    certGrade.textContent = currentScoreGrade;
    certTotal.textContent = `${activeTotalEmission.toFixed(1)} kg/mo`;
    
    // Earth Days calculations
    const days = Math.round((activeTotalEmission / 400) * 365);
    certDays.textContent = `${days} Days`;

    // Dynamic pre-filled tweet text
    const textFormat = encodeURIComponent(`My Carbon Footprint EcoScore grade is (${currentScoreGrade})! 🌍 I burn equivalent to ${days} Earth days in a year. Check yours, adopt green habits, and defuse climate carbon maps at EcoMind! #CarbonFootprint #ClimateAction #EcoMind`);
    btnTwitter.href = `https://twitter.com/intent/tweet?text=${textFormat}`;

    shareModal.classList.remove("hidden");
  });

  btnCloseShare.addEventListener("click", () => {
    shareModal.classList.add("hidden");
  });

  btnCopy.addEventListener("click", () => {
    const sumString = `EcoMind Carbon Footprint Score:\nGrade: ${currentScoreGrade}\nCarbon Output: ${activeTotalEmission.toFixed(1)} kg CO2e/month\nCheck yours at India Carbon Tracker platform! 🌱`;
    navigator.clipboard.writeText(sumString).then(() => {
      btnCopy.textContent = "📋 COPIED TO CLIPBOARD!";
      setTimeout(() => {
        btnCopy.textContent = "📋 COPY SUMMARY TO CLIPBOARD";
      }, 2000);
    });
  });

  // --------------------------------------------------------
  // INITIALIZATIONS
  // --------------------------------------------------------
  // Initial load
  renderStep(1);
  renderHabitsTracker();
  updateCircularGauge(120); // standard default start state gauge to indicate dashboard values
  updateVisualComparisons(120, activeBreakdownSet, 0.8, 110);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
