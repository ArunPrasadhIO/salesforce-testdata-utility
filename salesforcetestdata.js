const jsforce = require("jsforce");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" }); // Set up multer for file uploads

// const username = 'celigo_di_e2e@celigo.com';
// const password = 'f@33P$wSdNVpp1ls';

// const username = "celigo_di_nfr@celigo.com";
// const password = 'Yj@A80MQTW*HfMsV';
// const password = "Yj@A80MQTW*HfMsV" + "xTn3ov1h5S7iLCAjKNJkN1bz";


// const username = "celigo_di7@celigo.com";
// const password = "$MZJoN9pe1tEagz9" + "Ilmf2rQgX0ZDohuuYOTwz75c";

const username = "celigo_di8@celigo.com";
const password = "&45jn#REcZ!pEy87" + "XR0u7bKDCHmwqkr6Tk7chZzA";




const conn = new jsforce.Connection({
  version: "55.0", // Specify the API version here
});
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function loggingin() {
  try {
    const userInfo = await conn.login(username, password);
    console.log(
      "Connected to Salesforce account: " + username + ": " + userInfo.id
    );
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

    // Check generation mode (manual or bulk)
    const generationMode = req.body.generationMode || 'manual';
    console.log(`Field generation mode: ${generationMode}`);

    let fieldConfigs = [];

    if (generationMode === 'manual') {
      // Parse field configurations from user input (existing logic)
      fieldConfigs = JSON.parse(req.body.fieldConfigs || '[]');
      if (fieldConfigs.length === 0) {
        console.log("No field configurations specified");
        return res.status(400).send("At least one field configuration is required");
      }
    } else {
      // Generate field configurations from bulk input
      const bulkConfig = JSON.parse(req.body.fieldConfigs || '{}');
      fieldConfigs = generateBulkFieldConfigs(bulkConfig);
      if (fieldConfigs.length === 0) {
        console.log("No bulk field configurations specified");
        return res.status(400).send("At least one field type with quantity > 0 is required");
      }
    }

    console.log(`Total fields per object: ${fieldConfigs.length}`);

    const createdObjectNames = [];

    // Function to generate bulk field configurations
    function generateBulkFieldConfigs(bulkConfig) {
      const configs = [];
      
      // Default configurations for each field type
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

      // Generate field configurations for each type
      Object.keys(bulkConfig).forEach(fieldType => {
        const quantity = bulkConfig[fieldType];
        if (quantity > 0) {
          for (let i = 1; i <= quantity; i++) {
            const fieldConfig = {
              name: `${fieldType}Field${i}`,
              label: `${fieldType} Field ${i}`,
              type: fieldType,
              required: false, // Default to not required for bulk generation
              ...fieldDefaults[fieldType] // Spread the default properties
            };
            configs.push(fieldConfig);
          }
        }
      });

      return configs;
    }

    const createCustomObject = async (index) => {
      const randomNum = Math.floor(Math.random() * 100000); // Generate a random number
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
      };

      try {
        const result = await conn.metadata.create("CustomObject", customObject);
        if (!result.success) {
          throw new Error(
            `Error creating custom object ${index}: ${JSON.stringify(
              result.errors
            )}`
          );
        }
        console.log(
          `Custom object ${index} created successfully: ${result.fullName}`
        );
        createdObjectNames.push(customObjectName);

        // Create dynamic custom fields based on user configuration
        const customFields = fieldConfigs.map((fieldConfig, fieldIndex) => {
          const baseField = {
            fullName: `${customObjectName}.${fieldConfig.name}__c`,
            label: fieldConfig.label,
            type: fieldConfig.type,
            required: fieldConfig.required || false,
          };

          // Add type-specific properties
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
            case 'Email':
            case 'Phone':
            case 'Url':
            case 'Date':
            case 'DateTime':
              // These types don't need additional properties
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
            case 'TextArea':
              // TextArea doesn't need additional properties in metadata
              break;
            default:
              console.warn(`Unknown field type: ${fieldConfig.type}`);
          }

          return baseField;
        });

        // Process fields in batches to avoid metadata API limits
        const batchSize = 10; // Salesforce metadata API limit is 10 records per operation
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
            
            // Handle single result vs array of results
            const results = Array.isArray(fieldResults) ? fieldResults : [fieldResults];
            
            results.forEach((fieldResult, i) => {
              const globalIndex = batchIndex * batchSize + i;
              if (fieldResult.success) {
                console.log(
                  `Custom field ${fieldConfigs[globalIndex]?.name} for object ${randomNum} created successfully: ${fieldResult.fullName}`
                );
              } else {
                console.error(
                  `Error creating custom field ${fieldConfigs[globalIndex]?.name} for object ${randomNum}: ${JSON.stringify(fieldResult.errors)}`
                );
              }
            });
            
            // Add a small delay between batches to avoid rate limiting
            if (batchIndex < fieldBatches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
            
          } catch (batchError) {
            console.error(`Error creating field batch ${batchIndex + 1} for object ${randomNum}: ${batchError.message}`);
            
            // If it's a rate limit error, add longer delay and retry
            if (batchError.message.includes('EXCEEDED_ID_LIMIT') || batchError.message.includes('REQUEST_LIMIT_EXCEEDED')) {
              console.log(`Rate limit hit, waiting 5 seconds before continuing...`);
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
            }
            // Continue with next batch instead of failing completely
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

      // Append the created object names to a file
      createdObjectNames.forEach((name) => {
        fs.appendFileSync("created_objects.txt", name + "\n", "utf8");
      });
      console.log(
        "Custom object names have been appended to created_objects.txt"
      );

      res.send(
        `${numberOfObjects} custom objects with ${fieldConfigs.length} fields each created successfully! (Mode: ${generationMode})`
      );
    };

    await createObjects();
  } catch (error) {
    console.error(`Error in /create-objects route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

app.post('/delete-objects', async (req, res) => {
  try {
    console.log('Received request to delete objects');
    const { accessToken, instanceUrl } = await loggingin();
    console.log('Successfully logged in to Salesforce');

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken
    });

    const prefix = req.body.prefix;
    if (!prefix) {
      console.log('Invalid prefix specified');
      return res.status(400).send('Invalid prefix specified');
    }
    console.log(`Prefix for objects to delete: ${prefix}`);

    // Query metadata to find custom objects that match the prefix
    const metadata = await conn.metadata.list([{ type: 'CustomObject' }]);
    const objectsToDelete = metadata.filter(obj => obj.fullName.startsWith(prefix));

    if (objectsToDelete.length === 0) {
      console.log('No matching custom objects found to delete');
      return res.status(404).send('No matching custom objects found to delete');
    }

    console.log(`Found ${objectsToDelete.length} custom objects to delete`);

    // Function to delete objects in batches
    const deleteInBatches = async (objects) => {
      const batchSize = 10;
      for (let i = 0; i < objects.length; i += batchSize) {
        const batch = objects.slice(i, i + batchSize);
        console.log(`Deleting batch: ${batch.map(obj => obj.fullName).join(', ')}`);
        const deleteResults = await conn.metadata.delete('CustomObject', batch.map(obj => obj.fullName));
        deleteResults.forEach((result, index) => {
          if (result.success) {
            console.log(`Custom object ${batch[index].fullName} deleted successfully`);
          } else {
            console.error(`Error deleting custom object ${batch[index].fullName}: ${result.errors}`);
          }
        });
      }
    };

    // Perform the deletion in batches
    await deleteInBatches(objectsToDelete);

    res.send(`Deleted ${objectsToDelete.length} custom objects successfully!`);
  } catch (error) {
    console.error(`Error in /delete-objects route: ${error.message}`);
    res.status(500).send(error.message);
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Received request to upload data");
    const { accessToken, instanceUrl } = await loggingin();
    console.log("Successfully logged in to Salesforce");

    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken,
    });

    const objectName = req.body.objectName;
    if (!objectName) {
      console.log("Invalid Salesforce object specified");
      return res.status(400).send("Invalid Salesforce object specified");
    }

    const filePath = req.file.path;
    const records = [];

    // Read CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        records.push(row);
      })
      .on("end", async () => {
        console.log("CSV file successfully processed");

        // Create bulk insert job
        const job = conn.bulk.createJob(objectName, "insert");
        const batch = job.createBatch();

        batch
          .execute(records)
          .on("response", (results) => {
            console.log("Bulk insert completed");
            results.forEach((result, index) => {
              if (result.success) {
                console.log(
                  `Record ${index + 1} inserted successfully, ID: ${result.id}`
                );
              } else {
                console.error(
                  `Error inserting record ${index + 1}: ${result.errors.join(
                    ", "
                  )}`
                );
              }
            });
            res.send("Bulk insert completed");
          })
          .on("error", (err) => {
            console.error("Bulk insert failed:", err);
            res.status(500).send("Bulk insert failed: " + err.message);
          });
      });
  } catch (error) {
    console.error(`Error in /upload route: ${error.message}`);
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
        .nav { background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .nav a { margin-right: 20px; text-decoration: none; color: #0066cc; font-weight: bold; }
        .nav a:hover { text-decoration: underline; }
        .field-config { border: 1px solid #ccc; padding: 15px; margin: 10px 0; background: #f9f9f9; }
        .bulk-config { border: 1px solid #ccc; padding: 15px; margin: 10px 0; background: #e8f5e8; }
        .field-row { margin: 5px 0; }
        .bulk-row { margin: 8px 0; display: flex; align-items: center; }
        .bulk-row label { width: 150px; }
        .bulk-row input { width: 80px; margin-left: 10px; }
        label { display: inline-block; width: 120px; font-weight: bold; }
        input, select, textarea { margin: 5px; padding: 5px; }
        button { padding: 10px 20px; margin: 5px; }
        .remove-btn { background: #ff4444; color: white; border: none; padding: 5px 10px; }
        .add-btn { background: #44aa44; color: white; border: none; }
        .submit-btn { background: #0066cc; color: white; border: none; }
        .mode-btn { background: #6c757d; color: white; border: none; padding: 8px 16px; margin: 5px; }
        .mode-btn.active { background: #0066cc; }
        .type-specific { margin-top: 10px; padding: 10px; background: #fff; }
        .hidden { display: none; }
        .info { background: #e6f3ff; padding: 10px; border-left: 4px solid #0066cc; margin: 10px 0; }
        .mode-section { margin: 20px 0; padding: 15px; border: 2px solid #ddd; border-radius: 5px; }
        .total-fields { font-weight: bold; color: #0066cc; margin-top: 10px; }
        .validation-error { background: #ffe6e6; border: 2px solid #ff4444; color: #cc0000; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .validation-success { background: #e6ffe6; border: 2px solid #44aa44; color: #006600; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .field-error { border: 2px solid #ff4444 !important; }
        .submit-btn:disabled { background: #cccccc; cursor: not-allowed; }
      </style>
    </head>
    <body>
      <div class="nav">
        <a href="/">Create Objects</a>
        <a href="/delete">Delete Objects</a>
        <a href="/bulkinsertdata">Bulk Insert Data</a>
      </div>
      
      <h1>Create Salesforce Custom Objects</h1>
      
      <div class="info">
        <strong>Instructions:</strong>
        <ul>
          <li>Specify the number of custom objects to create</li>
          <li>Choose between Manual Field Configuration or Bulk Field Generation</li>
          <li>Each object will have a unique name with random number (e.g., CustomObjectMaster12345__c)</li>
          <li>All objects will have the same field structure as configured below</li>
          <li><strong>Processing Time:</strong> ~1 minute per 10 fields due to Salesforce API limits</li>
        </ul>
      </div>
      
      <form id="objectForm" method="post" action="/create-objects">
        <div class="field-row">
          <label for="numberOfObjects">Number of Objects:</label>
          <input type="number" id="numberOfObjects" name="numberOfObjects" min="1" max="50" required>
        </div>
        
        <h3>Field Configuration Mode</h3>
        <div>
          <button type="button" class="mode-btn active" id="manualModeBtn" onclick="switchMode('manual')">Manual Configuration</button>
          <button type="button" class="mode-btn" id="bulkModeBtn" onclick="switchMode('bulk')">Bulk Generation</button>
        </div>
        
        <!-- Manual Field Configuration Section -->
        <div id="manualSection" class="mode-section">
          <h4>Manual Field Configuration</h4>
          <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
            <button type="button" class="mode-btn" onclick="addDemoFields()">Quick Demo (3 Fields)</button>
            <button type="button" class="mode-btn" onclick="clearManualFields()">Clear All Fields</button>
          </div>
          <div id="fieldsContainer">
            <!-- Manual fields will be added here dynamically -->
          </div>
          <button type="button" class="add-btn" onclick="addField()">+ Add Field</button>
        </div>
        
        <!-- Bulk Field Generation Section -->
        <div id="bulkSection" class="mode-section hidden">
          <h4>Bulk Field Generation</h4>
          <p>Specify how many fields of each type to create. Fields will be auto-named (e.g., TextField1, TextField2, NumberField1, etc.)</p>
          
          <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
            <h5>Quick Presets:</h5>
            <button type="button" class="mode-btn" onclick="applyPreset('basic')">Basic (50 Fields)</button>
            <button type="button" class="mode-btn" onclick="applyPreset('comprehensive')">Comprehensive (100 Fields)</button>
            <button type="button" class="mode-btn" onclick="applyPreset('large')">Large (190 Fields)</button>
            <button type="button" class="mode-btn" onclick="applyPreset('massive')">Massive (375 Fields)</button>
            <button type="button" class="mode-btn" onclick="applyPreset('ultra')">Ultra (500 Fields)</button>
            <button type="button" class="mode-btn" onclick="clearAllFields()">Clear All</button>
          </div>
          
          <div class="bulk-config">
            <h5>Text Fields</h5>
            <div class="bulk-row">
              <label>Text Fields:</label>
              <input type="number" id="bulk_Text" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Length: 255, Basic text fields)</small>
            </div>
            <div class="bulk-row">
              <label>TextArea Fields:</label>
              <input type="number" id="bulk_TextArea" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Multi-line text)</small>
            </div>
            <div class="bulk-row">
              <label>LongTextArea Fields:</label>
              <input type="number" id="bulk_LongTextArea" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Length: 32,768, Large text areas)</small>
            </div>
          </div>
          
          <div class="bulk-config">
            <h5>Numeric Fields</h5>
            <div class="bulk-row">
              <label>Number Fields:</label>
              <input type="number" id="bulk_Number" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Precision: 18, Scale: 0)</small>
            </div>
            <div class="bulk-row">
              <label>Currency Fields:</label>
              <input type="number" id="bulk_Currency" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Precision: 16, Scale: 2)</small>
            </div>
            <div class="bulk-row">
              <label>Percent Fields:</label>
              <input type="number" id="bulk_Percent" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Precision: 3, Scale: 0)</small>
            </div>
          </div>
          
          <div class="bulk-config">
            <h5>Special Fields</h5>
            <div class="bulk-row">
              <label>Email Fields:</label>
              <input type="number" id="bulk_Email" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Email validation)</small>
            </div>
            <div class="bulk-row">
              <label>Phone Fields:</label>
              <input type="number" id="bulk_Phone" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Phone number format)</small>
            </div>
            <div class="bulk-row">
              <label>URL Fields:</label>
              <input type="number" id="bulk_Url" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(URL validation)</small>
            </div>
            <div class="bulk-row">
              <label>Date Fields:</label>
              <input type="number" id="bulk_Date" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Date only)</small>
            </div>
            <div class="bulk-row">
              <label>DateTime Fields:</label>
              <input type="number" id="bulk_DateTime" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Date and time)</small>
            </div>
          </div>
          
          <div class="bulk-config">
            <h5>Other Fields</h5>
            <div class="bulk-row">
              <label>Checkbox Fields:</label>
              <input type="number" id="bulk_Checkbox" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Boolean true/false, default: false)</small>
            </div>
            <div class="bulk-row">
              <label>Picklist Fields:</label>
              <input type="number" id="bulk_Picklist" min="0" max="1000" value="0" onchange="updateTotal()">
              <small>(Option1, Option2, Option3)</small>
            </div>
          </div>
          
          <div class="total-fields" id="totalFields">Total Fields: 0</div>
        </div>
        
        <br>
        <div id="validationMessage" style="display: none;"></div>
        <button type="submit" class="submit-btn" id="submitBtn">Create Objects</button>
        
        <input type="hidden" id="fieldConfigs" name="fieldConfigs">
        <input type="hidden" id="generationMode" name="generationMode" value="manual">
      </form>

      <script>
        let fieldCount = 0;
        let currentMode = 'manual';

        // Salesforce field types with their specific properties
        const fieldTypes = {
          'Text': { length: true },
          'LongTextArea': { length: true, visibleLines: true },
          'TextArea': {},
          'Number': { precision: true, scale: true },
          'Currency': { precision: true, scale: true },
          'Percent': { precision: true, scale: true },
          'Email': {},
          'Phone': {},
          'Url': {},
          'Checkbox': { defaultValue: true },
          'Date': {},
          'DateTime': {},
          'Picklist': { picklistValues: true }
        };

        function switchMode(mode) {
          currentMode = mode;
          document.getElementById('generationMode').value = mode;
          
          if (mode === 'manual') {
            document.getElementById('manualSection').classList.remove('hidden');
            document.getElementById('bulkSection').classList.add('hidden');
            document.getElementById('manualModeBtn').classList.add('active');
            document.getElementById('bulkModeBtn').classList.remove('active');
          } else {
            document.getElementById('manualSection').classList.add('hidden');
            document.getElementById('bulkSection').classList.remove('hidden');
            document.getElementById('manualModeBtn').classList.remove('active');
            document.getElementById('bulkModeBtn').classList.add('active');
          }
        }

        function updateTotal() {
          const fieldTypes = ['Text', 'TextArea', 'LongTextArea', 'Number', 'Currency', 'Percent', 
                             'Email', 'Phone', 'Url', 'Date', 'DateTime', 'Checkbox', 'Picklist'];
          
          let total = 0;
          fieldTypes.forEach(type => {
            const value = parseInt(document.getElementById('bulk_' + type).value) || 0;
            total += value;
          });
          
          document.getElementById('totalFields').textContent = 'Total Fields: ' + total;
        }

        function clearAllFields() {
          const fieldTypes = ['Text', 'TextArea', 'LongTextArea', 'Number', 'Currency', 'Percent', 
                             'Email', 'Phone', 'Url', 'Date', 'DateTime', 'Checkbox', 'Picklist'];
          
          fieldTypes.forEach(type => {
            document.getElementById('bulk_' + type).value = 0;
          });
          updateTotal();
        }

        function applyPreset(presetType) {
          clearAllFields(); // Start with a clean slate
          
          const presets = {
            'basic': {
              Text: 20,
              Number: 10,
              Email: 5,
              Phone: 5,
              Date: 5,
              Checkbox: 5
            },
            'comprehensive': {
              Text: 30,
              TextArea: 10,
              LongTextArea: 5,
              Number: 15,
              Currency: 10,
              Email: 10,
              Phone: 5,
              Url: 5,
              Date: 5,
              DateTime: 3,
              Checkbox: 2
            },
            'large': {
              Text: 50,
              TextArea: 20,
              LongTextArea: 10,
              Number: 30,
              Currency: 20,
              Percent: 10,
              Email: 15,
              Phone: 10,
              Url: 5,
              Date: 8,
              DateTime: 7,
              Checkbox: 3,
              Picklist: 2
            },
            'massive': {
              Text: 100,
              TextArea: 40,
              LongTextArea: 20,
              Number: 60,
              Currency: 40,
              Percent: 20,
              Email: 30,
              Phone: 20,
              Url: 10,
              Date: 15,
              DateTime: 12,
              Checkbox: 5,
              Picklist: 3
            },
            'ultra': {
              Text: 150,
              TextArea: 75,
              LongTextArea: 25,
              Number: 100,
              Currency: 50,
              Percent: 25,
              Email: 40,
              Phone: 15,
              Url: 10,
              Date: 5,
              DateTime: 3,
              Checkbox: 1,
              Picklist: 1
            }
          };
          
          const preset = presets[presetType];
          if (preset) {
            Object.keys(preset).forEach(type => {
              const element = document.getElementById('bulk_' + type);
              if (element) {
                element.value = preset[type];
              }
            });
            updateTotal();
          }
        }

        function addField() {
          fieldCount++;
          const container = document.getElementById('fieldsContainer');
          
          const fieldDiv = document.createElement('div');
          fieldDiv.className = 'field-config';
          fieldDiv.id = 'field_' + fieldCount;
          
          fieldDiv.innerHTML = '<div class="field-row">' +
              '<button type="button" class="remove-btn" onclick="removeField(' + fieldCount + ')">Remove</button>' +
              '<h4>Field ' + fieldCount + '</h4>' +
            '</div>' +
            '<div class="field-row">' +
              '<label>Field Name:</label>' +
              '<input type="text" id="name_' + fieldCount + '" placeholder="e.g., CustomerEmail" required>' +
            '</div>' +
            '<div class="field-row">' +
              '<label>Field Label:</label>' +
              '<input type="text" id="label_' + fieldCount + '" placeholder="e.g., Customer Email" required>' +
            '</div>' +
            '<div class="field-row">' +
              '<label>Field Type:</label>' +
              '<select id="type_' + fieldCount + '" onchange="updateFieldProperties(' + fieldCount + ')" required>' +
                '<option value="">Select Type</option>' +
                Object.keys(fieldTypes).map(type => '<option value="' + type + '">' + type + '</option>').join('') +
              '</select>' +
            '</div>' +
            '<div class="field-row">' +
              '<label>Required:</label>' +
              '<input type="checkbox" id="required_' + fieldCount + '">' +
            '</div>' +
            '<div id="typeSpecific_' + fieldCount + '" class="type-specific hidden">' +
              '<!-- Type-specific properties will be added here -->' +
            '</div>';
          
          container.appendChild(fieldDiv);
        }

        function removeField(fieldId) {
          const fieldDiv = document.getElementById('field_' + fieldId);
          fieldDiv.remove();
        }

        function updateFieldProperties(fieldId) {
          const typeSelect = document.getElementById('type_' + fieldId);
          const typeSpecificDiv = document.getElementById('typeSpecific_' + fieldId);
          const selectedType = typeSelect.value;
          
          if (!selectedType) {
            typeSpecificDiv.className = 'type-specific hidden';
            return;
          }
          
          typeSpecificDiv.className = 'type-specific';
          const properties = fieldTypes[selectedType];
          
          let html = '';
          
          if (properties.length) {
            html += `
              <div class="field-row">
                <label>Length:</label>
                <input type="number" id="length_${fieldId}" value="${selectedType === 'Text' ? '255' : selectedType === 'LongTextArea' ? '32768' : '255'}" min="1">
              </div>
            `;
          }
          
          if (properties.visibleLines) {
            html += `
              <div class="field-row">
                <label>Visible Lines:</label>
                <input type="number" id="visibleLines_${fieldId}" value="3" min="1" max="10">
              </div>
            `;
          }
          
          if (properties.precision) {
            const defaultPrecision = selectedType === 'Currency' ? '16' : selectedType === 'Percent' ? '3' : '18';
            html += `
              <div class="field-row">
                <label>Precision:</label>
                <input type="number" id="precision_${fieldId}" value="${defaultPrecision}" min="1" max="18">
              </div>
            `;
          }
          
          if (properties.scale) {
            const defaultScale = selectedType === 'Currency' ? '2' : '0';
            html += `
              <div class="field-row">
                <label>Scale:</label>
                <input type="number" id="scale_${fieldId}" value="${defaultScale}" min="0" max="17">
              </div>
            `;
          }
          
          if (properties.defaultValue) {
            html += `
              <div class="field-row">
                <label>Default Value:</label>
                <select id="defaultValue_${fieldId}">
                  <option value="false">False</option>
                  <option value="true">True</option>
                </select>
              </div>
            `;
          }
          
          if (properties.picklistValues) {
            html += `
              <div class="field-row">
                <label>Picklist Values:</label>
                <textarea id="picklistValues_${fieldId}" placeholder="Enter values separated by commas\ne.g., Option1, Option2, Option3" rows="3" cols="30"></textarea>
                <small>Enter comma-separated values</small>
              </div>
            `;
          }
          
          typeSpecificDiv.innerHTML = html;
        }

        function addDemoFields() {
          clearManualFields(); // Clear any existing manual fields
          
          // Add first field - Text
          addField();
          document.getElementById('name_1').value = 'CustomerName';
          document.getElementById('label_1').value = 'Customer Name';
          document.getElementById('type_1').value = 'Text';
          updateFieldProperties(1);
          
          // Add second field - Email
          addField();
          document.getElementById('name_2').value = 'CustomerEmail';
          document.getElementById('label_2').value = 'Customer Email';
          document.getElementById('type_2').value = 'Email';
          document.getElementById('required_2').checked = true;
          updateFieldProperties(2);
          
          // Add third field - Number
          addField();
          document.getElementById('name_3').value = 'CustomerAge';
          document.getElementById('label_3').value = 'Customer Age';
          document.getElementById('type_3').value = 'Number';
          updateFieldProperties(3);
        }

        function clearManualFields() {
          // Remove all manual field divs
          const container = document.getElementById('fieldsContainer');
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          fieldCount = 0; // Reset field counter
        }

        // Form submission handler
        document.getElementById('objectForm').addEventListener('submit', function(e) {
          const validationMessage = document.getElementById('validationMessage');
          const submitBtn = document.getElementById('submitBtn');
          
          // Reset validation display
          validationMessage.textContent = '';
          validationMessage.style.display = 'none';
          validationMessage.className = '';

          if (currentMode === 'manual') {
            // Handle manual field configuration
            const fieldConfigs = [];
            let hasValidationErrors = false;
            
            for (let i = 1; i <= fieldCount; i++) {
              const fieldDiv = document.getElementById('field_' + i);
              if (!fieldDiv) continue;
              
              const name = document.getElementById('name_' + i)?.value?.trim();
              const label = document.getElementById('label_' + i)?.value?.trim();
              const type = document.getElementById('type_' + i)?.value;
              const required = document.getElementById('required_' + i)?.checked;
              
              // Check for incomplete fields
              if (!name || !label || !type) {
                if (name || label || type) { // Only show error if partially filled
                  hasValidationErrors = true;
                  validationMessage.textContent += 'Field ' + i + ': Please fill in Name, Label, and Type.\n';
                }
                continue;
              }
              
              const fieldConfig = { name, label, type, required };
              
              // Add type-specific properties
              const properties = fieldTypes[type];
              
              if (properties.length) {
                const length = document.getElementById('length_' + i)?.value;
                if (length) fieldConfig.length = parseInt(length);
              }
              
              if (properties.visibleLines) {
                const visibleLines = document.getElementById('visibleLines_' + i)?.value;
                if (visibleLines) fieldConfig.visibleLines = parseInt(visibleLines);
              }
              
              if (properties.precision) {
                const precision = document.getElementById('precision_' + i)?.value;
                if (precision) fieldConfig.precision = parseInt(precision);
              }
              
              if (properties.scale) {
                const scale = document.getElementById('scale_' + i)?.value;
                if (scale) fieldConfig.scale = parseInt(scale);
              }
              
              if (properties.defaultValue) {
                const defaultValue = document.getElementById('defaultValue_' + i)?.value;
                fieldConfig.defaultValue = defaultValue === 'true';
              }
              
              if (properties.picklistValues) {
                const picklistValues = document.getElementById('picklistValues_' + i)?.value;
                if (picklistValues) {
                  fieldConfig.picklistValues = picklistValues.split(',').map(v => v.trim()).filter(v => v);
                }
              }
              
              fieldConfigs.push(fieldConfig);
            }
            
            if (fieldConfigs.length === 0 && fieldCount > 0) {
              hasValidationErrors = true;
              validationMessage.textContent += 'Please complete at least one field configuration or use the Quick Demo button.\n';
            }
            
            if (fieldConfigs.length === 0 && fieldCount === 0) {
              hasValidationErrors = true;
              validationMessage.textContent += 'Please add at least one field using the "+ Add Field" button or click "Quick Demo (3 Fields)".\n';
            }
            
            if (hasValidationErrors) {
              validationMessage.className = 'validation-error';
              validationMessage.style.display = 'block';
              e.preventDefault();
              return;
            }
            
            // Show success message
            validationMessage.textContent = 'Creating ' + fieldConfigs.length + ' fields per object...';
            validationMessage.className = 'validation-success';
            validationMessage.style.display = 'block';
            
            document.getElementById('fieldConfigs').value = JSON.stringify(fieldConfigs);
            
          } else {
            // Handle bulk field generation
            const bulkConfig = {};
            const fieldTypesList = ['Text', 'TextArea', 'LongTextArea', 'Number', 'Currency', 'Percent', 
                                   'Email', 'Phone', 'Url', 'Date', 'DateTime', 'Checkbox', 'Picklist'];
            
            let totalFields = 0;
            fieldTypesList.forEach(type => {
              const value = parseInt(document.getElementById('bulk_' + type).value) || 0;
              if (value > 0) {
                bulkConfig[type] = value;
                totalFields += value;
              }
            });
            
            if (totalFields === 0) {
              validationMessage.textContent = 'Please specify field quantities by entering numbers or clicking a preset button (Basic, Large, Ultra, etc.).';
              validationMessage.className = 'validation-error';
              validationMessage.style.display = 'block';
              e.preventDefault();
              return;
            }
            
            // Show success message
            validationMessage.textContent = 'Creating ' + totalFields + ' fields per object. This may take about ' + Math.ceil(totalFields / 10) + ' minutes...';
            validationMessage.className = 'validation-success';
            validationMessage.style.display = 'block';
            
            document.getElementById('fieldConfigs').value = JSON.stringify(bulkConfig);
          }
          
          // Disable submit button to prevent double submission
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating Objects...';
        });

        // Don't add field by default - let users choose Quick Demo or add manually
      </script>
    </body>
    </html>
  `);
});

app.get("/delete", (req, res) => {
  res.send(`
      <form method="post" action="/delete-objects">
        <label for="prefix">Prefix of Custom Objects to Delete:</label>
        <input type="text" id="prefix" name="prefix" required>
        <button type="submit">Delete</button>
      </form>
    `);
});

app.get("/bulkinsertdata", (req, res) => {
  res.send(`
      <form method="post" action="/upload" enctype="multipart/form-data">
        <label for="objectName">Salesforce Object:</label>
        <input type="text" id="objectName" name="objectName" required>
        <label for="file">CSV File:</label>
        <input type="file" id="file" name="file" accept=".csv" required>
        <button type="submit">Upload</button>
      </form>
    `);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
