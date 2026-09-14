# Data Source: ICAR National Directory of Krishi Vigyan Kendras (KVKs)

## Source & Institutional Attribution
- **Authority**: Agricultural Extension Division, Indian Council of Agricultural Research (ICAR), Department of Agricultural Research & Education (DARE), Government of India
- **National Portal**: https://kvk.icar.gov.in / https://icar.org.in
- **PM-Kisan Samriddhi Kendras (PM-KSK)**: Ministry of Chemicals & Fertilizers / Department of Fertilizers (https://fert.gov.in)

## Content & Scope
Contains verified institutional directory data for 731+ Krishi Vigyan Kendras across all 28 States and 8 Union Territories in India:
- Host Institutions: State Agricultural Universities (SAUs), ICAR Central Institutes, Central Agricultural Universities (CAUs), and vetted agricultural extension NGOs.
- Mandatory Services:
  - Soil & Water Testing Laboratories
  - Frontline Demonstrations (FLDs) on improved high-yielding varieties
  - On-farm testing & trial evaluation of new crop technologies
  - Direct seed and planting material supply (Breeder / Certified seeds)
  - Plant health diagnostic clinics and disease/pest advisories
  - PM-KSK single-window service integration for fertilizers and seeds

## Geocoding & Query Optimization
- Spatial indexing using Haversine spherical distance calculation:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- Guarantees that rural farmers in any district of India receive non-empty, genuine KVK helpline contacts, addresses, and navigation coordinates, even when OpenStreetMap data is absent.

## Licensing & Refresh Cadence
- **License**: Government Open Data License - India (GODL-India)
- **Cadence**: Annual directory updates aligned with ICAR Annual Extension Conferences
