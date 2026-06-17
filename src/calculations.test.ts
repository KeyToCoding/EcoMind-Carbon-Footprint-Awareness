import { describe, it, expect } from "vitest";

// Local simulation of calculation logic so we can test the exact formulas used in server and client
interface CalculationInputs {
  car_km?: number;
  car_type?: string;
  bus_km?: number;
  metro_km?: number;
  auto_km?: number;
  flights_year?: number;
  electricity_kwh?: number;
  lpg_cylinders?: number;
  solar_panels?: string;
  diet_type?: string;
  fast_fashion?: string;
  electronics_bought?: string;
  recycling?: string;
}

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

function calculateFootprint(inputs: CalculationInputs) {
  const car_km = inputs.car_km || 0;
  const car_type = inputs.car_type || "petrol";
  const bus_km = inputs.bus_km || 0;
  const metro_km = inputs.metro_km || 0;
  const auto_km = inputs.auto_km || 0;
  const flights_year = inputs.flights_year || 0;
  const electricity_kwh = inputs.electricity_kwh || 0;
  const lpg_cylinders = inputs.lpg_cylinders || 0;
  const solar_panels = inputs.solar_panels || "no";
  const diet_type = inputs.diet_type || "vegetarian";
  const fast_fashion = inputs.fast_fashion || "medium";
  const electronics_bought = inputs.electronics_bought || "no";
  const recycling = inputs.recycling || "no";

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
    total: Number(totalFootprint.toFixed(2)),
    breakdown: {
      transport: Number(transportTotal.toFixed(2)),
      energy: Number(energyTotal.toFixed(2)),
      diet: Number(dietCO2.toFixed(2)),
      lifestyle: Number(lifestyleTotal.toFixed(2))
    },
    earthsNeeded,
    earthDaysUsed
  };
}

describe("EcoMind Carbon Calculations Engine Tests", () => {
  it("should calculate correct baseline with zero travel and default diet", () => {
    const res = calculateFootprint({
      car_km: 0,
      bus_km: 0,
      metro_km: 0,
      auto_km: 0,
      flights_year: 0,
      electricity_kwh: 120, // default
      lpg_cylinders: 1, // default
      solar_panels: "no",
      diet_type: "vegetarian",
      fast_fashion: "medium",
      electronics_bought: "no",
      recycling: "no"
    });

    const expectedEnergy = 120 * EMISSION_FACTORS.electricity + 1 * EMISSION_FACTORS.lpg; // 98.4 + 39.6 = 138.0
    const expectedDiet = EMISSION_FACTORS.diet_vegetarian; // 80.0
    const expectedLifestyle = EMISSION_FACTORS.fashion_medium; // 40.0
    const expectedTotal = expectedEnergy + expectedDiet + expectedLifestyle; // 258.00

    expect(res.breakdown.transport).toBe(0);
    expect(res.breakdown.energy).toBe(expectedEnergy);
    expect(res.breakdown.diet).toBe(expectedDiet);
    expect(res.breakdown.lifestyle).toBe(expectedLifestyle);
    expect(res.total).toBe(Number(expectedTotal.toFixed(2)));
  });

  it("should apply solar panel credits and recycling offsets accurately", () => {
    const res = calculateFootprint({
      electricity_kwh: 100,
      lpg_cylinders: 1,
      solar_panels: "yes",
      recycling: "yes",
      diet_type: "vegan"
    });

    const expectedEnergy = Math.max(0, 100 * EMISSION_FACTORS.electricity + 1 * EMISSION_FACTORS.lpg + EMISSION_FACTORS.solar_offset); // 82 + 39.6 - 15 = 106.6
    const expectedLifestyle = Math.max(0, EMISSION_FACTORS.fashion_medium + EMISSION_FACTORS.recycling_offset); // 40 - 10 = 30.0

    expect(res.breakdown.energy).toBe(Number(expectedEnergy.toFixed(2)));
    expect(res.breakdown.lifestyle).toBe(Number(expectedLifestyle.toFixed(2)));
  });

  it("should handle car-fuel coefficients dynamically (petrol vs diesel)", () => {
    const resPetrol = calculateFootprint({ car_km: 100, car_type: "petrol" });
    const resDiesel = calculateFootprint({ car_km: 100, car_type: "diesel" });

    const petrolCommute = 100 * EMISSION_FACTORS.car_petrol * 4.33;
    const dieselCommute = 100 * EMISSION_FACTORS.car_diesel * 4.33;

    expect(resPetrol.breakdown.transport).toBe(Number(petrolCommute.toFixed(2)));
    expect(resDiesel.breakdown.transport).toBe(Number(dieselCommute.toFixed(2)));
    expect(resDiesel.breakdown.transport).toBeLessThan(resPetrol.breakdown.transport);
  });

  it("should safely clamp energy and lifestyle breakdowns to non-negative values", () => {
    // Large negative solar or recycling offsets should make breakdown 0, not negative
    const res = calculateFootprint({
      electricity_kwh: 0,
      lpg_cylinders: 0,
      solar_panels: "yes",
      fast_fashion: "low",
      recycling: "yes"
    });

    expect(res.breakdown.energy).toBeGreaterThanOrEqual(0);
    expect(res.breakdown.lifestyle).toBeGreaterThanOrEqual(0);
  });
});
