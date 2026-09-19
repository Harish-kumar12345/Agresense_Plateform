/**
 * Crop Stage Rules & Duration Reference System
 * Standard agronomic reference for crop durations, varieties, phenological stages, and activity adjustments.
 */

export interface CropVarietyInfo {
  name: string;
  durationDays: number;
  range: [number, number];
}

export interface PhenologicalStageDef {
  name: string;
  minPct: number;
  maxPct: number;
}

export interface CropRuleDefinition {
  defaultDurationDays: number;
  varieties?: Record<string, CropVarietyInfo>;
  stages: PhenologicalStageDef[];
  gddThreshold: number;
  baseTemp: number;
}

export interface CropDurationLookupResult {
  cropName: string;
  varietyName: string;
  durationDays: number;
  durationRange: [number, number];
  isEstimated: boolean;
  stages: PhenologicalStageDef[];
}

export interface ActivityAdjustmentRules {
  irrigation: {
    optimalIntervalDays: number;
    maxAllowedGapDays: number;
    gapDelayPerWeek: number;
    onScheduleAdvancementDays: number;
  };
  fertilization: {
    expectedVegetativeCutoffPct: number;
    missingFertilizationDelayDays: number;
  };
  pestAndDisease: {
    unmitigatedInfectionDelayDays: number;
    sprayMitigationDaysRecovered: number;
  };
  weeding: {
    cutoffDay: number;
    missingWeedingDelayDays: number;
  };
  stressEvents: {
    droughtDelayDays: number;
    waterloggingDelayDays: number;
    diseaseDelayDays: number;
    heatwaveDelayDays: number;
    generalStressDelayDays: number;
  };
}

export const DEFAULT_CROP_DURATION_DAYS = 105;

export const DEFAULT_STAGE_DISTRIBUTION: PhenologicalStageDef[] = [
  { name: 'Germination & Emergence', minPct: 0, maxPct: 10 },
  { name: 'Vegetative Growth', minPct: 10, maxPct: 50 },
  { name: 'Flowering / Reproductive', minPct: 50, maxPct: 70 },
  { name: 'Grain Filling / Maturation', minPct: 70, maxPct: 90 },
  { name: 'Physiological Maturity / Harvest', minPct: 90, maxPct: 100 }
];

export const CROP_STAGE_RULES: Record<string, CropRuleDefinition> = {
  Maize: {
    defaultDurationDays: 105,
    varieties: {
      short: { name: 'Short Duration Hybrids (Early Maturity)', durationDays: 85, range: [80, 90] },
      medium: { name: 'Medium Duration Hybrids (Standard)', durationDays: 105, range: [95, 115] },
      long: { name: 'Long Duration Varieties (Late Maturity)', durationDays: 130, range: [120, 140] }
    },
    stages: [
      { name: 'Germination & Seedling Emergence (VE-V2)', minPct: 0, maxPct: 10 },
      { name: 'Vegetative Growth & Knee-High (V3-V12)', minPct: 10, maxPct: 50 },
      { name: 'Flowering: Tasseling & Silking (VT-R1)', minPct: 50, maxPct: 70 },
      { name: 'Grain Filling: Milk & Dough (R2-R4)', minPct: 70, maxPct: 90 },
      { name: 'Physiological Maturity / Black Layer (R6)', minPct: 90, maxPct: 100 }
    ],
    gddThreshold: 1500,
    baseTemp: 10
  },
  Rice: {
    defaultDurationDays: 120,
    varieties: {
      short: { name: 'Short Duration / Semi-Dwarf Early', durationDays: 95, range: [90, 105] },
      medium: { name: 'Medium Duration (Standard)', durationDays: 120, range: [115, 130] },
      long: { name: 'Long Duration / Traditional Late', durationDays: 140, range: [135, 155] }
    },
    stages: [
      { name: 'Nursery & Seedling Emergence', minPct: 0, maxPct: 10 },
      { name: 'Active Tillering & Stem Elongation', minPct: 10, maxPct: 50 },
      { name: 'Panicle Initiation & Flowering', minPct: 50, maxPct: 70 },
      { name: 'Grain Filling & Dough', minPct: 70, maxPct: 90 },
      { name: 'Physiological Maturity & Golden Ripe', minPct: 90, maxPct: 100 }
    ],
    gddThreshold: 1600,
    baseTemp: 10
  },
  Wheat: {
    defaultDurationDays: 110,
    varieties: {
      short: { name: 'Short Duration / Late-Sown Varieties', durationDays: 95, range: [90, 100] },
      medium: { name: 'Timely Sown Standard Varieties', durationDays: 110, range: [105, 120] },
      long: { name: 'Long Duration / Rainfed Winter Types', durationDays: 125, range: [120, 135] }
    },
    stages: [
      { name: 'Germination & Crown Root Initiation (CRI)', minPct: 0, maxPct: 12 },
      { name: 'Tillering & Stem Jointing', minPct: 12, maxPct: 48 },
      { name: 'Booting, Heading & Anthesis', minPct: 48, maxPct: 68 },
      { name: 'Milk & Soft Dough Filling', minPct: 68, maxPct: 88 },
      { name: 'Hard Dough & Golden Maturity', minPct: 88, maxPct: 100 }
    ],
    gddThreshold: 1400,
    baseTemp: 5
  },
  Cotton: {
    defaultDurationDays: 160,
    varieties: {
      short: { name: 'Early Bt Cotton Hybrids', durationDays: 145, range: [140, 150] },
      medium: { name: 'Medium Bt Hybrids', durationDays: 160, range: [155, 170] },
      long: { name: 'Long Duration Cotton', durationDays: 180, range: [175, 195] }
    },
    stages: [
      { name: 'Seedling Emergence', minPct: 0, maxPct: 10 },
      { name: 'Vegetative Branching & Square Formation', minPct: 10, maxPct: 45 },
      { name: 'Flowering & Early Boll Setting', minPct: 45, maxPct: 70 },
      { name: 'Boll Maturation & Fiber Development', minPct: 70, maxPct: 90 },
      { name: 'Boll Bursting & Fluff Opening', minPct: 90, maxPct: 100 }
    ],
    gddThreshold: 2200,
    baseTemp: 15
  },
  Potato: {
    defaultDurationDays: 85,
    varieties: {
      short: { name: 'Early (e.g. Kufri Pukhraj)', durationDays: 75, range: [70, 80] },
      medium: { name: 'Medium (e.g. Kufri Jyoti)', durationDays: 85, range: [80, 95] },
      long: { name: 'Late (e.g. Kufri Sindhuri)', durationDays: 105, range: [100, 115] }
    },
    stages: [
      { name: 'Sprout Emergence', minPct: 0, maxPct: 12 },
      { name: 'Vegetative Canopy Development', minPct: 12, maxPct: 40 },
      { name: 'Tuber Initiation & Flowering', minPct: 40, maxPct: 65 },
      { name: 'Tuber Bulking', minPct: 65, maxPct: 90 },
      { name: 'Dehaulming & Skin Curing', minPct: 90, maxPct: 100 }
    ],
    gddThreshold: 1250,
    baseTemp: 7
  },
  Tomato: {
    defaultDurationDays: 85,
    varieties: {
      short: { name: 'Determinate Hybrids', durationDays: 75, range: [70, 80] },
      medium: { name: 'Semi-determinate Commercial', durationDays: 85, range: [80, 95] },
      long: { name: 'Indeterminate Greenhouse/Trellised', durationDays: 110, range: [100, 125] }
    },
    stages: [
      { name: 'Transplant Establishment', minPct: 0, maxPct: 12 },
      { name: 'Vegetative Branching', minPct: 12, maxPct: 42 },
      { name: 'Flowering & Fruit Set', minPct: 42, maxPct: 68 },
      { name: 'Mature Green & Sizing', minPct: 68, maxPct: 88 },
      { name: 'Breaker & Ripe Picking', minPct: 88, maxPct: 100 }
    ],
    gddThreshold: 1350,
    baseTemp: 10
  },
  Mustard: {
    defaultDurationDays: 105,
    varieties: {
      short: { name: 'Early Mustard (e.g. Pusa Bold)', durationDays: 95, range: [90, 100] },
      medium: { name: 'Medium (e.g. RH-749, Varuna)', durationDays: 105, range: [100, 115] },
      long: { name: 'Late (e.g. Kranti)', durationDays: 120, range: [115, 130] }
    },
    stages: [
      { name: 'Germination & Seedling', minPct: 0, maxPct: 10 },
      { name: 'Rosette & Vegetative Branching', minPct: 10, maxPct: 45 },
      { name: 'Flowering & Pod Formation', minPct: 45, maxPct: 70 },
      { name: 'Seed Development & Pod Filling', minPct: 70, maxPct: 90 },
      { name: 'Siliqua Browning & Seed Hardening', minPct: 90, maxPct: 100 }
    ],
    gddThreshold: 1300,
    baseTemp: 5
  },
  Soybean: {
    defaultDurationDays: 95,
    varieties: {
      short: { name: 'Early Maturity (JS 95-60)', durationDays: 85, range: [80, 90] },
      medium: { name: 'Medium Maturity (JS 335, JS 20-29)', durationDays: 95, range: [90, 105] },
      long: { name: 'Late Maturity (NRC 37)', durationDays: 110, range: [105, 120] }
    },
    stages: [
      { name: 'Emergence & Unifoliate (VE-VC)', minPct: 0, maxPct: 10 },
      { name: 'Vegetative Trifoliate (V1-V4)', minPct: 10, maxPct: 45 },
      { name: 'Flowering & Pod Initiation (R1-R3)', minPct: 45, maxPct: 68 },
      { name: 'Pod Filling & Seed Enlargement (R5-R6)', minPct: 68, maxPct: 88 },
      { name: 'Leaf Yellowing & Pod Maturity (R7-R8)', minPct: 88, maxPct: 100 }
    ],
    gddThreshold: 1350,
    baseTemp: 10
  },
  Groundnut: {
    defaultDurationDays: 115,
    varieties: {
      short: { name: 'Spanish Bunch (Early)', durationDays: 100, range: [95, 105] },
      medium: { name: 'Semi-Spreading (Medium)', durationDays: 115, range: [110, 125] },
      long: { name: 'Virginia Runner (Late)', durationDays: 135, range: [130, 145] }
    },
    stages: [
      { name: 'Emergence & Seedling', minPct: 0, maxPct: 10 },
      { name: 'Vegetative Branching & Canopy', minPct: 10, maxPct: 42 },
      { name: 'Flowering & Peg Initiation', minPct: 42, maxPct: 65 },
      { name: 'Pod Development & Kernel Filling', minPct: 65, maxPct: 88 },
      { name: 'Pod Maturation & Shell Hardening', minPct: 88, maxPct: 100 }
    ],
    gddThreshold: 1500,
    baseTemp: 10
  },
  Chickpea: {
    defaultDurationDays: 105,
    varieties: {
      short: { name: 'Desi Early (JG 14)', durationDays: 90, range: [85, 95] },
      medium: { name: 'Desi / Kabuli Standard', durationDays: 105, range: [100, 115] },
      long: { name: 'Kabuli Large Seeded Late', durationDays: 120, range: [115, 130] }
    },
    stages: [
      { name: 'Emergence & Seedling Establishment', minPct: 0, maxPct: 12 },
      { name: 'Vegetative Branching', minPct: 12, maxPct: 46 },
      { name: 'Flowering & Podding', minPct: 46, maxPct: 70 },
      { name: 'Grain Filling & Pod Development', minPct: 70, maxPct: 90 },
      { name: 'Physiological Maturity & Dryness', minPct: 90, maxPct: 100 }
    ],
    gddThreshold: 1350,
    baseTemp: 7
  },
  Bajra: {
    defaultDurationDays: 85,
    varieties: {
      short: { name: 'Early Hybrids', durationDays: 75, range: [70, 80] },
      medium: { name: 'Standard Hybrids', durationDays: 85, range: [80, 92] },
      long: { name: 'Dual Purpose Late', durationDays: 98, range: [95, 105] }
    },
    stages: [
      { name: 'Emergence & Seedling', minPct: 0, maxPct: 12 },
      { name: 'Tillering & Stem Elongation', minPct: 12, maxPct: 48 },
      { name: 'Booting & Panicle Emergence', minPct: 48, maxPct: 68 },
      { name: 'Grain Development & Dough', minPct: 68, maxPct: 88 },
      { name: 'Maturity & Harvest', minPct: 88, maxPct: 100 }
    ],
    gddThreshold: 1300,
    baseTemp: 10
  }
};

export const ADJUSTMENT_RULES: ActivityAdjustmentRules = {
  irrigation: {
    optimalIntervalDays: 12,
    maxAllowedGapDays: 18,
    gapDelayPerWeek: 3,
    onScheduleAdvancementDays: 1
  },
  fertilization: {
    expectedVegetativeCutoffPct: 45,
    missingFertilizationDelayDays: 3
  },
  pestAndDisease: {
    unmitigatedInfectionDelayDays: 5,
    sprayMitigationDaysRecovered: 3
  },
  weeding: {
    cutoffDay: 40,
    missingWeedingDelayDays: 2
  },
  stressEvents: {
    droughtDelayDays: 5,
    waterloggingDelayDays: 4,
    diseaseDelayDays: 4,
    heatwaveDelayDays: 3,
    generalStressDelayDays: 3
  }
};

/**
 * Resolve crop duration and stage definitions from crop name and optional variety/activity notes.
 */
export function lookupCropDuration(cropName?: string, varietyOrNotes?: string): CropDurationLookupResult {
  if (!cropName) {
    return {
      cropName: 'Generic Crop',
      varietyName: 'Standard (Default Estimate)',
      durationDays: DEFAULT_CROP_DURATION_DAYS,
      durationRange: [95, 115],
      isEstimated: true,
      stages: DEFAULT_STAGE_DISTRIBUTION
    };
  }

  const cleanCrop = cropName.trim();
  const matchedKey = Object.keys(CROP_STAGE_RULES).find(
    k => k.toLowerCase() === cleanCrop.toLowerCase() ||
         cleanCrop.toLowerCase().includes(k.toLowerCase()) ||
         k.toLowerCase().includes(cleanCrop.toLowerCase())
  );

  if (!matchedKey) {
    return {
      cropName: cleanCrop,
      varietyName: 'Standard (Default Benchmark)',
      durationDays: DEFAULT_CROP_DURATION_DAYS,
      durationRange: [95, 115],
      isEstimated: true,
      stages: DEFAULT_STAGE_DISTRIBUTION
    };
  }

  const rule = CROP_STAGE_RULES[matchedKey];
  let chosenDuration = rule.defaultDurationDays;
  let chosenVariety = 'Medium / Standard';
  let chosenRange: [number, number] = [chosenDuration - 10, chosenDuration + 10];

  if (rule.varieties && varietyOrNotes) {
    const text = varietyOrNotes.toLowerCase();
    if (text.includes('short') || text.includes('early') || text.includes('hybrid early') || text.includes('quick') || text.includes('pioneer 3396') || text.includes('dkc 9108') || text.includes('pusa bold') || text.includes('pukhraj')) {
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
    stages: rule.stages || DEFAULT_STAGE_DISTRIBUTION
  };
}

/**
 * Identify the current phenological growth stage based on calculated progress percentage (0 - 100%)
 */
export function getPhenologicalStage(progressPct: number, stages: PhenologicalStageDef[] = DEFAULT_STAGE_DISTRIBUTION): string {
  const pct = Math.max(0, Math.min(100, progressPct));
  for (let i = 0; i < stages.length; i++) {
    const stg = stages[i];
    if (pct >= stg.minPct && (pct < stg.maxPct || (i === stages.length - 1 && pct >= stg.maxPct))) {
      return stg.name;
    }
  }
  return stages[stages.length - 1]?.name || 'Physiological Maturity / Harvest';
}

export interface MinimalFarmActivity {
  activity_id?: string;
  activity_type: string;
  date: string;
  quantity_details?: string;
  notes?: string;
}

export interface ActivityAdjustmentResult {
  baseHarvestDate: Date;
  adjustedHarvestDate: Date;
  harvestWindowRange: string;
  daysRemaining: number;
  growthPercent: number;
  currentGrowthStage: string;
  netShiftDays: number;
  adjustmentReasons: string[];
  flags: {
    waterStress: boolean;
    nutrientRisk: boolean;
    pestDiseaseRisk: boolean;
    weedCompetitionRisk: boolean;
    environmentalStress: boolean;
  };
}

/**
 * Calculate dynamic activity-aware growth progress and harvest date adjustments.
 * Evaluates field activities (irrigation, fertilization, spraying, weeding, stress events)
 * against agronomic thresholds and computes calibrated harvest range and physiological progress.
 */
export function calculateActivityAdjustments(
  cropName: string,
  cropDurationDays: number,
  sowingDate: Date,
  activities: MinimalFarmActivity[] = [],
  now: Date = new Date(),
  varietyOrNotes?: string
): ActivityAdjustmentResult {
  const durationInfo = lookupCropDuration(cropName, varietyOrNotes);
  const duration = cropDurationDays || durationInfo.durationDays;
  const baseHarvestDate = new Date(sowingDate.getTime() + duration * 86400000);

  const daysSinceSowing = Math.max(0, Math.floor((now.getTime() - sowingDate.getTime()) / 86400000));
  const baseProgressPct = Math.min(100, Math.max(0, Math.round((daysSinceSowing / duration) * 100)));

  // Filter activities for this crop cycle (from sowing date up to now)
  const sortedActs = [...activities]
    .filter(a => {
      const actTime = new Date(a.date).getTime();
      return !isNaN(actTime) && actTime >= sowingDate.getTime() - 86400000 && actTime <= now.getTime() + 86400000;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let delayDays = 0;
  let advanceDays = 0;
  const adjustmentReasons: string[] = [];
  const flags = {
    waterStress: false,
    nutrientRisk: false,
    pestDiseaseRisk: false,
    weedCompetitionRisk: false,
    environmentalStress: false
  };

  // 1. IRRIGATION EVALUATION
  const irrigations = sortedActs.filter(a => a.activity_type === 'Irrigation');
  if (daysSinceSowing >= ADJUSTMENT_RULES.irrigation.maxAllowedGapDays) {
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

    if (maxGap > ADJUSTMENT_RULES.irrigation.maxAllowedGapDays) {
      const excessDays = maxGap - ADJUSTMENT_RULES.irrigation.maxAllowedGapDays;
      const irrDelay = Math.min(7, Math.max(2, Math.round(excessDays * 0.5)));
      delayDays += irrDelay;
      flags.waterStress = true;
      adjustmentReasons.push(
        `Harvest estimate delayed by ${irrDelay} days due to water stress: irrigation gap of ${maxGap} days detected between ${gapStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} and ${gapEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      );
    } else if (irrigations.length > 0) {
      advanceDays += ADJUSTMENT_RULES.irrigation.onScheduleAdvancementDays;
      adjustmentReasons.push(
        `Timely irrigation logged on schedule maintaining active crop progression.`
      );
    }
  } else if (irrigations.length > 0) {
    advanceDays += ADJUSTMENT_RULES.irrigation.onScheduleAdvancementDays;
    adjustmentReasons.push(`Early irrigation on schedule promoting robust seedling establishment.`);
  }

  // 2. FERTILIZATION EVALUATION
  const fertilizations = sortedActs.filter(a => a.activity_type === 'Fertilization');
  if (baseProgressPct >= ADJUSTMENT_RULES.fertilization.expectedVegetativeCutoffPct && fertilizations.length === 0) {
    delayDays += ADJUSTMENT_RULES.fertilization.missingFertilizationDelayDays;
    flags.nutrientRisk = true;
    adjustmentReasons.push(
      `Harvest estimate delayed by ${ADJUSTMENT_RULES.fertilization.missingFertilizationDelayDays} days: missing expected vegetative fertilizer top-dressing.`
    );
  } else if (fertilizations.length > 0) {
    adjustmentReasons.push(`Nutrient top-dressing recorded, sustaining vigorous vegetative & grain filling canopy.`);
  }

  // 3. PEST & DISEASE SCENARIOS
  const inspections = sortedActs.filter(a => a.activity_type === 'Disease Inspection');
  const sprays = sortedActs.filter(a => a.activity_type === 'Pesticide Application');

  for (const insp of inspections) {
    const text = `${insp.quantity_details || ''} ${insp.notes || ''}`.toLowerCase();
    const isThreat = text.includes('infest') || text.includes('blight') || text.includes('pest') || text.includes('borer') || text.includes('rot') || text.includes('mildew') || text.includes('armyworm') || text.includes('rust');
    if (isThreat) {
      const inspDate = new Date(insp.date);
      // Check if a spray was logged within 8 days after inspection
      const hasMitigation = sprays.some(s => {
        const sDate = new Date(s.date);
        const diff = (sDate.getTime() - inspDate.getTime()) / 86400000;
        return diff >= 0 && diff <= 8;
      });

      if (!hasMitigation) {
        delayDays += ADJUSTMENT_RULES.pestAndDisease.unmitigatedInfectionDelayDays;
        flags.pestDiseaseRisk = true;
        adjustmentReasons.push(
          `Harvest estimate delayed by ${ADJUSTMENT_RULES.pestAndDisease.unmitigatedInfectionDelayDays} days due to unmitigated pest/disease stress noted on ${inspDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} without corrective spray.`
        );
      } else {
        adjustmentReasons.push(
          `Pest/disease inspection findings on ${inspDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} successfully mitigated by timely spray application.`
        );
      }
    }
  }

  // 4. WEEDING EVALUATION
  const weedings = sortedActs.filter(a => a.activity_type === 'Weeding');
  if (daysSinceSowing > ADJUSTMENT_RULES.weeding.cutoffDay && weedings.length === 0) {
    delayDays += ADJUSTMENT_RULES.weeding.missingWeedingDelayDays;
    flags.weedCompetitionRisk = true;
    adjustmentReasons.push(
      `Harvest estimate delayed by ${ADJUSTMENT_RULES.weeding.missingWeedingDelayDays} days due to weed competition during early canopy closure.`
    );
  } else if (weedings.length > 0) {
    adjustmentReasons.push(`Field weeding logged, minimizing resource competition.`);
  }

  // 5. DOCUMENTED STRESS EVENTS
  for (const act of sortedActs) {
    const text = `${act.quantity_details || ''} ${act.notes || ''}`.toLowerCase();
    if (text.includes('drought') || text.includes('waterlogging') || text.includes('flood') || text.includes('heatwave') || text.includes('hail') || text.includes('frost')) {
      const actDate = new Date(act.date);
      const stressType = text.includes('drought') ? 'drought' : text.includes('waterlogging') || text.includes('flood') ? 'waterlogging' : 'weather stress';
      const eventDelay = stressType === 'drought' ? ADJUSTMENT_RULES.stressEvents.droughtDelayDays : ADJUSTMENT_RULES.stressEvents.waterloggingDelayDays;
      delayDays += eventDelay;
      flags.environmentalStress = true;
      adjustmentReasons.push(
        `Harvest estimate delayed by ${eventDelay} days due to documented ${stressType} on ${actDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      );
    }
  }

  // Net timeline shift (bounded between -3 days advance and +25 days delay)
  const netShiftDays = Math.max(-3, Math.min(25, delayDays - advanceDays));
  const adjustedHarvestDate = new Date(baseHarvestDate.getTime() + netShiftDays * 86400000);
  const daysRemaining = Math.max(0, Math.ceil((adjustedHarvestDate.getTime() - now.getTime()) / 86400000));

  // Adjusted Growth Percent: physiological progress function
  // Net stress delay slows physiological development relative to calendar days elapsed
  let effectiveDays = daysSinceSowing;
  if (netShiftDays > 0) {
    effectiveDays = Math.max(0, daysSinceSowing - Math.min(daysSinceSowing, netShiftDays * 0.7));
  } else if (netShiftDays < 0) {
    effectiveDays = daysSinceSowing + Math.abs(netShiftDays) * 0.5;
  }
  const totalAdjustedCycle = duration + netShiftDays;
  const growthPercent = Math.min(100, Math.max(0, Math.round((effectiveDays / totalAdjustedCycle) * 100)));

  // Realistic harvest date range
  const winStart = new Date(adjustedHarvestDate.getTime() - 4 * 86400000);
  const winEnd = new Date(adjustedHarvestDate.getTime() + 6 * 86400000);
  const harvestWindowRange = `${winStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const currentGrowthStage = getPhenologicalStage(growthPercent, durationInfo.stages);

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

