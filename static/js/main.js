// EcoMind Vanilla JS Frontend Entrypoint for Flask Python Application
document.addEventListener("DOMContentLoaded", () => {
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

  // DOM Elements - Stepper Navigation
  const stepPanes = document.querySelectorAll(".step-pane");
  const stepIndicator = document.getElementById("step-indicator");
  const progressBar = document.getElementById("calculator-progress");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const calcForm = document.getElementById("calculator-form");

  // DOM Elements - Form Range Labels
  const carKm = document.getElementById("car_km");
  const carKmVal = document.getElementById("car-km-val");
  const busKm = document.getElementById("bus_km");
  const busKmVal = document.getElementById("bus-km-val");
  const metroKm = document.getElementById("metro_km");
  const metroKmVal = document.getElementById("metro-km-val");
  const autoKm = document.getElementById("auto_km");
  const autoKmVal = document.getElementById("auto-km-val");
  const flightsYear = document.getElementById("flights_year");
  const flightsVal = document.getElementById("flights-val");

  const electricityKwh = document.getElementById("electricity_kwh");
  const electricityVal = document.getElementById("elec-val");
  const lpgCylinders = document.getElementById("lpg_cylinders");
  const lpgVal = document.getElementById("lpg-val");

  const dietSlider = document.getElementById("diet_slider");
  const dietLabel = document.getElementById("diet-label");
  const dietTypeHidden = document.getElementById("diet_type");
  const wasteLabel = document.getElementById("waste-label");
  const foodWasteInput = document.getElementById("food_waste");

  const fashionSlider = document.getElementById("fashion_slider");
  const fashionLabel = document.getElementById("fashion-label");
  const fashionTypeHidden = document.getElementById("fast_fashion");

  // DOM Toggles
  const btnSolarYes = document.getElementById("solar-yes");
  const btnSolarNo = document.getElementById("solar-no");
  const solarHiddenInput = document.getElementById("solar_panels");

  const btnElecYes = document.getElementById("elec-yes");
  const btnElecNo = document.getElementById("elec-no");
  const elecHiddenInput = document.getElementById("electronics_bought");

  const btnRecycleYes = document.getElementById("recycle-yes");
  const btnRecycleNo = document.getElementById("recycle-no");
  const recycleHiddenInput = document.getElementById("recycling");

  // Score Dashboard Elements
  const gaugeProgressCircle = document.getElementById("gauge-progress-circle");
  const scoreCounterNum = document.getElementById("score-counter-num");
  const gaugeRatingBadge = document.getElementById("gauge-rating-badge");
  const carbonAgeDays = document.getElementById("carbon-age-days");
  const earthsNeededCount = document.getElementById("earths-needed-count");
  const userTotalNum = document.getElementById("user-total-comparison-num");
  const compareBarUser = document.getElementById("compare-bar-user");
  const userPercentageIndicator = document.getElementById("user-percentage-indicator");

  // Donut Segments
  const donutTrans = document.getElementById("donut-seg-trans");
  const donutEnergy = document.getElementById("donut-seg-energy");
  const donutDiet = document.getElementById("donut-seg-diet");
  const donutShop = document.getElementById("donut-seg-shop");

  const percTrans = document.getElementById("perc-trans");
  const percEnergy = document.getElementById("perc-energy");
  const percDiet = document.getElementById("perc-diet");
  const percShop = document.getElementById("perc-shop");

  // AI & Coach Content
  const coachContent = document.getElementById("ai-coach-content");
  const aiCoachBlank = document.getElementById("ai-blank-state");
  const aiCoachLoading = document.getElementById("ai-loading-spinner");
  const aiDataContainer = document.getElementById("ai-data-container");
  const coachWeeklyChallenge = document.getElementById("ai-weekly-challenge");
  const coachMotivation = document.getElementById("ai-motivation");
  const coachComparisonText = document.getElementById("ai-comparison-text");
  const coachTipsGrid = document.getElementById("ai-tips-grid");
  const coachFunFact = document.getElementById("ai-fun-fact");
  const btnAIResponse = document.getElementById("btn-ai-recalc");

  // ECO Habitat Track States
  const totalSavedIndicator = document.getElementById("total-saved-indicator");
  const streakHeaderStr = document.getElementById("streak-header");
  const streakTextLabel = document.getElementById("streak-text");
  const streakFireEmoji = document.getElementById("streak-fire-emoji");
  const badgesSecs = {
    seedling: document.getElementById("badge-seedling"),
    sapling: document.getElementById("badge-sapling"),
    tree: document.getElementById("badge-tree"),
    forest: document.getElementById("badge-forest")
  };

  // Share system Elements
  const btnShare = document.getElementById("btn-share-score");
  const btnCloseShare = document.getElementById("btn-close-share");
  const shareModal = document.getElementById("share-modal");
  const certGrade = document.getElementById("cert-grade");
  const certTotal = document.getElementById("cert-total");
  const certDays = document.getElementById("cert-days");
  const btnTwitter = document.getElementById("btn-share-twitter");
  const btnCopy = document.getElementById("btn-copy-link");

  // Tracking State Values
  let currentStep = 1;
  let activeTotalEmission = 0;
  let activeBreakdownSet = { transport: 0, energy: 0, diet: 80, lifestyle: 15 };
  let currentScoreGrade = "A";

  // --------------------------------------------------------
  // EARTH PULSE REAL-TIME ATMOSPHERIC CO2 COUNTER
  // --------------------------------------------------------
  const co2CounterNode = document.getElementById("co2-counter");
  if (co2CounterNode) {
    setInterval(() => {
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
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.fontSize = `${Math.random() * 12 + 10}px`;
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particleContainer.appendChild(particle);
    }
  }

  // --------------------------------------------------------
  // WIZARD STEP NAVIGATION ENGINE
  // --------------------------------------------------------
  function renderStep(step) {
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
  // INPUT RANGE SLIDERS EVENT BINDINGS
  // --------------------------------------------------------
  carKm.addEventListener("input", (e) => {
    carKmVal.textContent = `${e.target.value} km/week`;
  });

  busKm.addEventListener("input", (e) => {
    busKmVal.textContent = `${e.target.value} km/week`;
  });

  metroKm.addEventListener("input", (e) => {
    metroKmVal.textContent = `${e.target.value} km/week`;
  });

  autoKm.addEventListener("input", (e) => {
    autoKmVal.textContent = `${e.target.value} km/week`;
  });

  flightsYear.addEventListener("input", (e) => {
    flightsVal.textContent = `${e.target.value} flights/yr`;
  });

  electricityKwh.addEventListener("input", (e) => {
    electricityVal.textContent = `${e.target.value} kWh/month`;
  });

  lpgCylinders.addEventListener("input", (e) => {
    lpgVal.textContent = `${e.target.value} cylinder/month`;
  });

  dietSlider.addEventListener("input", (e) => {
    const val = Number(e.target.value);
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

  fashionSlider.addEventListener("input", (e) => {
    const val = Number(e.target.value);
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
  function setupToggle(btnYes, btnNo, hiddenInp) {
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

  setupToggle(btnSolarYes, btnSolarNo, solarHiddenInput);
  setupToggle(btnElecYes, btnElecNo, elecHiddenInput);
  setupToggle(btnRecycleYes, btnRecycleNo, recycleHiddenInput);

  // --------------------------------------------------------
  // GAUGE METER & CHART RENDER LOGIC
  // --------------------------------------------------------
  function updateCircularGauge(value) {
    const percentage = Math.min(100, (value / 500) * 100);
    const strokeValue = 251.2 - (251.2 * percentage) / 100;

    if (gaugeProgressCircle) {
      gaugeProgressCircle.style.strokeDashoffset = String(strokeValue);
    }

    let startVal = 0;
    const endVal = Math.round(value);
    const duration = 1000;
    const startTime = performance.now();

    function animateCount(timestamp) {
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

    const badge = gaugeRatingBadge;
    const glow = document.getElementById("gauge-glow");

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

  function updateVisualComparisons(total, breakdown, earths, days) {
    const userPercentage = Math.round((total / 400) * 100);
    userTotalNum.textContent = `${total.toFixed(1)} kg/mo`;
    compareBarUser.style.width = `${Math.min(100, userPercentage)}%`;
    userPercentageIndicator.textContent = `${userPercentage}% vs Global Limits`;

    carbonAgeDays.textContent = `${days} Earth Days`;
    earthsNeededCount.textContent = `${earths.toFixed(2)} Earths`;

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
    const formObj = {};
    dataFormBytes.forEach((val, key) => {
      formObj[key] = val;
    });

    try {
      btnNext.disabled = true;
      btnNext.textContent = "CALCULATING...";

      const response = await fetch("/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formObj)
      });
      const data = await response.json();

      if (data.success) {
        activeTotalEmission = data.total;
        activeBreakdownSet = data.breakdown;

        updateCircularGauge(data.total);
        updateVisualComparisons(data.total, data.breakdown, data.earthsNeeded, data.earthDaysUsed);

        await triggerAIInsightsCoach(data.total, data.breakdown, formObj);
      }
    } catch (e) {
      console.error("Calculation Error:", e);
    } finally {
      btnNext.disabled = false;
      btnNext.textContent = "RE-CALCULATE";
    }
  }

  // --------------------------------------------------------
  // EXTRACTION GEMINI AI COACH ADVICE INTERACTION
  // --------------------------------------------------------
  async function triggerAIInsightsCoach(totalVal, breakdownVal, formInputs) {
    aiCoachBlank.classList.add("hidden");
    aiCoachLoading.classList.remove("hidden");
    aiDataContainer.classList.add("hidden");

    try {
      const response = await fetch("/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: totalVal,
          breakdown: breakdownVal,
          inputs: formInputs
        })
      });
      const data = await response.json();

      if (data.success && data.insights) {
        const ins = data.insights;
        currentScoreGrade = ins.grade || "A";

        coachWeeklyChallenge.textContent = ins.weekly_challenge || "Swap one taxi ride for walking.";
        coachMotivation.textContent = `"${ins.motivation || ""}"`;
        coachComparisonText.textContent = ins.comparison || "";
        coachFunFact.textContent = ins.fun_fact || "";

        coachTipsGrid.innerHTML = "";
        const tipsList = ins.tips || [];
        tipsList.forEach((tip) => {
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
      console.error("Gemini coach rendering error:", err);
      aiCoachLoading.classList.add("hidden");
      aiCoachBlank.classList.remove("hidden");
    }
  }

  btnAIResponse.addEventListener("click", () => {
    const dataFormBytes = new FormData(calcForm);
    const formObj = {};
    dataFormBytes.forEach((val, key) => {
      formObj[key] = val;
    });
    triggerAIInsightsCoach(activeTotalEmission, activeBreakdownSet, formObj);
  });

  // --------------------------------------------------------
  // HABIT TRACKER CLIENT LOGIC
  // --------------------------------------------------------
  const habitsListGrid = document.getElementById("habits-list-grid");

  function renderHabitsTracker(completedMap = {}) {
    if (!habitsListGrid) return;
    habitsListGrid.innerHTML = "";

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
        if (isCompleted) return;
        await logEcoActionToServer(act.id);
      });

      habitsListGrid.appendChild(btn);
    });
  }

  async function logEcoActionToServer(actionId) {
    try {
      const response = await fetch("/log-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, guestId })
      });
      const data = await response.json();

      if (data.success) {
        totalSavedIndicator.textContent = `🌱 ${data.totalSaved.toFixed(1)} kg CO2 saved`;
        streakHeaderStr.textContent = `🔥 ${data.streak} Days`;
        streakTextLabel.textContent = `${data.streak} Day Streak!`;

        updateStreakBadges(data.streak);
        renderHabitsTracker(data.completedActions);
      }
    } catch (e) {
      console.error("Streak logging error:", e);
    }
  }

  function updateStreakBadges(streak) {
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
    
    const days = Math.round((activeTotalEmission / 400) * 365);
    certDays.textContent = `${days} Days`;

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
  renderStep(1);
  renderHabitsTracker();
  updateCircularGauge(120);
  updateVisualComparisons(120, activeBreakdownSet, 0.8, 110);
});
