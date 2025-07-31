const jsforce = require("jsforce");

const username = "celigo_di8@celigo.com";
const password = "&45jn#REcZ!pEy87" + "XR0u7bKDCHmwqkr6Tk7chZzA";

async function fixFieldPermissions(objectName) {
  const conn = new jsforce.Connection({ version: "55.0" });
  
  try {
    // Login
    await conn.login(username, password);
    console.log("Connected to Salesforce");
    
    // Create Permission Set for field access
    const permissionSetName = `${objectName.replace('__c', '')}_Fields`;
    
    const permissionSet = {
      fullName: permissionSetName,
      label: `Access Fields for ${objectName}`,
      description: `Grants read/write access to all custom fields on ${objectName}`,
      hasActivationRequired: false,
      // Grant object permissions
      objectPermissions: [{
        object: objectName,
        allowCreate: true,
        allowDelete: true,
        allowEdit: true,
        allowRead: true,
        modifyAllRecords: false,
        viewAllRecords: true
      }]
    };
    
    const result = await conn.metadata.create("PermissionSet", permissionSet);
    
    if (result.success) {
      console.log(`✅ Permission Set created: ${permissionSetName}`);
      console.log(`\n📋 Next Steps:`);
      console.log(`1. Go to Setup → Permission Sets`);
      console.log(`2. Find "${permissionSet.label}"`);
      console.log(`3. Click "Manage Assignments"`);
      console.log(`4. Add users who need field access`);
      console.log(`5. Add individual field permissions manually`);
    } else {
      console.error("❌ Failed to create permission set:", result.errors);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Usage
const objectName = process.argv[2] || "CustomObjectMaster3241__c";
fixFieldPermissions(objectName); 