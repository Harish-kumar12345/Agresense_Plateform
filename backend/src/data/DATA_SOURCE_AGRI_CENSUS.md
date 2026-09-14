# Data Source: Directorate of Economics and Statistics (DES) Agriculture Census

## 1. Overview
The District-Level Agrarian Census dataset provides historical district-level crop sowing acreage, crop production, and yield benchmarks for all agricultural districts in India.

## 2. Source & Provenance
- **Publishing Authority**: Directorate of Economics and Statistics (DES), Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare, Government of India.
- **Portals**:
  - Agricultural Statistics Division: https://aps.dac.gov.in/
  - Open Government Data (OGD) Platform India: https://data.gov.in/resource/district-wise-season-wise-crop-production-statistics
- **Dataset Title**: District-wise, Season-wise Crop Production & Acreage Statistics of India.
- **Underlying File**: `backend/ml/datasets/crop_production_india.csv` (345,407 verified records spanning 36 States/UTs, 729 districts, and 56 crops from 1997-98 to 2020-21).

## 3. License & Terms of Use
- **License**: Government Open Data License - India (GODL).
- **Attribution**: "Directorate of Economics and Statistics, Ministry of Agriculture & Farmers Welfare, Government of India".
- **Permitted Uses**: Non-commercial and commercial research, analytics, policy formulation, and application integration.

## 4. Aggregated Schema (`des_agri_census_district_acreage.json`)
The 345,000+ row raw dataset has been aggregated over recent reporting cycles (2016-17 through 2020-21) to provide fast, deterministic district agrarian benchmarks:
```json
{
  "state": "Uttar Pradesh",
  "district": "Ghaziabad",
  "total_cultivated_area_ha": 68420.5,
  "dominant_crop": "Wheat",
  "dominant_crop_area_ha": 34150.0,
  "crops": [
    {
      "crop": "Wheat",
      "avg_sowing_area_ha": 34150.0,
      "avg_production_tonnes": 118400.0,
      "avg_yield_tha": 3.47
    },
    {
      "crop": "Rice",
      "avg_sowing_area_ha": 18230.0,
      "avg_production_tonnes": 52867.0,
      "avg_yield_tha": 2.90
    },
    {
      "crop": "Sugarcane",
      "avg_sowing_area_ha": 12500.0,
      "avg_production_tonnes": 812500.0,
      "avg_yield_tha": 65.0
    }
  ]
}
```

## 5. Refresh Cadence
- **Official Release**: Annually following final state crop cutting estimates (CCE) and DES national compilations.
- **Application Ingestion**: Local fast JSON cache refreshed annually or when newer DES Agricultural Statistics Compendium is released.
