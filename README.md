# Salesforce Test Data Utility

A comprehensive Node.js application for creating Salesforce custom objects with bulk field generation and data upload capabilities.

## 🚀 Features

- **Custom Object Creation**: Generate custom Salesforce objects with up to 200+ fields
- **Multiple Field Types**: Support for Text, TextArea, Number, Currency, Email, Phone, Date, DateTime, and Checkbox fields
- **Bulk Data Upload**: High-performance CSV upload with optimized batching for large datasets
- **Schema Inspection**: Retrieve and analyze object field schemas
- **CSV Generation**: Automatic CSV template generation with realistic sample data
- **Permission Management**: Automatic permission set creation for immediate API access
- **Performance Optimization**: Dynamic batch sizing based on field count for optimal upload performance

## 📋 Requirements

- Node.js (v14 or higher)
- Salesforce Developer/Administrator access
- Salesforce Connected App or username/password authentication

## 🛠️ Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd salesforceutil
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Salesforce credentials:
   ```bash
   # Copy environment template
   cp config/env.example .env
   
   # Edit .env with your credentials
   nano .env
   ```

## 🎯 Usage

### Start the Application

```bash
npm start
```

The application will start on `http://localhost:3000`

### Available NPM Scripts

```bash
npm start                # Start the application
npm run dev              # Start with nodemon (development)
npm run bulk-upload      # Run automated bulk upload script
npm run example          # Run example field generation script
npm run fix-permissions  # Fix field permissions for objects
npm run clean-data       # Clean generated CSV files
npm run setup            # Install dependencies and setup
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file from the template:
```bash
cp config/env.example .env
```

Required variables:
```env
SF_USERNAME=your-salesforce-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-security-token
SF_LOGIN_URL=https://login.salesforce.com  # Use https://test.salesforce.com for sandbox
PORT=3000
```

### Advanced Configuration

Modify `config/salesforce.config.js` for advanced settings:
- **Performance tuning**: Batch sizes and delays
- **Field defaults**: Default values for different field types
- **API limits**: Maximum objects and fields per operation

### Pre-built Configurations

Use example configurations from `examples/field-configurations.js`:
```javascript
const configs = require('./examples/field-configurations');

// Available configurations:
// configs.small     - 50 fields (testing)
// configs.medium    - 100 fields (development)
// configs.large     - 200 fields (performance)
// configs.contact   - Contact-like object
// configs.account   - Account-like object
// configs.opportunity - Opportunity-like object
```

### Available Endpoints

#### 1. Create Custom Objects
- **URL**: `POST /create-objects`
- **Parameters**:
  - `numberOfObjects`: Number of objects to create (1-50)
  - `generationMode`: `bulk` (recommended)
  - `fieldConfigs`: JSON object defining field types and quantities

**Example**:
```bash
curl -X POST http://localhost:3000/create-objects \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "numberOfObjects=1&generationMode=bulk&fieldConfigs={\"Text\":60,\"Number\":40,\"Email\":20,\"Phone\":15,\"Date\":10}"
```

#### 2. Generate CSV Templates
- **URL**: `POST /generate-csv`
- **Parameters**:
  - `objectName`: Salesforce object name
  - `recordCount`: Number of sample records to generate

#### 3. Bulk Upload Data
- **URL**: `POST /bulk-upload`
- **Parameters**:
  - `csvFile`: CSV file to upload
  - `objectType`: Target Salesforce object name

#### 4. Get Object Schema
- **URL**: `POST /get-schema`
- **Parameters**:
  - `objectName`: Salesforce object name

#### 5. Delete Objects
- **URL**: `POST /delete-objects`
- **Parameters**:
  - `objectPattern`: Pattern to match object names for deletion

## 🔧 Performance Features

### Dynamic Batch Sizing
The application automatically adjusts batch sizes based on field count:
- **>100 fields**: 5 records per batch
- **50-100 fields**: 10 records per batch  
- **<50 fields**: 50 records per batch

### Intelligent Delays
- **Wide records (>100 fields)**: 500ms delay between batches
- **Standard records**: 1000ms delay between batches

### Performance Monitoring
Real-time tracking of:
- Batch processing time
- Total upload time
- Data points per second
- Success/failure rates

## 📊 Field Types Supported

| Field Type | Description | Example |
|------------|-------------|---------|
| Text | Standard text field (255 chars) | "Sample Text" |
| TextArea | Long text field | "Multi-line text content..." |
| Number | Numeric field | 123.45 |
| Currency | Currency field | 1500.00 |
| Email | Email validation | "test@example.com" |
| Phone | Phone number | "555-0123" |
| Date | Date field | "2024-01-15" |
| DateTime | Date and time | "2024-01-15T10:30:00Z" |
| Checkbox | Boolean field | true/false |

## 🚀 High-Volume Testing

### Massive Scale Support
Successfully tested with:
- **Objects**: 10+ objects with 200 fields each
- **Records**: 1000+ records per object
- **Data Points**: 2,000,000+ total data points
- **Performance**: 1000+ data points per second

### Automated Bulk Operations
Use the included automation script for multi-object uploads:

```bash
npm run bulk-upload
```

Or run directly:
```bash
chmod +x scripts/bulk_upload_all_objects.sh
./scripts/bulk_upload_all_objects.sh
```

#### Bulk Upload Shell Script Features

The `bulk_upload_all_objects.sh` script provides:
- **Automated Processing**: Uploads 1000 records to multiple objects sequentially
- **Progress Tracking**: Real-time progress with object counters and timing
- **Error Handling**: Graceful handling of failures with detailed reporting
- **Performance Monitoring**: Tracks upload time and data points per second
- **Smart Delays**: 10-second delays between objects to prevent API throttling
- **Comprehensive Reporting**: Final summary with success/failure statistics

#### Script Configuration

Before running the script, ensure:
1. **Server Running**: Your Node.js application must be running on `http://localhost:3000`
2. **Object Names**: Update the object array in the script with your specific object names:
   ```bash
   objects=(
       "CustomObjectMaster61318__c"
       "CustomObjectMaster43267__c" 
       "CustomObjectMaster96460__c"
       # Add your object names here
   )
   ```

#### Script Output Example

```
🚀 Starting massive bulk upload operation...
📊 Target: 10 objects × 1000 records × 200 fields = 2,000,000 data points
⏱️  Estimated time: ~30 minutes

════════════════════════════════════════════════════════════════
🎯 Processing Object 1/10: CustomObjectMaster61318__c
════════════════════════════════════════════════════════════════
📄 Step 1: Generating CSV with 1000 records...
✅ CSV generated successfully
📤 Step 2: Uploading 1000 records via optimized bulk API...
🎉 SUCCESS! 1000 records uploaded in 187s
⚡ Performance: 1102 data points per second

🏆 MASSIVE BULK UPLOAD OPERATION COMPLETED!
📊 Final Results:
   • Successful Objects: 10/10
   • Total Records: 10,000
   • Total Data Points: 2,000,000
   • Total Time: 32m
```

## 📁 Project Structure

```
salesforce-test-data-utility/
├── 📂 src/                         # Source Code
│   ├── app.js                      # 🚀 Main application (entry point)
│   ├── app-alternative.js          # Alternative implementation
│   └── app-backup.js               # Backup version
├── 📂 scripts/                     # Automation Scripts
│   ├── bulk_upload_all_objects.sh  # 🔥 Multi-object bulk upload automation
│   └── example_500_fields.sh       # Performance testing script
├── 📂 utils/                       # Utility Scripts
│   ├── fix_field_permissions.js    # Permission management utility
│   └── create_object_with_visible_fields.js # Object creation utility
├── 📂 config/                      # Configuration Files
│   ├── salesforce.config.js        # Salesforce settings & performance tuning
│   └── env.example                 # Environment variables template
├── 📂 examples/                    # Example Configurations
│   └── field-configurations.js     # Pre-built field configurations
├── 📂 docs/                        # Documentation
│   ├── API.md                      # 📖 Complete API documentation
│   └── DEPLOYMENT.md               # 🚀 Deployment & production guide
├── 📂 data/                        # Generated Data (gitignored)
│   ├── *.csv                       # Generated CSV files
│   └── created_objects.txt         # Object tracking file
├── 📂 tests/                       # Test Files (placeholder)
├── 📄 package.json                 # Node.js dependencies & scripts
├── 📄 package-lock.json            # Dependency lock file
├── 📄 .gitignore                   # Git ignore patterns
└── 📄 README.md                    # This documentation
```

## 🔐 Security Features

- **Field-Level Security**: Automatic permission set creation
- **API Visibility**: All created fields are immediately accessible via API
- **Required Fields**: Strategic use of required fields for visibility
- **Object Permissions**: Full CRUD access via generated permission sets

## 🎯 Use Cases

1. **Load Testing**: Generate massive datasets for Salesforce performance testing
2. **Development**: Create test objects and data for application development
3. **Training**: Generate realistic sample data for user training
4. **Migration Testing**: Test data migration scenarios with large datasets
5. **API Testing**: Create objects for API integration testing

## 🐛 Troubleshooting

### Common Issues

1. **Objects not visible in API**: Check field-level security settings
2. **Upload failures**: Verify required fields and data types
3. **Performance issues**: Reduce batch sizes for very wide objects
4. **Permission errors**: Ensure user has Metadata API access

### Performance Tips

- Use bulk mode for objects with 50+ fields
- Monitor server logs for batch processing times
- Adjust field distribution for optimal performance
- Use the automated scripts for large-scale operations

### Shell Script Best Practices

#### Prerequisites
1. **Ensure Server is Running**:
   ```bash
   node salesforcetestdata_simple.js &
   # Wait for "Server running on port 3000" message
   ```

2. **Verify Object Creation**: Ensure your objects exist and have proper field configurations

3. **Check Available Disk Space**: Large CSV files (1000 records × 200 fields = ~4MB per file)

#### Customizing the Script

**Update Object Names**: Edit `bulk_upload_all_objects.sh` to include your specific objects:
```bash
objects=(
    "YourCustomObject1__c"
    "YourCustomObject2__c"
    "YourCustomObject3__c"
)
```

**Modify Record Count**: Change the `recordCount` parameter in the script:
```bash
# Change from 1000 to your desired count
-d "objectName=$object_name&recordCount=500"
```

**Adjust Delays**: Modify delays between objects based on your Salesforce org limits:
```bash
# Current: 10 seconds, adjust as needed
sleep 10
```

#### Monitoring and Debugging

**Real-time Monitoring**:
```bash
# Run script and save output to log file
./bulk_upload_all_objects.sh | tee bulk_upload_log_$(date +%Y%m%d_%H%M%S).log
```

**Check Individual Object Status**:
```bash
# If script fails, test individual objects
curl -X POST http://localhost:3000/get-schema \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "objectName=YourObject__c"
```

**Validate CSV Generation**:
```bash
# Test CSV generation before bulk upload
curl -X POST http://localhost:3000/generate-csv \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "objectName=YourObject__c&recordCount=5"
```

#### Error Recovery

**Partial Failures**: If some objects fail, you can:
1. Check the error logs for specific failure reasons
2. Fix issues with individual objects
3. Re-run the script (it will skip existing CSV files)
4. Or manually upload specific objects using individual curl commands

**Resource Limits**: If hitting Salesforce API limits:
1. Increase delays between objects (change `sleep 10` to `sleep 30`)
2. Reduce record count per object
3. Run the script during off-peak hours

## 📈 Performance Benchmarks

### Recent Test Results
- **10 Objects**: 200 fields each, 1000 records each
- **Total Data Points**: 2,000,000
- **Processing Time**: ~32 minutes
- **Success Rate**: 100%
- **Average Performance**: 1000+ data points/second

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

This project is provided as-is for educational and testing purposes.

## ⚠️ Disclaimer

This tool is designed for development and testing environments. Use with caution in production Salesforce orgs. Always test in a sandbox environment first.

---

**Created for high-performance Salesforce testing and development workflows** 