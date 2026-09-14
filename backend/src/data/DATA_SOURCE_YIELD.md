# Data Source: Indian Crop Production & Yield Statistics (`crop_production_india.csv`)

## Source & Institutional Attribution
- **Dataset**: `backend/ml/datasets/crop_production_india.csv` (345,407 district-level historical agricultural records)
- **Authority**: Directorate of Economics and Statistics (DES), Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare, Government of India
- **Portal**: https://aps.dac.gov.in / https://data.gov.in

## Temporal Coverage & Granularity
- **Years**: 1997-1998 through 2020-2021
- **Spatial Coverage**: 36 States & Union Territories, 700+ agricultural districts
- **Crops**: 56 agricultural commodities (cereals, pulses, oilseeds, cash crops, horticulture)
- **Metrics**: Cultivated Area (ha), Gross Production (tonnes), Actual Realized Yield (tonnes/ha)

## Integration with LightGBM & Time-Series Analytics
1. **LightGBM Yield Regressor**: Trained on 345,000+ Indian crop production records (`r2_score = 0.93`), learning the non-linear interaction between crop type, state agro-ecology, cropping season (Kharif/Rabi/Zaid), and cultivation scale.
2. **Historical Yield Series**: Instead of synthetic multipliers around the predicted target, historical yield baselines are queried directly from statistical district, state, and national median yields recorded in `crop_production_india.csv`.
3. **Dynamic Feature Importances**: Pulled directly from the LightGBM model booster gain matrix (`feature_importances_`) rather than static client arrays.
4. **Physiological Harvest Windows**: Sourced from ICAR crop maturity specifications based on crop duration (e.g. Sugarcane: 300-360 days; Wheat: 105-125 days; Pulses: 65-85 days).

## Licensing & Refresh Cadence
- **License**: Government Open Data License - India (GODL-India)
- **Cadence**: Annual (Third & Fourth Advance Estimates of Foodgrain Production)
