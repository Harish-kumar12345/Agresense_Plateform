const mongoose = require('mongoose');

const officerAlertPreferencesSchema = new mongoose.Schema(
  {
    officer_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    officer_email: {
      type: String,
      default: ''
    },
    email_delivery: {
      enabled: { type: Boolean, default: false },
      destination_email: { type: String, default: '' },
      severities: {
        info: { type: Boolean, default: false },
        warning: { type: Boolean, default: false },
        high: { type: Boolean, default: true },
        critical: { type: Boolean, default: true }
      }
    },
    webhook_delivery: {
      enabled: { type: Boolean, default: false },
      webhook_url: { type: String, default: '' },
      secret_token: { type: String, default: '' },
      severities: {
        info: { type: Boolean, default: false },
        warning: { type: Boolean, default: false },
        high: { type: Boolean, default: true },
        critical: { type: Boolean, default: true }
      }
    },
    in_app_delivery: {
      enabled: { type: Boolean, default: true },
      severities: {
        info: { type: Boolean, default: true },
        warning: { type: Boolean, default: true },
        high: { type: Boolean, default: true },
        critical: { type: Boolean, default: true }
      }
    },
    delivery_history: [
      {
        alert_id: String,
        title: String,
        severity: String,
        channel: { type: String, enum: ['in_app', 'email', 'webhook'] },
        status: { type: String, enum: ['Sent', 'Failed', 'Pending'], default: 'Pending' },
        status_note: String,
        attempted_at: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

const OfficerAlertPreferences =
  mongoose.models.OfficerAlertPreferences ||
  mongoose.model('OfficerAlertPreferences', officerAlertPreferencesSchema);

module.exports = { OfficerAlertPreferences };
