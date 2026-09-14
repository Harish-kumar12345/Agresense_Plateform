# DATA SOURCE: Agmarknet APMC Mandi Prices & Time-Series

## 1. Source Origin
* **Portal / Agency**: Agricultural Marketing Information Network (AGMARKNET)
* **Governing Body**: Directorate of Marketing & Inspection (DMI), Ministry of Agriculture & Farmers Welfare, Government of India
* **API Endpoints**: 
  - National Data Portal (OGD India): `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`
  - Agmarknet Official Portal: `https://agmarknet.gov.in`

## 2. Ingestion & Coverage
* **Commodities Monitored**: Rice, Wheat, Maize, Cotton, Sugarcane, Soybean, Mustard, Potato, Onion, Tomato, Coconut, Black Pepper, Cardamom, Rubber, Groundnut.
* **APMC Markets**: Azadpur (Delhi), Sahibabad / Ghaziabad (UP), Meerut (UP), Khanna (Punjab), Karnal (Haryana), Indore (MP), Rajkot (Gujarat), Yavatmal (Maharashtra), Kochi APMC (Kerala), Pollachi (Tamil Nadu), Kumily (Kerala), etc.
* **Metrics Ingested**:
  - `modalPrice`: Prevailing daily modal price (INR / Quintal)
  - `minPrice` & `maxPrice`: Daily price spread (INR / Quintal)
  - `arrivalTons`: Genuine APMC arrival volume (Metric Tons / Quintals)
  - `date`: Daily historical continuous series (90 days)

## 3. License
* **License**: Government Open Data License - India (GODL-India) / National Data Sharing and Accessibility Policy (NDSAP).
* **Usage**: Permitted for public, research, and application development with proper attribution.

## 4. Refresh Cadence
* **Live Ingestion**: 1-hour in-memory cache from `data.gov.in` API with fallback to Agmarknet benchmark series.
* **Historical Series**: Updated weekly or upon harvest cycle transitions.
