# API Documentation

## Overview

The Salesforce Test Data Utility provides RESTful API endpoints for creating custom objects, generating test data, and performing bulk uploads.

**Base URL**: `http://localhost:3000`

## Endpoints

### 1. Create Custom Objects

**POST** `/create-objects`

Creates Salesforce custom objects with specified field configurations.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| numberOfObjects | number | Yes | Number of objects to create (1-50) |
| generationMode | string | Yes | Generation mode (`bulk` recommended) |
| fieldConfigs | JSON | Yes | Field type configurations |

#### Field Configuration Format

```json
{
  "Text": 60,
  "TextArea": 25,
  "Number": 40,
  "Currency": 25,
  "Email": 20,
  "Phone": 15,
  "Date": 10,
  "DateTime": 3,
  "Checkbox": 2
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/create-objects \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "numberOfObjects=1&generationMode=bulk&fieldConfigs={\"Text\":60,\"Number\":40,\"Email\":20}"
```

#### Response

```
1 custom objects with 120 fields each created successfully! (Mode: bulk)
```

---

### 2. Generate CSV Template

**POST** `/generate-csv`

Generates CSV template with sample data for a specified Salesforce object.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| objectName | string | Yes | Salesforce object API name |
| recordCount | number | Yes | Number of sample records to generate |

#### Example Request

```bash
curl -X POST http://localhost:3000/generate-csv \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "objectName=CustomObjectMaster12345__c&recordCount=1000"
```

#### Response

```
CSV file generated successfully: CustomObjectMaster12345__c_sample_1000_records.csv
Generated 1000 records with 200 fields each.
```

---

### 3. Bulk Upload Data

**POST** `/bulk-upload`

Uploads CSV data to Salesforce using optimized bulk API.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| csvFile | file | Yes | CSV file to upload |
| objectType | string | Yes | Target Salesforce object name |

#### Example Request

```bash
curl -X POST http://localhost:3000/bulk-upload \
  -F "csvFile=@data/sample.csv" \
  -F "objectType=CustomObjectMaster12345__c"
```

#### Response

```json
{
  "message": "Bulk upload completed!",
  "successful": 1000,
  "failed": 0,
  "totalProcessed": 1000,
  "performance": "1145 data points per second"
}
```

---

### 4. Get Object Schema

**POST** `/get-schema`

Retrieves field schema information for a Salesforce object.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| objectName | string | Yes | Salesforce object API name |

#### Example Request

```bash
curl -X POST http://localhost:3000/get-schema \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "objectName=CustomObjectMaster12345__c"
```

#### Response

```json
{
  "objectName": "CustomObjectMaster12345__c",
  "totalFields": 201,
  "fields": [
    {
      "name": "Name",
      "label": "Name",
      "type": "string",
      "required": false,
      "length": 80
    },
    {
      "name": "TextField1__c",
      "label": "Text Field 1",
      "type": "string",
      "required": true,
      "length": 255
    }
  ]
}
```

---

### 5. Delete Objects

**POST** `/delete-objects`

Deletes custom objects matching a pattern.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| objectPattern | string | Yes | Pattern to match object names |

#### Example Request

```bash
curl -X POST http://localhost:3000/delete-objects \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "objectPattern=CustomObjectMaster"
```

---

### 6. Generate Wide CSV

**POST** `/generate-wide-csv`

Generates CSV with actual field mapping for performance testing.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| objectName | string | Yes | Salesforce object API name |
| recordCount | number | Yes | Number of records to generate |
| fieldCount | number | No | Number of fields (auto-detected) |

---

### 7. Fix Field Permissions

**POST** `/fix-field-permissions`

Creates permission sets for object field access.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| objectName | string | Yes | Salesforce object API name |

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200**: Success
- **400**: Bad Request (invalid parameters)
- **500**: Internal Server Error

Error responses include descriptive messages:

```json
{
  "error": "Invalid object name provided",
  "details": "Object name must end with __c"
}
```

## Rate Limits

The application implements intelligent batching and delays to respect Salesforce API limits:

- **High field count (>100 fields)**: 5 records per batch, 500ms delay
- **Medium field count (50-100 fields)**: 10 records per batch, 1000ms delay  
- **Low field count (<50 fields)**: 50 records per batch, 1000ms delay

## Performance Optimization

The API automatically optimizes performance based on:
- Field count in target objects
- Data complexity
- Salesforce API response times

Typical performance metrics:
- **1000+ data points per second** for bulk operations
- **200 fields × 1000 records** processed in ~3 minutes
- **100% success rates** for properly formatted data 