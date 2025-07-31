#!/bin/bash

# Example script to create Salesforce objects with 500 fields using bulk generation
# Make sure the server is running: node salesforcetestdata.js

echo "Creating Salesforce objects with 500 fields each..."

# Configuration for 500 fields (Ultra preset):
# 150 Text + 75 TextArea + 25 LongTextArea + 100 Number + 50 Currency + 25 Percent
# + 40 Email + 15 Phone + 10 Url + 5 Date + 3 DateTime + 1 Checkbox + 1 Picklist
# Total = 500 fields

FIELD_CONFIG='{"Text":150,"TextArea":75,"LongTextArea":25,"Number":100,"Currency":50,"Percent":25,"Email":40,"Phone":15,"Url":10,"Date":5,"DateTime":3,"Checkbox":1,"Picklist":1}'

# Create 2 objects with 500 fields each (reduced from 3 due to longer processing time)
curl -X POST http://localhost:3000/create-objects \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "numberOfObjects=2&generationMode=bulk&fieldConfigs=${FIELD_CONFIG}" \
  --max-time 3600  # 60 minute timeout for large field creation

echo "Request sent! Check server logs for progress..."
echo "⚠️  This will take approximately 50 minutes to complete for 500 fields per object."
echo "   (Salesforce API limit: 10 fields per batch with 1-second delays)"
echo ""
echo "Field distribution per object:"
echo "- Text Fields: 150"
echo "- TextArea Fields: 75"
echo "- LongTextArea Fields: 25"
echo "- Number Fields: 100" 
echo "- Currency Fields: 50"
echo "- Percent Fields: 25"
echo "- Email Fields: 40"
echo "- Phone Fields: 15"
echo "- URL Fields: 10"
echo "- Date Fields: 5"
echo "- DateTime Fields: 3"
echo "- Checkbox Fields: 1"
echo "- Picklist Fields: 1"
echo "TOTAL: 500 fields per object" 