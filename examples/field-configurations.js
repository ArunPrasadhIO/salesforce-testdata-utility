/**
 * Example Field Configurations
 * Use these examples for different testing scenarios
 */

// Small object configuration (50 fields)
const smallObjectConfig = {
  "Text": 20,
  "Number": 10,
  "Email": 5,
  "Phone": 5,
  "Date": 5,
  "Checkbox": 5
};

// Medium object configuration (100 fields)
const mediumObjectConfig = {
  "Text": 40,
  "TextArea": 15,
  "Number": 20,
  "Currency": 10,
  "Email": 8,
  "Phone": 5,
  "Date": 2
};

// Large object configuration (200 fields)
const largeObjectConfig = {
  "Text": 60,
  "TextArea": 25,
  "Number": 40,
  "Currency": 25,
  "Email": 20,
  "Phone": 15,
  "Date": 10,
  "DateTime": 3,
  "Checkbox": 2
};

// Performance testing configuration (500 fields)
const performanceTestConfig = {
  "Text": 200,
  "TextArea": 50,
  "Number": 100,
  "Currency": 50,
  "Email": 40,
  "Phone": 30,
  "Date": 20,
  "DateTime": 8,
  "Checkbox": 2
};

// Contact-like object configuration
const contactConfig = {
  "Text": 15,      // First Name, Last Name, Title, etc.
  "Email": 3,      // Email, Personal Email, Work Email
  "Phone": 4,      // Phone, Mobile, Work Phone, Fax
  "TextArea": 2,   // Description, Notes
  "Date": 2,       // Birth Date, Start Date
  "Checkbox": 4    // Various flags
};

// Account-like object configuration
const accountConfig = {
  "Text": 25,      // Account Name, Industry, Type, etc.
  "TextArea": 5,   // Description, Notes, Terms
  "Number": 8,     // Employee Count, Annual Revenue metrics
  "Currency": 5,   // Revenue fields
  "Email": 2,      // Primary Email, Support Email
  "Phone": 3,      // Phone, Fax, Support Phone
  "Date": 2,       // Created Date, Last Activity
  "Checkbox": 5    // Various boolean flags
};

// Lead-like object configuration
const leadConfig = {
  "Text": 20,      // Name fields, Company, Source, etc.
  "Email": 2,      // Email, Work Email
  "Phone": 3,      // Phone, Mobile, Work Phone
  "TextArea": 3,   // Description, Notes, Qualification
  "Number": 3,     // Score, Rating, Revenue
  "Currency": 2,   // Budget, Expected Revenue
  "Date": 2,       // Created Date, Converted Date
  "Checkbox": 5    // Qualified, Converted, etc.
};

// Opportunity-like object configuration
const opportunityConfig = {
  "Text": 15,      // Name, Stage, Source, etc.
  "Currency": 5,   // Amount, Expected Revenue, etc.
  "Number": 5,     // Probability, Quantity, etc.
  "Date": 4,       // Close Date, Created Date, etc.
  "TextArea": 3,   // Description, Next Steps, etc.
  "Email": 1,      // Contact Email
  "Phone": 1,      // Contact Phone
  "Checkbox": 6    // Various flags
};

// Product-like object configuration
const productConfig = {
  "Text": 20,      // Product Name, SKU, Category, etc.
  "Currency": 5,   // Price, Cost, MSRP, etc.
  "Number": 8,     // Quantity, Weight, Dimensions, etc.
  "TextArea": 4,   // Description, Features, etc.
  "Date": 2,       // Launch Date, End of Life
  "Checkbox": 6    // Active, Featured, etc.
};

// Case-like object configuration
const caseConfig = {
  "Text": 18,      // Subject, Type, Priority, etc.
  "TextArea": 6,   // Description, Resolution, Comments
  "Date": 4,       // Created Date, Closed Date, etc.
  "Number": 2,     // Case Number, Hours
  "Email": 2,      // Contact Email, Reporter Email
  "Phone": 1,      // Contact Phone
  "Checkbox": 7    // Escalated, Resolved, etc.
};

module.exports = {
  small: smallObjectConfig,
  medium: mediumObjectConfig,
  large: largeObjectConfig,
  performance: performanceTestConfig,
  contact: contactConfig,
  account: accountConfig,
  lead: leadConfig,
  opportunity: opportunityConfig,
  product: productConfig,
  case: caseConfig
};

// Usage examples:
/*
const configs = require('./examples/field-configurations');

// Create a small test object
curl -X POST http://localhost:3000/create-objects \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "numberOfObjects=1&generationMode=bulk&fieldConfigs=${JSON.stringify(configs.small)}"

// Create a performance test object
curl -X POST http://localhost:3000/create-objects \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "numberOfObjects=1&generationMode=bulk&fieldConfigs=${JSON.stringify(configs.performance)}"
*/ 