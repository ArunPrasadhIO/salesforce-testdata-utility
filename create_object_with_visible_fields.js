const jsforce = require("jsforce");

const username = "celigo_di8@celigo.com";
const password = "&45jn#REcZ!pEy87" + "XR0u7bKDCHmwqkr6Tk7chZzA";

async function createObjectWithVisibleFields() {
  const conn = new jsforce.Connection({ version: "55.0" });
  
  try {
    // Login
    await conn.login(username, password);
    console.log("✅ Connected to Salesforce");

    const randomNum = Math.floor(Math.random() * 100000);
    const objectName = `TestObjectComplete${randomNum}__c`;
    
    console.log(`🏗️ Creating object: ${objectName}`);
    
    // Step 1: Create Custom Object
    const customObject = {
      fullName: objectName,
      label: `Test Object ${randomNum}`,
      pluralLabel: `Test Objects ${randomNum}`,
      nameField: {
        type: "Text",
        label: `Test Object ${randomNum} Name`,
      },
      deploymentStatus: "Deployed",
      sharingModel: "ReadWrite",
      enableActivities: true,
      enableBulkApi: true,
      enableReports: true,
      enableSearch: true
    };

    const objectResult = await conn.metadata.create("CustomObject", customObject);
    if (!objectResult.success) {
      throw new Error(`Failed to create object: ${JSON.stringify(objectResult.errors)}`);
    }
    console.log(`✅ Object created: ${objectName}`);

    // Step 2: Create Custom Fields
    const fieldConfigs = [
      { name: "Description", label: "Description", type: "LongTextArea", length: 32768 },
      { name: "Priority", label: "Priority", type: "Picklist", picklistValues: ["High", "Medium", "Low"] },
      { name: "Amount", label: "Amount", type: "Currency", precision: 16, scale: 2 },
      { name: "Quantity", label: "Quantity", type: "Number", precision: 10, scale: 0 },
      { name: "ContactEmail", label: "Contact Email", type: "Email" },
      { name: "IsActive", label: "Is Active", type: "Checkbox", defaultValue: true },
      { name: "StartDate", label: "Start Date", type: "Date" },
      { name: "CompletionDate", label: "Completion Date", type: "DateTime" }
    ];

    console.log(`🔧 Creating ${fieldConfigs.length} custom fields...`);
    
    const customFields = fieldConfigs.map(config => {
      const field = {
        fullName: `${objectName}.${config.name}__c`,
        label: config.label,
        type: config.type,
        required: false
      };

      // Add type-specific properties
      switch (config.type) {
        case 'LongTextArea':
          field.length = config.length;
          field.visibleLines = 3;
          break;
        case 'Currency':
          field.precision = config.precision;
          field.scale = config.scale;
          break;
        case 'Number':
          field.precision = config.precision;
          field.scale = config.scale;
          break;
        case 'Checkbox':
          field.defaultValue = config.defaultValue;
          break;
        case 'Picklist':
          field.valueSet = {
            valueSetDefinition: {
              value: config.picklistValues.map(val => ({
                fullName: val,
                default: val === "Medium",
                label: val
              }))
            }
          };
          break;
      }

      return field;
    });

    // Create fields in batches
    for (let i = 0; i < customFields.length; i += 3) {
      const batch = customFields.slice(i, i + 3);
      console.log(`   Creating batch ${Math.floor(i/3) + 1}/${Math.ceil(customFields.length/3)} (${batch.length} fields)`);
      
      const fieldResults = await conn.metadata.create("CustomField", batch);
      const results = Array.isArray(fieldResults) ? fieldResults : [fieldResults];
      
      results.forEach((result, idx) => {
        if (result.success) {
          console.log(`   ✅ ${batch[idx].label} field created`);
        } else {
          console.error(`   ❌ Failed to create ${batch[idx].label}: ${JSON.stringify(result.errors)}`);
        }
      });
      
      // Wait between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 3: Create Permission Set for Field Access
    console.log(`🔐 Creating permission set for field access...`);
    
    const permissionSetName = `${objectName.replace('__c', '')}_Access`;
    const permissionSet = {
      fullName: permissionSetName,
      label: `Full Access to ${objectName}`,
      description: `Grants full access to ${objectName} and all its custom fields`,
      hasActivationRequired: false,
      objectPermissions: [{
        object: objectName,
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        allowRead: true,
        modifyAllRecords: true,
        viewAllRecords: true
      }],
      fieldPermissions: [
        // Standard fields
        {
          field: `${objectName}.Name`,
          readable: true,
          editable: true
        },
        // Custom fields
        ...fieldConfigs.map(config => ({
          field: `${objectName}.${config.name}__c`,
          readable: true,
          editable: true
        }))
      ]
    };

    const permResult = await conn.metadata.create("PermissionSet", permissionSet);
    if (permResult.success) {
      console.log(`✅ Permission set created: ${permissionSetName}`);
    } else {
      console.error(`❌ Failed to create permission set: ${JSON.stringify(permResult.errors)}`);
    }

    // Step 4: Wait and verify
    console.log(`⏳ Waiting 30 seconds for metadata deployment...`);
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 5: Test field visibility
    console.log(`🔍 Testing field visibility...`);
    try {
      const objectDesc = await conn.sobject(objectName).describe();
      const customFieldsFound = objectDesc.fields.filter(f => f.custom && f.name.endsWith('__c'));
      
      console.log(`\n📊 Results:`);
      console.log(`   Object: ${objectName}`);
      console.log(`   Total fields: ${objectDesc.fields.length}`);
      console.log(`   Custom fields visible: ${customFieldsFound.length}/${fieldConfigs.length}`);
      
      if (customFieldsFound.length > 0) {
        console.log(`\n📋 Visible custom fields:`);
        customFieldsFound.forEach(field => {
          console.log(`   • ${field.name} (${field.type}) - ${field.label}`);
        });
      }

      // Save object name to file
      require('fs').appendFileSync('created_objects.txt', objectName + '\n', 'utf8');
      
      return {
        objectName,
        permissionSetName,
        totalFields: objectDesc.fields.length,
        customFieldsVisible: customFieldsFound.length,
        expectedCustomFields: fieldConfigs.length,
        success: customFieldsFound.length === fieldConfigs.length
      };

    } catch (describeError) {
      console.error(`❌ Error describing object: ${describeError.message}`);
      return { objectName, error: describeError.message };
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

// Run the function
createObjectWithVisibleFields()
  .then(result => {
    console.log(`\n🎯 Final Result:`, result);
    if (result.success) {
      console.log(`\n✅ SUCCESS! Object created with all fields visible.`);
      console.log(`\n📋 Next steps:`);
      console.log(`1. Go to Setup → Permission Sets → "${result.permissionSetName}"`);
      console.log(`2. Click "Manage Assignments" and add your user`);
      console.log(`3. Test API access to object: ${result.objectName}`);
    } else {
      console.log(`\n⚠️ PARTIAL SUCCESS: Some fields may need manual permission setup.`);
    }
  })
  .catch(error => {
    console.error(`\n💥 FAILED:`, error.message);
  }); 