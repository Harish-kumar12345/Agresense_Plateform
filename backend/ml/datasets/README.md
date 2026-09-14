# AgriSense ML Datasets Directory

This directory contains the public benchmark datasets and training corpora used by AgriSense Machine Learning microservices, regression pipelines, and RAG knowledge bases:

## Datasets Catalog

| Dataset File | Description & Scope | Source / Authority | License |
|---|---|---|---|
| **`crop_production_india.csv`** | 345,407 historical district-level crop production records (1997–2021) across 56 crops, used for LightGBM yield regression. | Directorate of Economics & Statistics (DES), Ministry of Agriculture | GODL-India |
| **`crop_recommendation.csv`** | 2,200 soil and climatic crop recommendation records (N, P, K, Temp, Humidity, pH, Rainfall). | ICAR / Kaggle Agricultural Benchmark | Open Data |
| **`agmarknet_daily_mandi_prices.csv`** | 1,365 daily mandi price time-series records across 15 major commodities and 26 major APMC mandis. | Agmarknet / Directorate of Marketing & Inspection (DMI) | GODL-India |
| **`icar_stcr_fertilizer_equations.csv`** | ICAR Soil Test Crop Response (STCR) targeted yield equations, standard RDFs, and commercial bag split application schedules. | ICAR-Indian Institute of Soil Science (IISS) Bhopal | Open Access |
| **`icar_ncipm_pest_pathogen_surveillance.csv`** | 51 plant disease and insect pest surveillance vectors across 16 crops with cardinal thermal ranges, humidity triggers, and controls. | ICAR-National Research Centre for Integrated Pest Management (NCIPM) | GODL-India |
| **`soil_health_card_all_india_districts.csv`** | 794 agricultural districts across 36 States & UTs with macro/micronutrients (N, P, K, pH, Organic Carbon, Soil Type, Moisture). | Soil Health Card scheme (`soilhealth.dac.gov.in`) | GODL-India |
| **`kcc_agronomy_knowledgebase.csv`** | Verified farmer query and expert response pairs for agricultural RAG context injection. | Kisan Call Center (KCC) via `data.gov.in` & ICAR Package of Practices | GODL-India |
| **`fertilizer_data.csv`** | Legacy sample stub (now superseded by the comprehensive ICAR STCR equation matrix). | Repository stub | — |

*Note: The Node.js Express backend also maintains high-speed indexed JSON equivalents of these files in `backend/src/data/` for sub-millisecond API response times.*
