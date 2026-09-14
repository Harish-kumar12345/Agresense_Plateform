const express = require('express');
const router = express.Router();
const { getDistrictSoilFallback, fetchSoilData } = require('../services/realDataService');

/**
 * GET /api/soil/district-profile
 * Returns genuine Indian Soil Health Card district profile for coordinates / state / district
 */
router.get('/district-profile', (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon ? parseFloat(req.query.lon) : null;
    const state = req.query.state || null;
    const district = req.query.district || null;

    const profile = getDistrictSoilFallback(lat, lon, state, district);

    res.json({
      success: true,
      profile,
      query: { lat, lon, state, district },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Soil profile route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const ICAR_STCR = require('../data/icar_stcr_fertilizer_recommendations.json');

/**
 * POST /api/soil/recommend-fertilizer
 * Scientific ICAR STCR (Soil Test Crop Response) Targeted Yield Fertilizer Calculator
 */
router.post('/recommend-fertilizer', (req, res) => {
  try {
    const {
      crop = 'Rice',
      nitrogen = 180,
      phosphorus = 25,
      potassium = 200,
      ph = 7.2,
      area_hectares = 1.0,
      target_yield_tha = null,
      soil_type = 'Alluvial Loam'
    } = req.body || {};

    const cropKey = Object.keys(ICAR_STCR.crops).find(
      c => c.toLowerCase() === String(crop).toLowerCase() || String(crop).toLowerCase().includes(c.toLowerCase())
    ) || 'Rice';

    const cropCfg = ICAR_STCR.crops[cropKey];
    const targetYield = target_yield_tha ? Number(target_yield_tha) : cropCfg.default_target_yield_tha;
    const area = Math.max(0.1, Number(area_hectares) || 1.0);

    // 1. Calculate required elemental nutrients (kg/ha) using ICAR STCR Targeted Yield Equations
    const N_req = Math.max(20, Math.round(cropCfg.stcr_coefficients.FN.target_mult * targetYield - cropCfg.stcr_coefficients.FN.soil_eff * Number(nitrogen)));
    const P_req = Math.max(15, Math.round(cropCfg.stcr_coefficients.FP.target_mult * targetYield - cropCfg.stcr_coefficients.FP.soil_eff * Number(phosphorus)));
    const K_req = Math.max(15, Math.round(cropCfg.stcr_coefficients.FK.target_mult * targetYield - cropCfg.stcr_coefficients.FK.soil_eff * Number(potassium)));

    // 2. Convert to commercial fertilizer bags
    // DAP (18% N, 46% P2O5) - 50 kg bag
    const dap_kg_ha = Math.round(P_req / 0.46);
    const dap_bags_ha = Math.round((dap_kg_ha / 50) * 10) / 10;
    const n_from_dap = dap_kg_ha * 0.18;

    // Urea (46% N) - 45 kg bag
    const remaining_n = Math.max(0, N_req - n_from_dap);
    const urea_kg_ha = Math.round(remaining_n / 0.46);
    const urea_bags_ha = Math.round((urea_kg_ha / 45) * 10) / 10;

    // MOP (60% K2O) - 50 kg bag
    const mop_kg_ha = Math.round(K_req / 0.60);
    const mop_bags_ha = Math.round((mop_kg_ha / 50) * 10) / 10;

    // 3. Field total bags
    const totalDapBags = Math.round(dap_bags_ha * area * 10) / 10;
    const totalUreaBags = Math.round(urea_bags_ha * area * 10) / 10;
    const totalMopBags = Math.round(mop_bags_ha * area * 10) / 10;

    // 4. pH Amendment Recommendation
    let phAmendment = 'Soil pH is in the optimal range (6.0 - 7.5). No chemical amendment required.';
    if (ph < 6.0) {
      const limeAmt = Math.round((6.5 - ph) * 400 * area);
      phAmendment = `Acidic Soil (pH ${ph}). Apply approx. ${limeAmt} kg Agricultural Lime (CaCO₃) 2-3 weeks before sowing to improve nutrient availability.`;
    } else if (ph > 8.0) {
      const gypsumAmt = Math.round((ph - 7.8) * 1200 * area);
      phAmendment = `Alkaline Soil (pH ${ph}). Apply approx. ${gypsumAmt} kg Agricultural Gypsum (CaSO₄·2H₂O) followed by leaching to correct sodicity.`;
    }

    res.json({
      success: true,
      crop: cropCfg.name,
      targetYieldTha: targetYield,
      farmAreaHectares: area,
      soilHealthInput: { nitrogen, phosphorus, potassium, ph, soil_type },
      recommendedNutrientsPerHectare: {
        N_kgha: N_req,
        P2O5_kgha: P_req,
        K2O_kgha: K_req
      },
      commercialFertilizersPerHectare: {
        dap_kg: dap_kg_ha,
        dap_bags_50kg: dap_bags_ha,
        urea_kg: urea_kg_ha,
        urea_bags_45kg: urea_bags_ha,
        mop_kg: mop_kg_ha,
        mop_bags_50kg: mop_bags_ha
      },
      totalFieldRequirement: {
        dap_bags: totalDapBags,
        urea_bags: totalUreaBags,
        mop_bags: totalMopBags
      },
      applicationSchedule: cropCfg.split_schedule,
      micronutrientAdvisory: cropCfg.micronutrient_advisory,
      organicManureRecommendedKg: Math.round(cropCfg.organic_manure_kgha * area),
      phAmendment,
      methodology: 'ICAR-IISS Soil Test Crop Response (STCR) Targeted Yield Model'
    });
  } catch (error) {
    console.error('Fertilizer recommendation error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute fertilizer recommendation: ' + error.message });
  }
});

module.exports = router;
