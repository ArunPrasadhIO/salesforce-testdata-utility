/**
 * Salesforce Configuration
 * Update these settings according to your Salesforce environment
 */

module.exports = {
  // Salesforce Connection Settings
  salesforce: {
    // Replace with your Salesforce credentials
    username: process.env.SF_USERNAME || "your-salesforce-username",
    password: process.env.SF_PASSWORD || "your-password",
    securityToken: process.env.SF_SECURITY_TOKEN || "your-security-token",
    
    // Salesforce API Version
    version: "55.0",
    
    // Login URL (change for sandbox)
    loginUrl: process.env.SF_LOGIN_URL || "https://login.salesforce.com"
  },

  // Application Settings
  app: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Performance Settings
  performance: {
    // Batch sizes based on field count
    batchSizes: {
      highFields: 5,    // >100 fields
      mediumFields: 10, // 50-100 fields
      lowFields: 50     // <50 fields
    },
    
    // Delays between batches (milliseconds)
    delays: {
      wideRecords: 500,    // For high field count
      standardRecords: 1000 // For normal field count
    }
  },

  // Field Generation Defaults
  fieldDefaults: {
    text: { length: 255 },
    textArea: { length: 1000 },
    number: { precision: 18, scale: 2 },
    currency: { precision: 18, scale: 2 },
    email: {},
    phone: {},
    date: {},
    dateTime: {},
    checkbox: { defaultValue: false }
  },

  // Object Creation Limits
  limits: {
    maxObjects: 50,
    maxFieldsPerObject: 500,
    maxRecordsPerUpload: 10000
  }
}; 