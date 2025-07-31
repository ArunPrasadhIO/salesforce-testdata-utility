#!/bin/bash

# Array of the 10 most recent objects with 200 fields each
objects=(
    "CustomObjectMaster61318__c"
    "CustomObjectMaster43267__c" 
    "CustomObjectMaster96460__c"
    "CustomObjectMaster24915__c"
    "CustomObjectMaster62350__c"
    "CustomObjectMaster78448__c"
    "CustomObjectMaster35511__c"
    "CustomObjectMaster99046__c"
    "CustomObjectMaster91991__c"
    "CustomObjectMaster28139__c"
)

echo "🚀 Starting massive bulk upload operation..."
echo "📊 Target: 10 objects × 1000 records × 200 fields = 2,000,000 data points"
echo "⏱️  Estimated time: ~30 minutes"
echo ""

total_start_time=$(date +%s)
successful_uploads=0
failed_uploads=0

for i in "${!objects[@]}"; do
    object_name="${objects[$i]}"
    object_num=$((i + 1))
    
    echo "════════════════════════════════════════════════════════════════"
    echo "🎯 Processing Object $object_num/10: $object_name"
    echo "════════════════════════════════════════════════════════════════"
    
    object_start_time=$(date +%s)
    
    # Step 1: Generate CSV with 1000 records
    echo "📄 Step 1: Generating CSV with 1000 records..."
    curl_result=$(curl -s -X POST http://localhost:3000/generate-csv \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "objectName=$object_name&recordCount=1000")
    
    if [[ $curl_result == *"successfully"* ]]; then
        echo "✅ CSV generated successfully"
    else
        echo "❌ CSV generation failed for $object_name"
        ((failed_uploads++))
        continue
    fi
    
    # Step 2: Upload CSV via bulk API
    echo "📤 Step 2: Uploading 1000 records via optimized bulk API..."
    upload_result=$(curl -s -X POST http://localhost:3000/bulk-upload \
      -F "csvFile=@${object_name}_sample_1000_records.csv" \
      -F "objectType=$object_name")
    
    object_end_time=$(date +%s)
    object_duration=$((object_end_time - object_start_time))
    
    if [[ $upload_result == *"1000"* ]] && [[ $upload_result == *"successful"* ]]; then
        echo "🎉 SUCCESS! 1000 records uploaded in ${object_duration}s"
        ((successful_uploads++))
        
        # Extract performance metrics if available
        if [[ $upload_result == *"data points per second"* ]]; then
            performance=$(echo "$upload_result" | grep -o '[0-9]* data points per second')
            echo "⚡ Performance: $performance"
        fi
    else
        echo "❌ Upload failed for $object_name"
        echo "📋 Response: $upload_result"
        ((failed_uploads++))
    fi
    
    echo "⏱️  Object completed in ${object_duration} seconds"
    echo ""
    
    # Small delay between objects to prevent overwhelming Salesforce
    if [ $i -lt 9 ]; then
        echo "⏳ Waiting 10 seconds before next object..."
        sleep 10
    fi
done

total_end_time=$(date +%s)
total_duration=$((total_end_time - total_start_time))
total_minutes=$((total_duration / 60))

echo "════════════════════════════════════════════════════════════════"
echo "🏆 MASSIVE BULK UPLOAD OPERATION COMPLETED!"
echo "════════════════════════════════════════════════════════════════"
echo "📊 Final Results:"
echo "   • Successful Objects: $successful_uploads/10"
echo "   • Failed Objects: $failed_uploads/10" 
echo "   • Total Records: $((successful_uploads * 1000))"
echo "   • Total Data Points: $((successful_uploads * 1000 * 200))"
echo "   • Total Time: ${total_minutes}m ${total_duration}s"
echo "   • Average per Object: $((total_duration / 10))s"
echo ""

if [ $successful_uploads -eq 10 ]; then
    echo "🎉 PERFECT! ALL 10 OBJECTS UPLOADED SUCCESSFULLY!"
    echo "🚀 2,000,000 data points processed flawlessly!"
else
    echo "⚠️  $failed_uploads objects had issues - check logs above"
fi

echo "════════════════════════════════════════════════════════════════" 