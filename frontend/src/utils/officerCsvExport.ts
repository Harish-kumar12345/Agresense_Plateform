/**
 * AgriSense Officer Portal CSV Export Utility
 * Ensures strict RFC 4180 CSV compliance and guarantees preservation of LIVE vs DEMO labels.
 */

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFarmsToCsv(farms: any[]) {
  const headers = [
    'DATA_ORIGIN',
    'Farm ID',
    'Farm Name',
    'Farmer Name',
    'Farmer Phone',
    'Location',
    'District',
    'State',
    'Latitude',
    'Longitude',
    'Crop Variety',
    'Area (Hectares)',
    'Soil Type',
    'Soil Moisture (%)',
    'pH',
    'NPK (N-P-K)',
    'Predicted Yield (t/ha)',
    'Expected Total Production (Tons)',
    'Pathogen Risk Level',
    'Risk Score (%)',
    'Growth Stage',
    'Accumulated GDD',
    'Expected Harvest Date',
    'Model Calibration Status',
    'Last Telemetry Sync'
  ];

  const rows = farms.map((f) => [
    escapeCsvCell(f.is_live ? 'LIVE' : 'DEMO'),
    escapeCsvCell(f.farm_id),
    escapeCsvCell(f.farm_name),
    escapeCsvCell(f.farmer_name),
    escapeCsvCell(f.farmer_phone),
    escapeCsvCell(f.location_name),
    escapeCsvCell(f.district),
    escapeCsvCell(f.state),
    escapeCsvCell(f.latitude),
    escapeCsvCell(f.longitude),
    escapeCsvCell(f.crop),
    escapeCsvCell(f.area_hectares),
    escapeCsvCell(f.soil_type),
    escapeCsvCell(f.soil_moisture),
    escapeCsvCell(f.ph),
    escapeCsvCell(`${f.nitrogen}-${f.phosphorus}-${f.potassium}`),
    escapeCsvCell(f.predicted_yield_tha),
    escapeCsvCell(f.expected_production_tons),
    escapeCsvCell(f.risk_level),
    escapeCsvCell(f.risk_score),
    escapeCsvCell(f.growth_stage),
    escapeCsvCell(f.current_gdd),
    escapeCsvCell(f.expected_harvest_date),
    escapeCsvCell(f.model_calibration?.is_calibrated ? 'CALIBRATED' : 'UNCALIBRATED_PROFILE'),
    escapeCsvCell(f.last_updated)
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsv(csvContent, `AgriSense_Monitored_Farms_Directory_${dateStr}.csv`);
}

export function exportAuditLogsToCsv(logs: any[]) {
  const headers = [
    'Log ID',
    'Timestamp (UTC)',
    'Officer ID',
    'Officer Name',
    'Action Type',
    'Target ID',
    'Target Type',
    'Details / Description',
    'Before Value',
    'After Value',
    'Origin IP'
  ];

  const rows = logs.map((l) => [
    escapeCsvCell(l._id),
    escapeCsvCell(l.created_at),
    escapeCsvCell(l.officer_id),
    escapeCsvCell(l.officer_name),
    escapeCsvCell(l.action_type),
    escapeCsvCell(l.target_id),
    escapeCsvCell(l.target_type),
    escapeCsvCell(l.details),
    escapeCsvCell(l.before_value ? JSON.stringify(l.before_value) : 'NONE'),
    escapeCsvCell(l.after_value ? JSON.stringify(l.after_value) : 'NONE'),
    escapeCsvCell(l.ip_address)
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsv(csvContent, `AgriSense_Officer_Audit_Trail_${dateStr}.csv`);
}

export function exportSingleFarmReportCsv(farm: any) {
  const metaRows = [
    ['AgriSense Precision Agronomic Telemetry Report'],
    ['Generated At', new Date().toISOString()],
    ['DATA ORIGIN', farm.is_live ? 'LIVE' : 'DEMO'],
    ['Farm Name', farm.farm_name],
    ['Farmer', `${farm.farmer_name} (${farm.farmer_phone})`],
    ['Location', `${farm.location_name}, ${farm.district}, ${farm.state}`],
    ['Crop Variety', farm.crop],
    ['Cultivated Area', `${farm.area_hectares} Hectares`],
    ['Predicted Yield', `${farm.predicted_yield_tha} tons/ha`],
    ['Total Production Forecast', `${farm.expected_production_tons} Tons`],
    ['Pathogen Risk Level', `${farm.risk_level} (${farm.risk_score}%)`],
    ['Accumulated GDD', `${farm.current_gdd} GDD (Agronomic Heat Units)`],
    ['Expected Harvest Window', `${farm.expected_harvest_date} (${farm.harvest_window || 'N/A'})`],
    ['Model Calibration', farm.model_calibration?.notes || 'Standard Profile'],
    ['']
  ];

  const content = metaRows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsv(content, `AgriSense_FarmReport_${farm.farm_id}_${dateStr}.csv`);
}
