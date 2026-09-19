const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { HarvestRecord } = require('../models/HarvestRecord');
const { FarmActivity } = require('../models/FarmActivity');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { fetchLiveWeather, calculateRealGDD, fetchAllRealData } = require('../services/realDataService');
const { predictCropYield } = require('../services/mlClient');

// Load CIBRC PHI Agrochemicals Directory
let cibrcAgrochemicals = [];
try {
  const cibrcPath = path.join(__dirname, '../data/cibrc_approved_agrochemicals_phi.json');
  if (fs.existsSync(cibrcPath)) {
    const raw = JSON.parse(fs.readFileSync(cibrcPath, 'utf8'));
    cibrcAgrochemicals = raw.agrochemicals || [];
  }
} catch (e) {
  console.warn('Could not load CIBRC agrochemicals dataset:', e.message);
}

// Load ICAR Package of Practices Agronomic Guidelines
let icarGuidelines = {};
try {
  const popPath = path.join(__dirname, '../data/icar_package_of_practices.json');
  if (fs.existsSync(popPath)) {
    const raw = JSON.parse(fs.readFileSync(popPath, 'utf8'));
    icarGuidelines = raw.crops || {};
  }
} catch (e) {
  console.warn('Could not load ICAR Package of Practices:', e.message);
}

// Load cropStageRules dataset
let cropStageRules = { defaultDurationDays: 105, crops: {}, adjustmentRules: {} };
try {
  const rulesPath = path.join(__dirname, '../data/cropStageRules.json');
  if (fs.existsSync(rulesPath)) {
    cropStageRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load cropStageRules dataset:', e.message);
}

// Standard Crop Harvest & Phenology Specifications (FAO-56 & ICAR Guidelines)
const CROP_SPECS = {
  Rice: {
    maturityDays: 120,
    gddThreshold: 1600,
    baseTemp: 10,
    baseYield: 4.2,
    moistureTarget: 13.5,
    workersPerHa: 5,
    machineryRecommendation: 'Combine Harvester (Track type), Paddy Thresher, Digital Grain Moisture Meter',
    stages: [
      { name: 'Sowing & Nursery', gddPct: 15 },
      { name: 'Active Tillering', gddPct: 35 },
      { name: 'Panicle Initiation & Flowering', gddPct: 65 },
      { name: 'Grain Filling & Milk', gddPct: 85 },
      { name: 'Physiological Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Stop field submergence and drain standing water 10-14 days before scheduled combine cutting.',
      'Harvest when 80-85% of grains in the panicle turn golden yellow (straw colour).',
      'Target grain moisture at harvest is 20-22%; dry promptly to 13.5% for safe storage.',
      'Calibrate grain moisture meters before filling gunny/HDPE bags to prevent fungal mold.'
    ]
  },
  Wheat: {
    maturityDays: 110,
    gddThreshold: 1400,
    baseTemp: 5,
    baseYield: 3.8,
    moistureTarget: 12.0,
    workersPerHa: 4,
    machineryRecommendation: 'Combine Harvester (Wheel type), Straw Reaper, Seed Cleaner & Grader',
    stages: [
      { name: 'Crown Root Initiation (CRI)', gddPct: 18 },
      { name: 'Tillering & Jointing', gddPct: 40 },
      { name: 'Booting & Heading', gddPct: 65 },
      { name: 'Dough & Grain Filling', gddPct: 85 },
      { name: 'Golden Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Stop irrigation at the hard dough stage (approx. 10 days before maturity).',
      'Harvest when spikes turn yellowish brown and grain feels hard under thumb nail pressure.',
      'Maintain storage moisture below 12% to prevent khapra beetle and fungal spoilage.',
      'Operate straw reaper immediately after combine harvesting for livestock fodder collection.'
    ]
  },
  Maize: {
    maturityDays: 100,
    gddThreshold: 1500,
    baseTemp: 10,
    baseYield: 5.5,
    moistureTarget: 14.0,
    workersPerHa: 4,
    machineryRecommendation: 'Corn Combine Harvester, Tractor Mounted Maize Sheller, Moisture Tester',
    stages: [
      { name: 'Seedling Emergence', gddPct: 15 },
      { name: 'Knee-High Vegetative (V6)', gddPct: 38 },
      { name: 'Tasseling & Silking (R1)', gddPct: 62 },
      { name: 'Milk & Dough (R3-R4)', gddPct: 82 },
      { name: 'Black Layer Maturity (R6)', gddPct: 100 }
    ],
    strategyAdvice: [
      'Inspect cob base for physiological black layer formation indicating maximum dry matter.',
      'Harvest when husks turn papery dry and kernels dent firmly.',
      'Dry shelled grain to 14% moisture before bulk bagging in clean, fumigated godowns.'
    ]
  },
  Potato: {
    maturityDays: 85,
    gddThreshold: 1250,
    baseTemp: 7,
    baseYield: 22.0,
    moistureTarget: 78.0,
    workersPerHa: 6,
    machineryRecommendation: 'Tractor-drawn Potato Digger, Mechanical Grader, Sorting Conveyor Racks',
    stages: [
      { name: 'Sprout Development', gddPct: 15 },
      { name: 'Vegetative Canopy', gddPct: 35 },
      { name: 'Tuber Initiation', gddPct: 55 },
      { name: 'Tuber Bulking', gddPct: 85 },
      { name: 'Haulm Cutting & Skin Hardening', gddPct: 100 }
    ],
    strategyAdvice: [
      'Perform haulm dehaulming (vine cutting) 10-12 days before digging to cure tuber skin.',
      'Stop irrigation 8-10 days prior to digging to avoid tuber rot during handling.',
      'Allow dug potatoes to cure in field shade for 10-15 days before cold storage placement.'
    ]
  },
  Tomato: {
    maturityDays: 85,
    gddThreshold: 1350,
    baseTemp: 10,
    baseYield: 28.0,
    moistureTarget: 85.0,
    workersPerHa: 8,
    machineryRecommendation: 'Plastic Harvest Crates, Field Sorting & Washing Tables, Hand Rigs',
    stages: [
      { name: 'Transplant Establishment', gddPct: 18 },
      { name: 'Vegetative Branching', gddPct: 38 },
      { name: 'Flowering & Fruit Set', gddPct: 62 },
      { name: 'Mature Green Stage', gddPct: 82 },
      { name: 'Breaker / Red Ripe Picking', gddPct: 100 }
    ],
    strategyAdvice: [
      'Pick fruit at "breaker" stage (10-30% pink) for distant market transit, red-ripe for local mandi.',
      'Harvest during early morning hours to keep pulp temperature low and enhance shelf-life.',
      'Stack harvest in well-ventilated plastic crates (max 20-25 kg per crate) without over-packing.'
    ]
  },
  Cotton: {
    maturityDays: 160,
    gddThreshold: 2200,
    baseTemp: 15,
    baseYield: 2.4,
    moistureTarget: 10.0,
    workersPerHa: 7,
    machineryRecommendation: 'Mechanical Cotton Stripper, Pneumatic Baling Press, Digital Moisture Meter',
    stages: [
      { name: 'Seedling Emergence', gddPct: 15 },
      { name: 'Square Formation', gddPct: 35 },
      { name: 'Flowering & Boll Setting', gddPct: 60 },
      { name: 'Boll Maturation', gddPct: 85 },
      { name: 'Boll Bursting & Picking', gddPct: 100 }
    ],
    strategyAdvice: [
      'Initiate picking only when bolls are fully opened and dew has completely dried off.',
      'Avoid picking stained, damaged or immature bolls with clean white lint.',
      'Keep harvested seed cotton in moisture-free sheds below 10% moisture before ginning.'
    ]
  },
  Sugarcane: {
    maturityDays: 330,
    gddThreshold: 4500,
    baseTemp: 12,
    baseYield: 72.0,
    moistureTarget: 70.0,
    workersPerHa: 10,
    machineryRecommendation: 'Sugarcane Harvester, Billet Chopper, Cane Loading Tractor Trolley',
    stages: [
      { name: 'Germination & Sprouting', gddPct: 12 },
      { name: 'Formative Tillering', gddPct: 30 },
      { name: 'Grand Growth Phase', gddPct: 70 },
      { name: 'Sucrose Accumulation', gddPct: 90 },
      { name: 'Maturity & Harvest', gddPct: 100 }
    ],
    strategyAdvice: [
      'Verify hand refractometer brix reading (18-20% brix) before issuing cutting order.',
      'Cut cane flush with the ground to maximize sucrose recovery in the bottom internodes.',
      'Supply harvested cane to the sugar mill within 24-48 hours to minimize sucrose inversion.'
    ]
  },
  Mustard: {
    maturityDays: 105,
    gddThreshold: 1200,
    baseTemp: 5,
    baseYield: 1.6,
    moistureTarget: 9.0,
    workersPerHa: 4,
    machineryRecommendation: 'Mustard Thresher, Combine Harvester with Rapeseed Cutter Attachment',
    stages: [
      { name: 'Seedling Emergence', gddPct: 15 },
      { name: 'Rosette & Branching', gddPct: 35 },
      { name: 'Yellow Flowering', gddPct: 60 },
      { name: 'Siliqua Pod Filling', gddPct: 85 },
      { name: 'Pod Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when 75% of the siliquae turn golden yellow to avoid shattering loss.',
      'Reap crop during early morning hours when pods are pliable with humidity.',
      'Dry threshed mustard seeds in sun until moisture drops below 9% for oil expelling.'
    ]
  },
  Soybean: {
    maturityDays: 95,
    gddThreshold: 1350,
    baseTemp: 10,
    baseYield: 2.2,
    moistureTarget: 12.0,
    workersPerHa: 4,
    machineryRecommendation: 'Multi-Crop Combine Harvester, Seed Cleaner & Sieve, Moisture Tester',
    stages: [
      { name: 'Emergence & V-Stages', gddPct: 15 },
      { name: 'Branching & Canopy', gddPct: 35 },
      { name: 'Flowering & Pod Set (R1-R3)', gddPct: 62 },
      { name: 'Pod Filling (R5)', gddPct: 82 },
      { name: 'Leaf Drop & Harvest Ready (R8)', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when 95% of leaves have dropped and pods have turned brown.',
      'Operate combine cylinder speed at 400-500 RPM to prevent seed coat cracking.',
      'Store seed at 10-12% moisture to preserve seed viability and germination.'
    ]
  },
  Groundnut: {
    maturityDays: 115,
    gddThreshold: 1500,
    baseTemp: 10,
    baseYield: 2.1,
    moistureTarget: 9.0,
    workersPerHa: 5,
    machineryRecommendation: 'Tractor Groundnut Digger-Shaker, Groundnut Thresher/Pod Stripper',
    stages: [
      { name: 'Emergence', gddPct: 15 },
      { name: 'Vegetative & Flowering', gddPct: 35 },
      { name: 'Peg Penetration into Soil', gddPct: 60 },
      { name: 'Pod Development', gddPct: 85 },
      { name: 'Pod Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Examine inside shell: 70-75% of pods should show prominent brown/black inner lining.',
      'Irrigate lightly 2 days before digging if soil is hard to avoid pod separation in soil.',
      'Dry harvested pods in inverted windrows for 3-5 days to reduce moisture below 9%.'
    ]
  },
  Gram: {
    maturityDays: 105,
    gddThreshold: 1250,
    baseTemp: 8,
    baseYield: 1.5,
    moistureTarget: 10.5,
    workersPerHa: 3,
    machineryRecommendation: 'Tractor-drawn Gram Harvester, Multi-crop Pulse Thresher',
    stages: [
      { name: 'Emergence', gddPct: 15 },
      { name: 'Vegetative Branching', gddPct: 35 },
      { name: 'Flowering', gddPct: 60 },
      { name: 'Pod Filling', gddPct: 85 },
      { name: 'Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when leaves turn reddish-brown/yellow and shake rattle sounds inside pods.',
      'Reap in morning hours to prevent shattering losses in field.',
      'Dry threshed grain to 10% moisture before packing in clean jute bags.'
    ]
  },
  Onion: {
    maturityDays: 120,
    gddThreshold: 1300,
    baseTemp: 6,
    baseYield: 18.0,
    moistureTarget: 12.0,
    workersPerHa: 6,
    machineryRecommendation: 'Tractor Mounted Onion Digger, Curing Racks, De-topper',
    stages: [
      { name: 'Transplant Establishment', gddPct: 20 },
      { name: 'Vegetative Foliage', gddPct: 45 },
      { name: 'Bulb Initiation', gddPct: 70 },
      { name: 'Bulb Swelling', gddPct: 88 },
      { name: 'Neck Fall (50-70%) & Harvest', gddPct: 100 }
    ],
    strategyAdvice: [
      'Withhold irrigation 10-15 days prior to harvest to enhance bulb storage life.',
      'Harvest when 50-70% of plant tops fall over naturally (neck fall).',
      'Cure harvested bulbs in field windrows or shaded racks for 5-7 days before clipping tops.'
    ]
  },
  Pulses: {
    maturityDays: 90,
    gddThreshold: 1200,
    baseTemp: 10,
    baseYield: 1.8,
    moistureTarget: 11.0,
    workersPerHa: 3,
    machineryRecommendation: 'Multi-crop Thresher, Pulse Pod Stripper, Grading Sieve',
    stages: [
      { name: 'Emergence', gddPct: 15 },
      { name: 'Vegetative Branching', gddPct: 35 },
      { name: 'Flowering', gddPct: 60 },
      { name: 'Pod Development', gddPct: 85 },
      { name: 'Physiological Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when 80-85% of pods turn dark brown or blackish depending on variety.',
      'Avoid delayed harvesting to prevent pod shattering.',
      'Sun-dry grain to 10-11% moisture before storing with neem leaf bio-protectant.'
    ]
  }
};

// Helper: match crop key
function getCropSpec(cropName) {
  if (!cropName) return CROP_SPECS.Rice;
  const match = Object.keys(CROP_SPECS).find(k => k.toLowerCase() === String(cropName).toLowerCase().trim());
  return match ? CROP_SPECS[match] : CROP_SPECS.Rice;
}

/**
 * Resolve crop duration and variety specifics from cropStageRules
 */
function resolveCropDuration(cropName, varietyOrNotes) {
  const defaultDuration = cropStageRules.defaultDurationDays || 105;
  const defaultStages = cropStageRules.defaultStageDistribution || [
    { name: 'Germination & Emergence', minPct: 0, maxPct: 10 },
    { name: 'Vegetative Growth', minPct: 10, maxPct: 50 },
    { name: 'Flowering / Reproductive', minPct: 50, maxPct: 70 },
    { name: 'Grain Filling / Maturation', minPct: 70, maxPct: 90 },
    { name: 'Physiological Maturity / Harvest', minPct: 90, maxPct: 100 }
  ];

  if (!cropName) {
    return {
      cropName: 'Generic Crop',
      varietyName: 'Standard (Default Estimate)',
      durationDays: defaultDuration,
      durationRange: [95, 115],
      isEstimated: true,
      stages: defaultStages
    };
  }

  const cleanCrop = String(cropName).trim();
  const matchedKey = Object.keys(cropStageRules.crops || {}).find(
    k => k.toLowerCase() === cleanCrop.toLowerCase() ||
         cleanCrop.toLowerCase().includes(k.toLowerCase()) ||
         k.toLowerCase().includes(cleanCrop.toLowerCase())
  );

  if (!matchedKey) {
    return {
      cropName: cleanCrop,
      varietyName: 'Standard (Default Benchmark)',
      durationDays: defaultDuration,
      durationRange: [95, 115],
      isEstimated: true,
      stages: defaultStages
    };
  }

  const rule = cropStageRules.crops[matchedKey];
  let chosenDuration = rule.defaultDurationDays;
  let chosenVariety = 'Medium / Standard';
  let chosenRange = [chosenDuration - 10, chosenDuration + 10];

  if (rule.varieties && varietyOrNotes) {
    const text = String(varietyOrNotes).toLowerCase();
    if (text.includes('short') || text.includes('early') || text.includes('pioneer 3396') || text.includes('dkc 9108') || text.includes('pusa bold') || text.includes('pukhraj')) {
      chosenDuration = rule.varieties.short.durationDays;
      chosenVariety = rule.varieties.short.name;
      chosenRange = rule.varieties.short.range;
    } else if (text.includes('long') || text.includes('late') || text.includes('traditional') || text.includes('sindhuri') || text.includes('winter')) {
      chosenDuration = rule.varieties.long.durationDays;
      chosenVariety = rule.varieties.long.name;
      chosenRange = rule.varieties.long.range;
    } else if (rule.varieties.medium) {
      chosenDuration = rule.varieties.medium.durationDays;
      chosenVariety = rule.varieties.medium.name;
      chosenRange = rule.varieties.medium.range;
    }
  } else if (rule.varieties && rule.varieties.medium) {
    chosenDuration = rule.varieties.medium.durationDays;
    chosenVariety = rule.varieties.medium.name;
    chosenRange = rule.varieties.medium.range;
  }

  return {
    cropName: matchedKey,
    varietyName: chosenVariety,
    durationDays: chosenDuration,
    durationRange: chosenRange,
    isEstimated: false,
    stages: rule.stages || defaultStages
  };
}

/**
 * Calculate dynamic activity-aware growth progress and harvest date adjustments.
 * Evaluates field activities (irrigation, fertilization, spraying, weeding, stress events)
 * against agronomic thresholds and computes calibrated harvest range and physiological progress.
 */
function calculateBackendActivityAdjustments(
  cropName,
  cropDurationDays,
  sowingDate,
  activities = [],
  now = new Date(),
  varietyOrNotes = ''
) {
  const durationInfo = resolveCropDuration(cropName, varietyOrNotes);
  const duration = cropDurationDays || durationInfo.durationDays;
  const baseHarvestDate = new Date(sowingDate.getTime() + duration * 86400000);

  const daysSinceSowing = Math.max(0, Math.floor((now.getTime() - sowingDate.getTime()) / 86400000));
  const baseProgressPct = Math.min(100, Math.max(0, Math.round((daysSinceSowing / duration) * 100)));

  const sortedActs = [...activities]
    .filter(a => {
      const actTime = new Date(a.date).getTime();
      return !isNaN(actTime) && actTime >= sowingDate.getTime() - 86400000 && actTime <= now.getTime() + 86400000;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const rules = cropStageRules.adjustmentRules || {
    irrigation: { optimalIntervalDays: 12, maxAllowedGapDays: 18, gapDelayPerWeek: 3, onScheduleAdvancementDays: 1 },
    fertilization: { expectedVegetativeCutoffPct: 45, missingFertilizationDelayDays: 3 },
    pestAndDisease: { unmitigatedInfectionDelayDays: 5, sprayMitigationDaysRecovered: 3 },
    weeding: { cutoffDay: 40, missingWeedingDelayDays: 2 },
    stressEvents: { droughtDelayDays: 5, waterloggingDelayDays: 4, diseaseDelayDays: 4, heatwaveDelayDays: 3, generalStressDelayDays: 3 }
  };

  let delayDays = 0;
  let advanceDays = 0;
  const adjustmentReasons = [];
  const flags = {
    waterStress: false,
    nutrientRisk: false,
    pestDiseaseRisk: false,
    weedCompetitionRisk: false,
    environmentalStress: false
  };

  // 1. Irrigation
  const irrigations = sortedActs.filter(a => a.activity_type === 'Irrigation');
  if (daysSinceSowing >= rules.irrigation.maxAllowedGapDays) {
    let lastWaterDate = sowingDate;
    let maxGap = 0;
    let gapStart = sowingDate;
    let gapEnd = now;

    for (const irr of irrigations) {
      const irrDate = new Date(irr.date);
      const gap = Math.floor((irrDate.getTime() - lastWaterDate.getTime()) / 86400000);
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = lastWaterDate;
        gapEnd = irrDate;
      }
      lastWaterDate = irrDate;
    }

    const tailGap = Math.floor((now.getTime() - lastWaterDate.getTime()) / 86400000);
    if (tailGap > maxGap) {
      maxGap = tailGap;
      gapStart = lastWaterDate;
      gapEnd = now;
    }

    if (maxGap > rules.irrigation.maxAllowedGapDays) {
      const excessDays = maxGap - rules.irrigation.maxAllowedGapDays;
      const irrDelay = Math.min(7, Math.max(2, Math.round(excessDays * 0.5)));
      delayDays += irrDelay;
      flags.waterStress = true;
      adjustmentReasons.push(
        `Harvest estimate delayed by ${irrDelay} days due to water stress: irrigation gap of ${maxGap} days detected between ${gapStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} and ${gapEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      );
    } else if (irrigations.length > 0) {
      advanceDays += rules.irrigation.onScheduleAdvancementDays;
      adjustmentReasons.push(`Timely irrigation logged on schedule maintaining active crop progression.`);
    }
  } else if (irrigations.length > 0) {
    advanceDays += rules.irrigation.onScheduleAdvancementDays;
    adjustmentReasons.push(`Early irrigation on schedule promoting robust seedling establishment.`);
  }

  // 2. Fertilization
  const fertilizations = sortedActs.filter(a => a.activity_type === 'Fertilization');
  if (baseProgressPct >= rules.fertilization.expectedVegetativeCutoffPct && fertilizations.length === 0) {
    delayDays += rules.fertilization.missingFertilizationDelayDays;
    flags.nutrientRisk = true;
    adjustmentReasons.push(
      `Harvest estimate delayed by ${rules.fertilization.missingFertilizationDelayDays} days: missing expected vegetative fertilizer top-dressing.`
    );
  } else if (fertilizations.length > 0) {
    adjustmentReasons.push(`Nutrient top-dressing recorded, sustaining vigorous vegetative & grain filling canopy.`);
  }

  // 3. Pest & Disease
  const inspections = sortedActs.filter(a => a.activity_type === 'Disease Inspection');
  const sprays = sortedActs.filter(a => a.activity_type === 'Pesticide Application');

  for (const insp of inspections) {
    const text = `${insp.quantity_details || ''} ${insp.notes || ''}`.toLowerCase();
    const isThreat = text.includes('infest') || text.includes('blight') || text.includes('pest') || text.includes('borer') || text.includes('rot') || text.includes('mildew') || text.includes('armyworm') || text.includes('rust');
    if (isThreat) {
      const inspDate = new Date(insp.date);
      const hasMitigation = sprays.some(s => {
        const sDate = new Date(s.date);
        const diff = (sDate.getTime() - inspDate.getTime()) / 86400000;
        return diff >= 0 && diff <= 8;
      });

      if (!hasMitigation) {
        delayDays += rules.pestAndDisease.unmitigatedInfectionDelayDays;
        flags.pestDiseaseRisk = true;
        adjustmentReasons.push(
          `Harvest estimate delayed by ${rules.pestAndDisease.unmitigatedInfectionDelayDays} days due to unmitigated pest/disease stress noted on ${inspDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} without corrective spray.`
        );
      } else {
        adjustmentReasons.push(
          `Pest/disease inspection findings on ${inspDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} successfully mitigated by timely spray application.`
        );
      }
    }
  }

  // 4. Weeding
  const weedings = sortedActs.filter(a => a.activity_type === 'Weeding');
  if (daysSinceSowing > rules.weeding.cutoffDay && weedings.length === 0) {
    delayDays += rules.weeding.missingWeedingDelayDays;
    flags.weedCompetitionRisk = true;
    adjustmentReasons.push(
      `Harvest estimate delayed by ${rules.weeding.missingWeedingDelayDays} days due to weed competition during early canopy closure.`
    );
  } else if (weedings.length > 0) {
    adjustmentReasons.push(`Field weeding logged, minimizing resource competition.`);
  }

  // 5. Stress events
  for (const act of sortedActs) {
    const text = `${act.quantity_details || ''} ${act.notes || ''}`.toLowerCase();
    if (text.includes('drought') || text.includes('waterlogging') || text.includes('flood') || text.includes('heatwave') || text.includes('hail') || text.includes('frost')) {
      const actDate = new Date(act.date);
      const stressType = text.includes('drought') ? 'drought' : text.includes('waterlogging') || text.includes('flood') ? 'waterlogging' : 'weather stress';
      const eventDelay = stressType === 'drought' ? rules.stressEvents.droughtDelayDays : rules.stressEvents.waterloggingDelayDays;
      delayDays += eventDelay;
      flags.environmentalStress = true;
      adjustmentReasons.push(
        `Harvest estimate delayed by ${eventDelay} days due to documented ${stressType} on ${actDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      );
    }
  }

  const netShiftDays = Math.max(-3, Math.min(25, delayDays - advanceDays));
  const adjustedHarvestDate = new Date(baseHarvestDate.getTime() + netShiftDays * 86400000);
  const daysRemaining = Math.max(0, Math.ceil((adjustedHarvestDate.getTime() - now.getTime()) / 86400000));

  let effectiveDays = daysSinceSowing;
  if (netShiftDays > 0) {
    effectiveDays = Math.max(0, daysSinceSowing - Math.min(daysSinceSowing, netShiftDays * 0.7));
  } else if (netShiftDays < 0) {
    effectiveDays = daysSinceSowing + Math.abs(netShiftDays) * 0.5;
  }
  const totalAdjustedCycle = duration + netShiftDays;
  const growthPercent = Math.min(100, Math.max(0, Math.round((effectiveDays / totalAdjustedCycle) * 100)));

  const winStart = new Date(adjustedHarvestDate.getTime() - 4 * 86400000);
  const winEnd = new Date(adjustedHarvestDate.getTime() + 6 * 86400000);
  const harvestWindowRange = `${winStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  let currentGrowthStage = durationInfo.stages[0].name;
  for (let i = 0; i < durationInfo.stages.length; i++) {
    const stg = durationInfo.stages[i];
    if (growthPercent >= stg.minPct) {
      currentGrowthStage = stg.name;
    }
  }

  return {
    baseHarvestDate,
    adjustedHarvestDate,
    harvestWindowRange,
    daysRemaining,
    growthPercent,
    currentGrowthStage,
    netShiftDays,
    adjustmentReasons,
    flags
  };
}

// In-memory cache for dynamic live calculations when DB is offline
const inMemoryHarvestRecords = [];

/**
 * Determine the actual sowing date:
 * 1. Explicitly provided sowing_date
 * 2. Latest 'Sowing' activity recorded in FarmActivity DB
 * 3. Seasonal fallback based on Kharif/Rabi cycle
 */
async function resolveSowingDate(farmId, cropName, explicitDate) {
  if (explicitDate) {
    const d = new Date(explicitDate);
    if (!isNaN(d.getTime())) return d;
  }

  if (farmId && mongoose.connection.readyState === 1) {
    try {
      const sowingAct = await FarmActivity.findOne({
        farm_id: farmId,
        crop: new RegExp('^' + cropName + '$', 'i'),
        activity_type: 'Sowing'
      }).sort({ date: -1 }).lean();

      if (sowingAct && sowingAct.date) {
        const d = new Date(sowingAct.date);
        if (!isNaN(d.getTime())) return d;
      }
    } catch (e) {
      console.warn('Could not query Sowing activity:', e.message);
    }
  }

  // Also query inMemoryActivities from farmActivity module
  try {
    const farmActivityModule = require('./farmActivity');
    const inMem = farmActivityModule.inMemoryActivities || [];
    const isDemo = !farmId || ['farm_demo_1', 'farm_demo_ghaziabad', 'default_farm'].includes(farmId);
    const sowingInMem = inMem.find(a => 
      a.activity_type === 'Sowing' &&
      a.crop && a.crop.toLowerCase() === (cropName || '').toLowerCase() &&
      (!farmId || a.farm_id === farmId || (isDemo && ['farm_demo_1', 'farm_demo_ghaziabad', 'default_farm'].includes(a.farm_id)))
    );
    if (sowingInMem && sowingInMem.date) {
      const d = new Date(sowingInMem.date);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (e) {}

  // If no sowing date was ever logged, return null to let caller default to today
  return null;
}

/**
 * Generate context-aware harvest alerts from live telemetry, PHI safety, and ICAR practices
 */
async function generateDynamicHarvestAlerts({
  farmId,
  farmName,
  crop,
  daysRemaining,
  gddPct,
  gddAccumulated,
  storageMoistureTargetPct,
  weather,
  recentActivities = []
}) {
  const alerts = [];
  const now = new Date();

  // 1. CIBRC Pre-Harvest Interval (PHI) Compliance Inspection
  const pesticideActs = recentActivities.filter(a => a.activity_type === 'Pesticide Application');
  for (const act of pesticideActs) {
    const actDate = new Date(act.date);
    const daysSinceSpray = Math.floor((now.getTime() - actDate.getTime()) / 86400000);
    
    // Look up chemical in CIBRC registry
    const matchedChem = cibrcAgrochemicals.find(c =>
      act.quantity_details?.toLowerCase().includes(c.chemical_name.toLowerCase()) ||
      act.notes?.toLowerCase().includes(c.chemical_name.toLowerCase()) ||
      c.common_brands?.some(b => act.quantity_details?.toLowerCase().includes(b.toLowerCase()) || act.notes?.toLowerCase().includes(b.toLowerCase()))
    );

    const phiDays = matchedChem ? matchedChem.phi_days : 14;
    const remainingPhi = phiDays - daysSinceSpray;

    if (remainingPhi > 0 && daysRemaining <= remainingPhi) {
      alerts.push({
        id: 'alert_phi_' + act.activity_id,
        type: 'danger',
        severity: 'Critical',
        category: 'CIBRC Food Safety',
        title: `⚠️ Pre-Harvest Interval (PHI) Restriction Active`,
        description: `${matchedChem ? matchedChem.chemical_name : 'Agrochemical'} spray on ${actDate.toLocaleDateString()} requires ${phiDays}-day waiting period (${remainingPhi}d remaining). Premature harvest violates safety limits.`,
        actionRequired: `Do not harvest prior to ${new Date(actDate.getTime() + phiDays * 86400000).toLocaleDateString()}. Comply with CIBRC MRL standards.`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Weather & Precipitation Risk during Harvest Window
  if (weather) {
    if (weather.rainfall_mm > 5 || weather.precipitation_probability > 50) {
      alerts.push({
        id: 'alert_weather_precip',
        type: 'warning',
        severity: 'Moderate',
        category: 'Agro-Meteorological Risk',
        title: `🌧️ Precipitation Forecast in Harvest Vicinity`,
        description: `Live telemetry detects ${weather.rainfall_mm}mm rain (${weather.precipitation_probability}% probability). Wet crop cutting leads to shattering and grain rot.`,
        actionRequired: 'Postpone combine operations until foliage dries and field ground bearing capacity recovers.',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 3. Maturation & Harvest Window Status Alert
  if (gddPct >= 90 || daysRemaining <= 5) {
    alerts.push({
      id: 'alert_harvest_ready',
      type: 'success',
      severity: 'Immediate',
      category: 'Harvest Window',
      title: `🌾 ${crop} Reached Physiological Maturation`,
      description: `Crop has achieved ${gddPct}% thermal maturity (${gddAccumulated} GDD). Optimal combine readiness window is OPEN now.`,
      actionRequired: `Verify grain moisture is near target (${storageMoistureTargetPct}%) and deploy harvest machinery.`,
      timestamp: new Date().toISOString()
    });
  } else if (gddPct >= 65 || daysRemaining <= 25) {
    alerts.push({
      id: 'alert_harvest_approaching',
      type: 'warning',
      severity: 'Approaching',
      category: 'Harvest Window',
      title: `⏳ ${crop} Approaching Maturity Window`,
      description: `Crop has accumulated ${gddAccumulated} GDD (${gddPct}% of threshold). Harvest estimated in ~${daysRemaining} days.`,
      actionRequired: 'Inspect field moisture, pre-book harvesting equipment, and procure storage bags.',
      timestamp: new Date().toISOString()
    });
  } else {
    alerts.push({
      id: 'alert_vegetative_growth',
      type: 'info',
      severity: 'Normal',
      category: 'Crop Phenology',
      title: `🌱 ${crop} in Active Vegetative / Reproductive Stage`,
      description: `Current GDD accumulation is ${gddAccumulated} (${gddPct}%). Maturation is on a healthy trajectory.`,
      actionRequired: 'Maintain recommended nutrient split and scheduled soil moisture checks.',
      timestamp: new Date().toISOString()
    });
  }

  // 4. ICAR Water Management / Drainage Guideline
  const cropLower = String(crop).toLowerCase();
  if (cropLower.includes('rice') || cropLower.includes('paddy')) {
    if (daysRemaining <= 15 && daysRemaining > 0) {
      alerts.push({
        id: 'alert_drainage_rice',
        type: 'info',
        severity: 'Action Required',
        category: 'ICAR Package of Practices',
        title: `💧 Field Drainage Recommended (Rice PoP)`,
        description: 'Per ICAR guidelines, standing water must be drained 10-14 days prior to harvest to promote uniform ripening and enable combine tractor traffic.',
        actionRequired: 'Open field drainage outlets and cease canal flooding.',
        timestamp: new Date().toISOString()
      });
    }
  }

  return alerts;
}

/**
 * CORE LIVE HARVEST ENGINE:
 * Calculates authentic live GDD, phenological phases, days remaining, ML yield, and storage specs
 */
async function computeLiveHarvestPlan(rawParams = {}) {
  const farmId = rawParams.farmId || rawParams.farm_id || 'default_farm';
  const farmName = rawParams.farmName || rawParams.farm_name || 'Green Valley Farm';
  const crop = rawParams.crop || 'Rice';
  const areaHa = Number(rawParams.areaHectares || rawParams.area_hectares) || 2.5;
  const lat = Number(rawParams.latitude) || 28.6692;
  const lon = Number(rawParams.longitude) || 77.4538;
  const state = rawParams.state || 'Uttar Pradesh';
  const district = rawParams.district || 'Ghaziabad';
  const sowingDateStr = rawParams.sowingDateStr || rawParams.sowing_date;
  const manualHarvestDateStr = rawParams.manualHarvestDateStr || rawParams.manual_harvest_date;
  const varietyOrNotes = rawParams.variety || rawParams.notes || '';

  const spec = getCropSpec(crop);
  const durationInfo = resolveCropDuration(crop, varietyOrNotes);
  const cropDurationDays = durationInfo.durationDays;

  // 1. Resolve true sowing date
  const resolvedSowing = await resolveSowingDate(farmId, crop, sowingDateStr);
  const sowingDate = resolvedSowing || new Date();
  const now = new Date();
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - sowingDate.getTime()) / 86400000));

  // Retrieve field activity log for this crop cycle
  let cycleActivities = Array.isArray(rawParams.activities) ? rawParams.activities : [];
  if (cycleActivities.length === 0 && farmId && mongoose.connection.readyState === 1) {
    try {
      cycleActivities = await FarmActivity.find({ farm_id: farmId, crop: new RegExp('^' + crop + '$', 'i') })
        .sort({ date: -1 })
        .lean();
    } catch (e) {}
  }
  if (cycleActivities.length === 0) {
    try {
      const farmActivityModule = require('./farmActivity');
      const inMem = farmActivityModule.inMemoryActivities || [];
      const isDemo = !farmId || ['farm_demo_1', 'farm_demo_ghaziabad', 'default_farm'].includes(farmId);
      cycleActivities = inMem.filter(a => 
        a.crop && a.crop.toLowerCase() === (crop || '').toLowerCase() &&
        (!farmId || a.farm_id === farmId || (isDemo && ['farm_demo_1', 'farm_demo_ghaziabad', 'default_farm'].includes(a.farm_id)))
      );
    } catch (e) {}
  }

  // Activity-aware adjustment calculation: growthPercent = f(daysSinceSowing, cropDurationDays, activities)
  const adjustments = calculateBackendActivityAdjustments(
    crop,
    cropDurationDays,
    sowingDate,
    cycleActivities,
    now,
    varietyOrNotes
  );

  // Harvest date & window with activity adjustments
  const baseHarvestDate = adjustments.baseHarvestDate;
  const expHarvestDate = manualHarvestDateStr ? new Date(manualHarvestDateStr) : adjustments.adjustedHarvestDate;
  const daysRemaining = Math.max(0, Math.ceil((expHarvestDate.getTime() - now.getTime()) / 86400000));
  const durationProgressPct = adjustments.growthPercent;

  // 2. Fetch live weather & real GDD in parallel
  const [liveWeather, realGddData] = await Promise.all([
    fetchLiveWeather(lat, lon),
    calculateRealGDD(lat, lon, sowingDate, crop)
  ]);

  const weather = liveWeather || {
    temperature_c: 28,
    rainfall_mm: 5,
    humidity_pct: 70,
    soil_moisture_pct: 35,
    precipitation_probability: 20,
    source: 'Default Agroclimatic Benchmark'
  };

  // Authentic GDD
  let gddAccumulated = 0;
  if (realGddData && realGddData.gdd > 0) {
    gddAccumulated = realGddData.gdd;
  } else {
    // Dynamic calculation from daily degree days
    const dailyGdd = Math.max(0, weather.temperature_c - spec.baseTemp);
    gddAccumulated = Math.round(dailyGdd * daysElapsed);
  }

  const gddPercentage = durationProgressPct;

  // 3. Harvest Window
  const winStart = new Date(expHarvestDate.getTime() - (durationProgressPct >= 100 ? 2 : 5) * 86400000);
  const winEnd = new Date(expHarvestDate.getTime() + (durationProgressPct >= 100 ? 5 : 10) * 86400000);
  const harvestWindow = durationProgressPct >= 100
    ? `Ready Now (Optimal through ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    : `${winStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // 4. Status Determination
  let status = 'Not Ready';
  if (durationProgressPct >= 95 || daysRemaining <= 3) {
    status = 'Harvest Ready';
  } else if (durationProgressPct >= 70 || daysRemaining <= 20) {
    status = 'Approaching';
  } else {
    status = 'Not Ready';
  }

  // 5. Phenological Stage Determination & Projection Breakdown using duration percentages
  let currentGrowthStage = durationInfo.stages[0].name;
  for (let i = 0; i < durationInfo.stages.length; i++) {
    const stg = durationInfo.stages[i];
    if (durationProgressPct >= stg.minPct) {
      currentGrowthStage = stg.name;
    }
  }

  // Stage-by-stage progression for Recharts BarChart
  const stageProjection = durationInfo.stages.map((stg) => {
    const stageSpan = Math.max(1, stg.maxPct - stg.minPct);
    let progress = 0;

    if (durationProgressPct >= stg.maxPct) {
      progress = 100;
    } else if (durationProgressPct <= stg.minPct) {
      progress = 0;
    } else {
      progress = Math.round(((durationProgressPct - stg.minPct) / stageSpan) * 100);
    }

    const label = progress >= 100 ? 'Completed' : progress > 0 ? 'Current' : 'Upcoming';
    return {
      stage: stg.name,
      progress,
      label,
      targetGddPct: stg.maxPct
    };
  });

  // 6. ML / Benchmark Yield Estimation
  let predictedYieldTha = spec.baseYield;
  let yieldConfidence = 'High';
  try {
    const yPred = await predictCropYield({
      crop,
      farm_area_ha: areaHa,
      temperature_c: weather.temperature_c,
      rainfall_mm: weather.rainfall_mm,
      humidity_pct: weather.humidity_pct,
      soil_moisture_pct: weather.soil_moisture_pct,
      soil_ph: 6.8,
      soil_n: 180,
      soil_p: 22,
      soil_k: 240,
      gdd: gddAccumulated,
      state,
      district
    });
    if (yPred && yPred.predictedYieldPerHectare) {
      predictedYieldTha = yPred.predictedYieldPerHectare;
      yieldConfidence = yPred.confidenceLevel || 'High';
    }
  } catch (err) {
    console.warn('Yield prediction fallback to ICAR baseline:', err.message);
  }

  const totalProductionTons = Number((predictedYieldTha * areaHa).toFixed(2));
  const requiredLabour = Math.ceil(spec.workersPerHa * areaHa);
  const storageBagsCount = Math.ceil(totalProductionTons * 20); // 50kg bags
  const storageRequirementSqft = Math.ceil(totalProductionTons * 15); // ~15 sq ft per ton
  const storageMoistureTargetPct = spec.moistureTarget;

  // 7. Recent activities for PHI check
  let recentActivities = [];
  if (farmId && mongoose.connection.readyState === 1) {
    try {
      recentActivities = await FarmActivity.find({ farm_id: farmId, crop: new RegExp('^' + crop + '$', 'i') })
        .sort({ date: -1 })
        .limit(10)
        .lean();
    } catch (e) {}
  }

  // 8. Generate dynamic alerts
  const alerts = await generateDynamicHarvestAlerts({
    farmId,
    farmName,
    crop,
    daysRemaining,
    gddPct: gddPercentage,
    gddAccumulated,
    storageMoistureTargetPct,
    weather,
    recentActivities
  });

  if (durationInfo.isEstimated) {
    alerts.unshift({
      id: 'alert_crop_duration_estimate',
      type: 'info',
      severity: 'Guideline',
      category: 'Crop Duration Model',
      title: `ℹ️ Standard Benchmark Duration Applied (${cropDurationDays}d)`,
      description: `Crop duration benchmarked at standard ${cropDurationDays} days. Log specific variety in activity notes for hybrid-calibrated duration.`,
      actionRequired: 'Record hybrid seed details in Sowing activity notes to refine precision.',
      timestamp: new Date().toISOString()
    });
  }

  if (adjustments.flags.waterStress) {
    alerts.push({
      id: 'alert_water_stress',
      type: 'warning',
      severity: 'Moderate',
      category: 'Irrigation Deficit',
      title: '⚠️ Soil Water Stress Detected',
      description: 'Extended irrigation interval has induced moisture stress, delaying maturity trajectory.',
      actionRequired: 'Provide immediate supplemental irrigation to stabilize grain filling.',
      timestamp: new Date().toISOString()
    });
  }
  if (adjustments.flags.pestDiseaseRisk) {
    alerts.push({
      id: 'alert_pest_unmitigated',
      type: 'danger',
      severity: 'Critical',
      category: 'Crop Health',
      title: '⚠️ Unmitigated Pest/Disease Impact',
      description: 'Pest infestation was observed without recorded corrective spray, shifting harvest timeline.',
      actionRequired: 'Inspect crop immediately and deploy recommended biocontrol / agrochemical spray.',
      timestamp: new Date().toISOString()
    });
  }

  return {
    farm_id: farmId,
    farm_name: farmName,
    crop,
    variety_name: durationInfo.varietyName,
    crop_duration_days: cropDurationDays,
    is_estimated_duration: durationInfo.isEstimated,
    duration_range: durationInfo.durationRange,
    area_hectares: areaHa,
    sowing_date: sowingDate.toISOString(),
    days_elapsed: daysElapsed,
    growth_stage: currentGrowthStage,
    base_harvest_date: baseHarvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    expected_harvest_date: expHarvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    manual_harvest_date: manualHarvestDateStr ? new Date(manualHarvestDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    harvest_window: harvestWindow,
    net_shift_days: adjustments.netShiftDays,
    adjustment_reasons: adjustments.adjustmentReasons,
    activity_flags: adjustments.flags,
    status,
    days_to_harvest: daysRemaining,
    gdd_accumulated: gddAccumulated,
    gdd_threshold: spec.gddThreshold,
    gdd_percentage: gddPercentage,
    predicted_yield_tha: predictedYieldTha,
    total_production_tons: totalProductionTons,
    yield_confidence: yieldConfidence,
    required_labour: requiredLabour,
    storage_requirement_sqft: storageRequirementSqft,
    storage_bags_count: storageBagsCount,
    storage_moisture_target_pct: storageMoistureTargetPct,
    machinery_recommendation: spec.machineryRecommendation,
    phenological_stages: stageProjection,
    strategy_advice: spec.strategyAdvice,
    weather_telemetry: weather,
    alerts,
    updated_at: new Date().toISOString()
  };
}

// ==========================================
// ROUTES
// ==========================================

/**
 * POST /api/harvest-management/live-plan
 * Real-time dynamic harvest calculation with live weather, GDD, and ML yield
 */
router.post('/live-plan', optionalAuth, async (req, res) => {
  try {
    const plan = await computeLiveHarvestPlan(req.body || {});
    return res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Error generating live harvest plan:', error);
    return res.status(500).json({ success: false, error: 'Failed to compute live harvest plan: ' + error.message });
  }
});

/**
 * GET /api/harvest-management/live-plan
 * Support query parameters for live harvest planning
 */
router.get('/live-plan', optionalAuth, async (req, res) => {
  try {
    const {
      farm_id,
      farm_name,
      crop,
      area_hectares,
      latitude,
      longitude,
      state,
      district,
      sowing_date,
      manual_harvest_date
    } = req.query;

    const plan = await computeLiveHarvestPlan({
      farmId: farm_id,
      farmName: farm_name,
      crop,
      areaHectares: area_hectares,
      latitude,
      longitude,
      state,
      district,
      sowingDateStr: sowing_date,
      manualHarvestDateStr: manual_harvest_date
    });
    return res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Error fetching live harvest plan:', error);
    return res.status(500).json({ success: false, error: 'Failed to compute live harvest plan: ' + error.message });
  }
});

/**
 * GET /api/harvest-management - Get harvest tracking record(s)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { farm_id, crop, latitude, longitude, area_hectares } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};
      if (farm_id) filter.farm_id = farm_id;
      if (crop) filter.crop = new RegExp('^' + crop + '$', 'i');

      const records = await HarvestRecord.find(filter).sort({ updated_at: -1 }).lean();
      if (records.length > 0) {
        return res.json({ success: true, count: records.length, data: records });
      }
    }

    // Dynamic calculation fallback when no record is saved yet
    const plan = await computeLiveHarvestPlan({
      farmId: farm_id,
      crop: crop || 'Rice',
      areaHectares: area_hectares,
      latitude,
      longitude
    });

    const fallbackRecord = {
      harvest_id: 'harv_' + (farm_id || 'demo') + '_' + (crop || 'Rice'),
      farm_id: farm_id || 'default_farm',
      field_name: plan.farm_name,
      crop: plan.crop,
      area_hectares: plan.area_hectares,
      predicted_yield_tha: plan.predicted_yield_tha,
      expected_production_tons: plan.total_production_tons,
      current_gdd: plan.gdd_accumulated,
      growth_stage: plan.growth_stage,
      sowing_date: plan.sowing_date,
      expected_harvest_date: plan.expected_harvest_date,
      manual_harvest_date: plan.manual_harvest_date,
      harvest_window: plan.harvest_window,
      status: plan.status,
      notes: `Optimal harvest window for ${plan.crop}. Target grain moisture: ${plan.storage_moisture_target_pct}%.`,
      required_labour: plan.required_labour,
      storage_requirement_sqft: plan.storage_requirement_sqft,
      storage_bags_count: plan.storage_bags_count,
      storage_moisture_target_pct: plan.storage_moisture_target_pct,
      updated_at: plan.updated_at
    };

    return res.json({ success: true, count: 1, data: [fallbackRecord], fallback: true });

  } catch (error) {
    console.error('Error fetching harvest records:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch harvest records: ' + error.message });
  }
});

/**
 * POST /api/harvest-management - Save or update harvest tracking record
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      farm_id = 'default_farm',
      field_name = 'Farm Field',
      crop,
      area_hectares = 2.5,
      predicted_yield_tha,
      expected_production_tons,
      current_gdd = 0,
      growth_stage = 'Vegetative',
      sowing_date,
      expected_harvest_date,
      manual_harvest_date = null,
      harvest_window = '',
      status = 'Not Ready',
      notes = '',
      required_labour,
      storage_requirement_sqft,
      storage_bags_count,
      storage_moisture_target_pct
    } = req.body;

    if (!crop) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: crop'
      });
    }

    const area = Number(area_hectares) || 2.5;
    const yieldPerHa = predicted_yield_tha !== undefined ? Number(predicted_yield_tha) : 4.2;
    const totalProd = expected_production_tons !== undefined ? Number(expected_production_tons) : Number((yieldPerHa * area).toFixed(2));
    const harvestId = 'harv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const recordData = {
      harvest_id: harvestId,
      farm_id,
      field_name: field_name.trim(),
      crop: crop.trim(),
      area_hectares: area,
      predicted_yield_tha: yieldPerHa,
      expected_production_tons: totalProd,
      current_gdd: Number(current_gdd) || 0,
      growth_stage,
      sowing_date: sowing_date ? new Date(sowing_date) : null,
      expected_harvest_date: expected_harvest_date ? new Date(expected_harvest_date) : new Date(Date.now() + 60 * 86400000),
      manual_harvest_date: manual_harvest_date ? new Date(manual_harvest_date) : null,
      harvest_window,
      status,
      notes: notes.trim(),
      required_labour: Number(required_labour) || Math.ceil(area * 5),
      storage_requirement_sqft: Number(storage_requirement_sqft) || Math.ceil(totalProd * 15),
      storage_bags_count: Number(storage_bags_count) || Math.ceil(totalProd * 20),
      storage_moisture_target_pct: Number(storage_moisture_target_pct) || 13.5,
      updated_at: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const record = await HarvestRecord.findOneAndUpdate(
        { farm_id, crop: crop.trim() },
        { $set: recordData },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, message: 'Harvest record updated successfully', data: record });
    }

    // In-memory update
    const idx = inMemoryHarvestRecords.findIndex(r => r.farm_id === farm_id && r.crop.toLowerCase() === crop.toLowerCase());
    const formattedData = {
      ...recordData,
      sowing_date: recordData.sowing_date ? recordData.sowing_date.toISOString() : null,
      expected_harvest_date: recordData.expected_harvest_date.toISOString(),
      manual_harvest_date: recordData.manual_harvest_date ? recordData.manual_harvest_date.toISOString() : null,
      updated_at: recordData.updated_at.toISOString()
    };

    if (idx !== -1) {
      inMemoryHarvestRecords[idx] = formattedData;
    } else {
      inMemoryHarvestRecords.unshift(formattedData);
    }

    return res.status(200).json({ success: true, message: 'Harvest record updated successfully', data: formattedData, fallback: true });

  } catch (error) {
    console.error('Error saving harvest record:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save harvest record: ' + error.message 
    });
  }
});

/**
 * GET /api/harvest-management/alerts - Fetch active context-aware harvest alerts
 */
router.get('/alerts', optionalAuth, async (req, res) => {
  try {
    const { farm_id, crop, latitude, longitude } = req.query;

    const plan = await computeLiveHarvestPlan({
      farmId: farm_id,
      crop: crop || 'Rice',
      latitude,
      longitude
    });

    return res.json({ success: true, count: plan.alerts.length, data: plan.alerts });
  } catch (error) {
    console.error('Error fetching harvest alerts:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

router.computeLiveHarvestPlan = computeLiveHarvestPlan;
router.calculateBackendActivityAdjustments = calculateBackendActivityAdjustments;
router.resolveCropDuration = resolveCropDuration;

module.exports = router;
