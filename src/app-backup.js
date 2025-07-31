const jsforce = require("jsforce");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const username = "celigo_di8@celigo.com";
const password = "&45jn#REcZ!pEy87" + "XR0u7bKDCHmwqkr6Tk7chZzA";

const conn = new jsforce.Connection({
  version: "55.0",
});

app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function loggingin() {
  try {
    const userInfo = await conn.login(username, password);
    console.log("Connected to Salesforce account: " + username + ": " + userInfo.id);
    const accessToken = conn.accessToken;
    const instanceUrl = conn.instanceUrl;
    console.log("Access Token: " + accessToken);
    console.log("Instance URL: " + instanceUrl);
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    return { accessToken, instanceUrl };
  } catch (err) {
    console.error("Login failed:", err);
    throw err;
  }
}

// Delete objects endpoint
app.post("/delete-objects", async (req, res) => {
  try {
    console.log("Received request to delete objects");
    const { accessToken, instanceUrl } = await loggingin();
    console.log("Successfully logged in to Salesforce");

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const deletePattern = req.body.deletePattern;
    if (!deletePattern) {
      console.log("No delete pattern specified");
      return res.status(400).send("Delete pattern is required");
    }
    console.log(`Delete pattern: ${deletePattern}`);

    // Query custom objects that match the pattern (custom objects end with __c)
    const objectsQuery = `SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName LIKE '%${deletePattern}%' AND QualifiedApiName LIKE '%__c'`;
    const objectsResult = await conn.query(objectsQuery);
    
    if (objectsResult.records.length === 0) {
      return res.send(`No custom objects found matching pattern: ${deletePattern}`);
    }

    console.log(`Found ${objectsResult.records.length} objects to delete`);
    const deletedObjects = [];

    for (const record of objectsResult.records) {
      const objectName = record.QualifiedApiName;
      try {
        const deleteResult = await conn.metadata.delete("CustomObject", objectName);
        if (deleteResult.success) {
          console.log(`Successfully deleted object: ${objectName}`);
          deletedObjects.push(objectName);
        } else {
          console.error(`Failed to delete object ${objectName}: ${JSON.stringify(deleteResult.errors)}`);
        }
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Error deleting object ${objectName}: ${err.message}`);
      }
    }

    res.send(`Successfully deleted ${deletedObjects.length} objects matching pattern: ${deletePattern}\nDeleted: ${deletedObjects.join(', ')}`);
  } catch (error) {
    console.error(`Error in /delete-objects route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

// Get object schema endpoint
app.post("/get-schema", async (req, res) => {
  try {
    console.log("Received request to get object schema");
    const { accessToken, instanceUrl } = await loggingin();
    console.log("Successfully logged in to Salesforce");

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const objectName = req.body.objectName;
    if (!objectName) {
      return res.status(400).send("Object name is required");
    }

    console.log(`Getting schema for object: ${objectName}`);

    // Describe the object to get its fields
    const objectDescription = await conn.sobject(objectName).describe();
    
    const fields = objectDescription.fields
      .filter(field => field.createable && !field.autoNumber && !field.calculated)
      .map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: !field.nillable && !field.defaultedOnCreate,
        length: field.length,
        picklistValues: field.picklistValues
      }));

    res.json({
      objectName: objectName,
      label: objectDescription.label,
      totalFields: fields.length,
      fields: fields
    });

  } catch (error) {
    console.error(`Error in /get-schema route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

// Fix field permissions endpoint
app.post("/fix-field-permissions", async (req, res) => {
  try {
    console.log("Received request to fix field permissions");
    const { accessToken, instanceUrl } = await loggingin();
    console.log("Successfully logged in to Salesforce");

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const objectName = req.body.objectName;
    if (!objectName) {
      return res.status(400).send("Object name is required");
    }

    console.log(`Fixing field permissions for object: ${objectName}`);

    // Get all custom fields for the object
    const objectDescription = await conn.sobject(objectName).describe();
    const customFields = objectDescription.fields.filter(field => 
      field.name.endsWith('__c') && field.custom
    );

    if (customFields.length === 0) {
      return res.send(`No custom fields found for object: ${objectName}`);
    }

    console.log(`Found ${customFields.length} custom fields to fix permissions for`);

    // Create a permission set to grant field access
    const permissionSetName = `${objectName.replace('__c', '')}_FieldAccess`;
    const permissionSet = {
      fullName: permissionSetName,
      label: `Field Access for ${objectName}`,
      description: `Grants access to custom fields on ${objectName}`,
      hasActivationRequired: false,
      fieldPermissions: customFields.map(field => ({
        field: `${objectName}.${field.name}`,
        readable: true,
        editable: true
      })),
      objectPermissions: [{
        object: objectName,
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        allowRead: true,
        modifyAllRecords: false,
        viewAllRecords: false
      }]
    };

    try {
      const result = await conn.metadata.create("PermissionSet", permissionSet);
      if (result.success) {
        console.log(`Permission set created successfully: ${permissionSetName}`);
        res.json({
          message: `Field permissions fixed successfully!`,
          permissionSet: permissionSetName,
          fieldsUpdated: customFields.length,
          fields: customFields.map(f => f.name),
          instructions: `Go to Setup > Permission Sets > ${permissionSetName} and assign it to users to grant field access.`
        });
      } else {
        console.error(`Failed to create permission set: ${JSON.stringify(result.errors)}`);
        res.status(500).send(`Failed to create permission set: ${JSON.stringify(result.errors)}`);
      }
    } catch (permError) {
      console.error(`Error creating permission set: ${permError.message}`);
      res.status(500).send(`Error creating permission set: ${permError.message}`);
    }

  } catch (error) {
    console.error(`Error in /fix-field-permissions route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

// Generate CSV template endpoint
app.post("/generate-csv", async (req, res) => {
  try {
    console.log("Received request to generate CSV template");
    const { accessToken, instanceUrl } = await loggingin();
    
    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const objectName = req.body.objectName;
    const recordCount = parseInt(req.body.recordCount) || 10;
    
    if (!objectName) {
      return res.status(400).send("Object name is required");
    }

    console.log(`Generating CSV for object: ${objectName} with ${recordCount} records`);

    // Get object schema
    const objectDescription = await conn.sobject(objectName).describe();
    
    const fields = objectDescription.fields
      .filter(field => field.createable && !field.autoNumber && !field.calculated && field.name !== 'Id')
      .slice(0, 20); // Limit to first 20 fields for manageability

    // Generate CSV headers
    const headers = fields.map(field => field.name);
    
    // Generate sample data
    const csvRows = [headers.join(',')];
    
    for (let i = 1; i <= recordCount; i++) {
      const row = fields.map(field => {
        switch (field.type) {
          case 'string':
          case 'textarea':
            return `"Sample ${field.label} ${i}"`;
          case 'email':
            return `"test${i}@example.com"`;
          case 'phone':
            return `"555-010${i.toString().padStart(1, '0')}"`;
          case 'url':
            return `"https://example${i}.com"`;
          case 'int':
          case 'double':
          case 'currency':
          case 'percent':
            return Math.floor(Math.random() * 1000) + i;
          case 'boolean':
            return Math.random() > 0.5 ? 'true' : 'false';
          case 'date':
            const date = new Date();
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
          case 'datetime':
            const datetime = new Date();
            datetime.setDate(datetime.getDate() + i);
            return datetime.toISOString();
          case 'picklist':
            if (field.picklistValues && field.picklistValues.length > 0) {
              const randomIndex = Math.floor(Math.random() * field.picklistValues.length);
              return `"${field.picklistValues[randomIndex].value}"`;
            }
            return '"Option1"';
          default:
            return `"Sample Data ${i}"`;
        }
      });
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const fileName = `${objectName}_sample_${recordCount}_records.csv`;
    
    // Write CSV file
    fs.writeFileSync(fileName, csvContent, 'utf8');
    
    res.json({
      message: `CSV file generated successfully!`,
      fileName: fileName,
      objectName: objectName,
      recordCount: recordCount,
      fieldCount: fields.length,
      fields: fields.map(f => ({ name: f.name, type: f.type, label: f.label })),
      csvContent: csvContent
    });

  } catch (error) {
    console.error(`Error in /generate-csv route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

// Bulk upload CSV endpoint
app.post("/bulk-upload", upload.single('csvFile'), async (req, res) => {
  try {
    console.log("Received request for bulk upload");
    
    if (!req.file) {
      return res.status(400).send("No CSV file uploaded");
    }

    const { accessToken, instanceUrl } = await loggingin();
    console.log("Successfully logged in to Salesforce");

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const objectType = req.body.objectType;
    if (!objectType) {
      return res.status(400).send("Object type is required");
    }

    const csvData = [];
    const filePath = req.file.path;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${csvData.length} records from CSV`);

    if (csvData.length === 0) {
      fs.unlinkSync(filePath); // Clean up uploaded file
      return res.status(400).send("CSV file is empty or invalid");
    }

    // Bulk insert records
    const batchSize = 200; // Salesforce bulk API recommended batch size
    const results = [];
    
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(csvData.length/batchSize)}`);
      
      try {
        const batchResults = await conn.sobject(objectType).create(batch);
        const batchResultsArray = Array.isArray(batchResults) ? batchResults : [batchResults];
        results.push(...batchResultsArray);
        
        // Add delay between batches
        if (i + batchSize < csvData.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (batchError) {
        console.error(`Error processing batch: ${batchError.message}`);
        results.push({ success: false, error: batchError.message });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    res.send(`Bulk upload completed!\nSuccessful: ${successCount}\nFailed: ${errorCount}\nTotal processed: ${csvData.length}`);

  } catch (error) {
    console.error(`Error in /bulk-upload route: ${error.message}`);
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).send(error.message);
  }
});

app.post("/create-objects", async (req, res) => {
  try {
    console.log("Received request to create objects");
    const { accessToken, instanceUrl } = await loggingin();
    console.log("Successfully logged in to Salesforce");

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const numberOfObjects = parseInt(req.body.numberOfObjects, 10);
    if (!numberOfObjects || numberOfObjects <= 0) {
      console.log("Invalid number of objects specified");
      return res.status(400).send("Invalid number of objects specified");
    }
    console.log(`Number of objects to create: ${numberOfObjects}`);

    const generationMode = req.body.generationMode || 'bulk';
    console.log(`Field generation mode: ${generationMode}`);

    let fieldConfigs = [];

    if (generationMode === 'bulk') {
      const bulkConfig = JSON.parse(req.body.fieldConfigs || '{}');
      fieldConfigs = generateBulkFieldConfigs(bulkConfig);
      if (fieldConfigs.length === 0) {
        console.log("No bulk field configurations specified");
        return res.status(400).send("At least one field type with quantity > 0 is required");
      }
    }

    console.log(`Total fields per object: ${fieldConfigs.length}`);

    const createdObjectNames = [];

    function generateBulkFieldConfigs(bulkConfig) {
      const configs = [];
      
      const fieldDefaults = {
        'Text': { length: 255 },
        'TextArea': {},
        'LongTextArea': { length: 32768, visibleLines: 3 },
        'Number': { precision: 18, scale: 0 },
        'Currency': { precision: 16, scale: 2 },
        'Percent': { precision: 3, scale: 0 },
        'Email': {},
        'Phone': {},
        'Url': {},
        'Date': {},
        'DateTime': {},
        'Checkbox': { defaultValue: false },
        'Picklist': { picklistValues: ['Option1', 'Option2', 'Option3'] }
      };

      Object.keys(bulkConfig).forEach(fieldType => {
        const quantity = bulkConfig[fieldType];
        if (quantity > 0) {
          for (let i = 1; i <= quantity; i++) {
            const fieldConfig = {
              name: `${fieldType}Field${i}`,
              label: `${fieldType} Field ${i}`,
              type: fieldType,
              required: false,
              ...fieldDefaults[fieldType]
            };
            configs.push(fieldConfig);
          }
        }
      });

      return configs;
    }

    const createCustomObject = async (index) => {
      const randomNum = Math.floor(Math.random() * 100000);
      const customObjectName = `CustomObjectMaster${randomNum}__c`;
      const customObject = {
        fullName: customObjectName,
        label: `Custom Object ${randomNum}`,
        pluralLabel: `Custom Objects ${randomNum}`,
        nameField: {
          type: "Text",
          label: `Custom Object ${randomNum} Name`,
        },
        deploymentStatus: "Deployed",
        sharingModel: "ReadWrite",
        // Ensure object is visible and accessible
        enableActivities: true,
        enableBulkApi: true,
        enableReports: true,
        enableSearch: true,
        enableSharing: true,
        enableStreamingApi: true,
      };

      try {
        const result = await conn.metadata.create("CustomObject", customObject);
        if (!result.success) {
          throw new Error(`Error creating custom object ${index}: ${JSON.stringify(result.errors)}`);
        }
        console.log(`Custom object ${index} created successfully: ${result.fullName}`);
        createdObjectNames.push(customObjectName);

        const customFields = fieldConfigs.map((fieldConfig, fieldIndex) => {
          const baseField = {
            fullName: `${customObjectName}.${fieldConfig.name}__c`,
            label: fieldConfig.label,
            type: fieldConfig.type,
            // Checkbox fields cannot be required, others can be required for visibility
            required: fieldConfig.type === 'Checkbox' ? false : true
          };

          switch (fieldConfig.type) {
            case 'Text':
              baseField.length = fieldConfig.length || 255;
              break;
            case 'LongTextArea':
              baseField.length = fieldConfig.length || 32768;
              baseField.visibleLines = fieldConfig.visibleLines || 3;
              break;
            case 'Number':
              baseField.precision = fieldConfig.precision || 18;
              baseField.scale = fieldConfig.scale || 0;
              break;
            case 'Currency':
              baseField.precision = fieldConfig.precision || 16;
              baseField.scale = fieldConfig.scale || 2;
              break;
            case 'Percent':
              baseField.precision = fieldConfig.precision || 3;
              baseField.scale = fieldConfig.scale || 0;
              break;
            case 'Checkbox':
              baseField.defaultValue = fieldConfig.defaultValue || false;
              break;
            case 'Picklist':
              if (fieldConfig.picklistValues && fieldConfig.picklistValues.length > 0) {
                baseField.valueSet = {
                  valueSetDefinition: {
                    value: fieldConfig.picklistValues.map(val => ({
                      fullName: val,
                      default: false,
                      label: val
                    }))
                  }
                };
              }
              break;
          }

          return baseField;
        });

        const batchSize = 10;
        const fieldBatches = [];
        for (let i = 0; i < customFields.length; i += batchSize) {
          fieldBatches.push(customFields.slice(i, i + batchSize));
        }

        console.log(`Creating ${customFields.length} fields in ${fieldBatches.length} batch(es) for object ${randomNum}`);

        for (let batchIndex = 0; batchIndex < fieldBatches.length; batchIndex++) {
          const batch = fieldBatches[batchIndex];
          console.log(`Processing batch ${batchIndex + 1}/${fieldBatches.length} with ${batch.length} fields`);

          try {
            const fieldResults = await conn.metadata.create("CustomField", batch);
            const results = Array.isArray(fieldResults) ? fieldResults : [fieldResults];
            
            results.forEach((fieldResult, i) => {
              const globalIndex = batchIndex * batchSize + i;
              if (fieldResult.success) {
                console.log(`Custom field ${fieldConfigs[globalIndex]?.name} for object ${randomNum} created successfully: ${fieldResult.fullName}`);
              } else {
                console.error(`Error creating custom field ${fieldConfigs[globalIndex]?.name} for object ${randomNum}: ${JSON.stringify(fieldResult.errors)}`);
              }
            });
            
            if (batchIndex < fieldBatches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
          } catch (batchError) {
            console.error(`Error creating field batch ${batchIndex + 1} for object ${randomNum}: ${batchError.message}`);
            
            if (batchError.message.includes('EXCEEDED_ID_LIMIT') || batchError.message.includes('REQUEST_LIMIT_EXCEEDED')) {
              console.log(`Rate limit hit, waiting 5 seconds before continuing...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }

      } catch (err) {
        console.error(`Error creating custom object ${index}: ${err.message}`);
        throw err;
      }
    };

    const createObjects = async () => {
      for (let i = 1; i <= numberOfObjects; i++) {
        await createCustomObject(i);
      }

      createdObjectNames.forEach((name) => {
        fs.appendFileSync("created_objects.txt", name + "\n", "utf8");
      });
      console.log("Custom object names have been appended to created_objects.txt");

      res.send(`${numberOfObjects} custom objects with ${fieldConfigs.length} fields each created successfully! (Mode: ${generationMode})`);
    };

    await createObjects();
  } catch (error) {
    console.error(`Error in /create-objects route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Salesforce Test Data Generator</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { padding: 8px; margin: 5px 0; }
        button { padding: 10px 20px; margin: 10px 5px; background: #0066cc; color: white; border: none; cursor: pointer; }
        button:hover { background: #0052a3; }
        .preset-btn { background: #28a745; }
        .preset-btn:hover { background: #218838; }
        .info { background: #e6f3ff; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0; }
        .fields-container { display: none; }
        .fields-container.active { display: block; }
        small { display: block; margin-top: 3px; font-style: italic; }
        hr { border: none; border-top: 2px solid #eee; }
        h2 { color: #333; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>Salesforce Test Data Generator</h1>
      
      <div class="info">
        <strong>Instructions:</strong>
        <ul>
          <li><strong>Create Objects:</strong> Enter number of objects to create (1-50)</li>
          <li><strong>Delete Objects:</strong> Use pattern matching to delete custom objects</li>
          <li><strong>Bulk Upload:</strong> Upload CSV files to insert records</li>
          <li>Processing time: ~1 minute per 10 fields</li>
        </ul>
      </div>
      
      <form method="post" action="/create-objects">
        <div class="form-group">
          <label for="numberOfObjects">Number of Objects:</label>
          <input type="number" id="numberOfObjects" name="numberOfObjects" min="1" max="50" value="1" required>
        </div>
        
        <div class="form-group">
          <h3>Quick Presets:</h3>
          <button type="button" class="preset-btn" onclick="applyPreset('basic')">Basic (50 Fields)</button>
          <button type="button" class="preset-btn" onclick="applyPreset('large')">Large (190 Fields)</button>
          <button type="button" class="preset-btn" onclick="applyPreset('ultra')">Ultra (500 Fields)</button>
          <button type="button" class="preset-btn" onclick="clearAll()">Clear All</button>
        </div>
        
        <div class="form-group">
          <h3>Field Configuration:</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 5px;"><label>Text Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Text" min="0" max="1000" value="0" onchange="updateTotal()"></td>
              <td style="padding: 5px;"><label>Number Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Number" min="0" max="1000" value="0" onchange="updateTotal()"></td>
            </tr>
            <tr>
              <td style="padding: 5px;"><label>TextArea Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="TextArea" min="0" max="1000" value="0" onchange="updateTotal()"></td>
              <td style="padding: 5px;"><label>Currency Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Currency" min="0" max="1000" value="0" onchange="updateTotal()"></td>
            </tr>
            <tr>
              <td style="padding: 5px;"><label>Email Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Email" min="0" max="1000" value="0" onchange="updateTotal()"></td>
              <td style="padding: 5px;"><label>Phone Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Phone" min="0" max="1000" value="0" onchange="updateTotal()"></td>
            </tr>
            <tr>
              <td style="padding: 5px;"><label>Date Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Date" min="0" max="1000" value="0" onchange="updateTotal()"></td>
              <td style="padding: 5px;"><label>Checkbox Fields:</label></td>
              <td style="padding: 5px;"><input type="number" id="Checkbox" min="0" max="1000" value="0" onchange="updateTotal()"></td>
            </tr>
          </table>
        </div>
        
        <div class="form-group">
          <strong>Total Fields: <span id="totalFields">0</span></strong>
        </div>
        
        <input type="hidden" id="fieldConfigs" name="fieldConfigs">
        <input type="hidden" name="generationMode" value="bulk">
        
        <button type="submit">Create Objects</button>
      </form>

      <!-- Delete Objects Section -->
      <hr style="margin: 40px 0; border: 1px solid #ddd;">
      
      <h2>🗑️ Delete Custom Objects</h2>
      <div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107;">
        <strong>Warning:</strong> This will permanently delete custom objects matching the pattern. Use with caution!
      </div>
      
      <form method="post" action="/delete-objects">
        <div class="form-group">
          <label for="deletePattern">Delete Pattern (e.g., "CustomObjectMaster" to delete all test objects):</label>
          <input type="text" id="deletePattern" name="deletePattern" placeholder="CustomObjectMaster" required>
          <small style="color: #666;">Objects containing this text will be deleted</small>
        </div>
        <button type="submit" style="background: #dc3545;">Delete Matching Objects</button>
      </form>

      <!-- Bulk Upload Section -->
      <hr style="margin: 40px 0; border: 1px solid #ddd;">
      
      <h2>📤 Bulk Upload Data</h2>
      <div class="info" style="background: #d1ecf1; border-left: 4px solid #17a2b8;">
        <strong>Bulk Upload Instructions:</strong>
        <ul>
          <li>Upload a CSV file with column headers matching Salesforce field API names</li>
          <li>Specify the target object type (e.g., Account, Contact, or custom object API name)</li>
          <li>Maximum 10,000 records per upload recommended</li>
          <li>Example CSV format: Name,Email__c,Phone__c</li>
        </ul>
      </div>
      
      <form method="post" action="/bulk-upload" enctype="multipart/form-data">
        <div class="form-group">
          <label for="objectType">Target Object Type:</label>
          <input type="text" id="objectType" name="objectType" placeholder="Account, Contact, or CustomObject__c" required>
          <small style="color: #666;">Enter the API name of the Salesforce object</small>
        </div>
        
        <div class="form-group">
          <label for="csvFile">CSV File:</label>
          <input type="file" id="csvFile" name="csvFile" accept=".csv" required>
          <small style="color: #666;">Select a CSV file with your data</small>
        </div>
        
        <button type="submit" style="background: #17a2b8;">Upload Data</button>
      </form>

      <!-- CSV Generation Section -->
      <hr style="margin: 40px 0; border: 1px solid #ddd;">
      
      <h2>📄 Generate CSV Template</h2>
      <div class="info" style="background: #d4edda; border-left: 4px solid #28a745;">
        <strong>CSV Generation Instructions:</strong>
        <ul>
          <li>Generate CSV templates based on existing Salesforce object schemas</li>
          <li>Specify object name and number of sample records</li>
          <li>Generated CSV will match the object's field structure</li>
          <li>Use generated CSV as template for bulk uploads</li>
        </ul>
      </div>
      
      <form method="post" action="/generate-csv">
        <div class="form-group">
          <label for="csvObjectName">Object Name:</label>
          <input type="text" id="csvObjectName" name="objectName" placeholder="CustomObjectMaster96826__c" required>
          <small style="color: #666;">Enter the API name of the Salesforce object</small>
        </div>
        
        <div class="form-group">
          <label for="recordCount">Number of Sample Records:</label>
          <input type="number" id="recordCount" name="recordCount" min="1" max="1000" value="10" required>
          <small style="color: #666;">Number of sample records to generate (1-1000)</small>
        </div>
        
        <button type="submit" style="background: #28a745;">Generate CSV Template</button>
      </form>
      
      <!-- Object Schema Inspector -->
      <hr style="margin: 40px 0; border: 1px solid #ddd;">
      
      <h2>🔍 Object Schema Inspector</h2>
      <div class="info" style="background: #fff3cd; border-left: 4px solid #ffc107;">
        <strong>Schema Inspector:</strong> View field details for any Salesforce object to understand its structure before creating CSV templates.
      </div>
      
      <form method="post" action="/get-schema">
        <div class="form-group">
          <label for="schemaObjectName">Object Name:</label>
          <input type="text" id="schemaObjectName" name="objectName" placeholder="CustomObjectMaster96826__c" required>
          <small style="color: #666;">Enter the API name to inspect its schema</small>
        </div>
        
        <button type="submit" style="background: #ffc107; color: #212529;">Inspect Schema</button>
      </form>
      
      <!-- Field Permissions Fix -->
      <hr style="margin: 40px 0; border: 1px solid #ddd;">
      
      <h2>🔐 Fix Field Permissions</h2>
      <div class="info" style="background: #f8d7da; border-left: 4px solid #dc3545;">
        <strong>Field Visibility Issue?</strong> If your custom fields are visible in Salesforce UI but not accessible via API/Workbench, this will create a Permission Set to grant field access.
      </div>
      
      <form method="post" action="/fix-field-permissions">
        <div class="form-group">
          <label for="permObjectName">Object Name:</label>
          <input type="text" id="permObjectName" name="objectName" placeholder="CustomObjectMaster3241__c" required>
          <small style="color: #666;">Enter the API name of the object with permission issues</small>
        </div>
        
        <button type="submit" style="background: #dc3545;">Fix Field Permissions</button>
      </form>

      <script>
        const fieldTypes = ['Text', 'TextArea', 'Number', 'Currency', 'Email', 'Phone', 'Date', 'Checkbox'];
        
        function updateTotal() {
          let total = 0;
          fieldTypes.forEach(type => {
            const value = parseInt(document.getElementById(type).value) || 0;
            total += value;
          });
          document.getElementById('totalFields').textContent = total;
        }
        
        function applyPreset(preset) {
          clearAll();
          const presets = {
            'basic': { Text: 20, Number: 10, Email: 10, Phone: 5, Date: 3, Checkbox: 2 },
            'large': { Text: 50, TextArea: 30, Number: 40, Currency: 30, Email: 20, Phone: 10, Date: 8, Checkbox: 2 },
            'ultra': { Text: 150, TextArea: 75, Number: 100, Currency: 50, Email: 40, Phone: 15, Date: 5, Checkbox: 65 }
          };
          
          const config = presets[preset];
          if (config) {
            Object.keys(config).forEach(type => {
              const element = document.getElementById(type);
              if (element) {
                element.value = config[type];
              }
            });
            updateTotal();
          }
        }
        
        function clearAll() {
          fieldTypes.forEach(type => {
            document.getElementById(type).value = 0;
          });
          updateTotal();
        }
        
        document.querySelector('form').addEventListener('submit', function(e) {
          const config = {};
          let total = 0;
          
          fieldTypes.forEach(type => {
            const value = parseInt(document.getElementById(type).value) || 0;
            if (value > 0) {
              config[type] = value;
              total += value;
            }
          });
          
          if (total === 0) {
            alert('Please specify at least one field type or use a preset button.');
            e.preventDefault();
            return;
          }
          
          document.getElementById('fieldConfigs').value = JSON.stringify(config);
        });
        
        updateTotal();
      </script>
    </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
}); 