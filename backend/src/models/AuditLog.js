const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    officer_id: {
      type: String,
      required: true,
      index: true
    },
    officer_name: {
      type: String,
      required: true
    },
    action_type: {
      type: String,
      enum: [
        'ADVISORY_DISPATCHED',
        'INCIDENT_STATUS_CHANGED',
        'INVENTORY_ADJUSTED',
        'HARVEST_UPDATED',
        'REPORT_EXPORTED_PDF',
        'REPORT_EXPORTED_CSV',
        'SETTINGS_UPDATED',
        'FARM_INSPECTED',
        'BROADCAST_ALERT_DISPATCHED',
        'QUERY_RESOLVED'
      ],
      required: true,
      index: true
    },
    target_id: {
      type: String,
      required: true,
      index: true
    },
    target_type: {
      type: String,
      enum: ['farm', 'incident', 'inventory_item', 'harvest_batch', 'report', 'alert_preferences', 'query', 'broadcast'],
      required: true
    },
    details: {
      type: String,
      required: true
    },
    before_value: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after_value: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ip_address: {
      type: String,
      default: '127.0.0.1'
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false } // strictly append-only (no updated_at)
  }
);

// Read-only / append-only safeguard
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are append-only and cannot be modified.'));
  }
  next();
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = { AuditLog };
