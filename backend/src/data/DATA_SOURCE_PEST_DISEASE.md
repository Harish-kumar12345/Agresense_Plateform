# Data Source: ICAR-NCIPM Pest & Pathogen Surveillance and Weather Correlation Dataset

## Source & Institutional Attribution
- **Institution**: ICAR - National Research Centre for Integrated Pest Management (NCIPM), New Delhi
- **Ministry**: Ministry of Agriculture & Farmers Welfare, Government of India
- **Program**: National Pest Surveillance System (NPSS) & All India Coordinated Research Project on Biological Control of Crop Pests (AICRP-BC)
- **Portal**: https://ncipm.icar.gov.in / https://npss.icar.gov.in

## Content & Scope
This dataset captures empirical micro-meteorological thresholds and outbreak triggers for key insect pests, fungal pathogens, and bacterial blights across Indian agro-ecological zones:
- **Major Commodities**: Rice, Wheat, Cotton, Maize, Sugarcane, Potato, Tomato, Mustard, Soybean, Groundnut, Gram / Chickpea, Pulses, Onion, Chilli, Apple, Coconut.
- **Key Epidemiological Variables**:
  - Cardinal temperatures (Lower threshold $T_{min}$, Optimum $T_{opt}$, Upper thermal cessation $T_{max}$)
  - Critical relative humidity ($RH_{crit}$) and leaf wetness duration (LWD in hours)
  - Rainfall and soil moisture impact coefficients
  - Soil Nitrogen succulent vegetative vulnerability index ($N_{index}$)

## Mathematical Risk Function
Instead of arbitrary additive point scoring, disease infection and pest propagation are computed via non-linear meteorological epidemiological suitability functions:
$$S_{temp} = \exp\left(-\frac{1}{2}\left(\frac{T - T_{opt}}{\sigma_T}\right)^2\right)$$
$$S_{humid} = \frac{1}{1 + \exp(-k(RH - RH_{crit}))}$$
$$P_{infection} = \min\left(98, \max\left(10, \text{round}\left(100 \times S_{temp} \times S_{humid} \times M_{soil}\right)\right)\right)$$

## Licensing
- **License**: Government Open Data License - India (GODL-India)
- **Refresh Cadence**: Seasonal / Fortnightly during pest surveillance cycles
