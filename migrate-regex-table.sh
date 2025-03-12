#!/bin/bash

# Migration script to update RegexPatterns table with regexPattern as sort key
# Prerequisites: AWS CLI installed and configured

set -e  # Exit on error

# Configuration
AWS_PROFILE="upwork"  # Use the upwork profile
TABLE_NAME="RegexPatterns"
BACKUP_TABLE_NAME="${TABLE_NAME}_backup_$(date +%Y%m%d%H%M%S)"
REGION=$(aws configure get region --profile $AWS_PROFILE)
if [ -z "$REGION" ]; then
  REGION="us-east-1"  # Default region if not configured
fi

echo "Starting migration of $TABLE_NAME table in $REGION region using AWS profile: $AWS_PROFILE..."
echo "Creating backup table: $BACKUP_TABLE_NAME"

# Step 1: Check if the table exists
if ! aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --profile $AWS_PROFILE &> /dev/null; then
  echo "Table $TABLE_NAME does not exist. Creating new table with the correct schema."

  # Create the table with the new schema
  aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
      AttributeName=serverId,AttributeType=S \
      AttributeName=regexPattern,AttributeType=S \
    --key-schema \
      AttributeName=serverId,KeyType=HASH \
      AttributeName=regexPattern,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION \
    --profile $AWS_PROFILE

  echo "Table $TABLE_NAME created successfully with the new schema."
  exit 0
fi

# Step 2: Create a backup table with the new schema
aws dynamodb create-table \
  --table-name $BACKUP_TABLE_NAME \
  --attribute-definitions \
    AttributeName=serverId,AttributeType=S \
    AttributeName=regexPattern,AttributeType=S \
  --key-schema \
    AttributeName=serverId,KeyType=HASH \
    AttributeName=regexPattern,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  --profile $AWS_PROFILE

echo "Backup table created. Waiting for it to become active..."
aws dynamodb wait table-exists --table-name $BACKUP_TABLE_NAME --region $REGION --profile $AWS_PROFILE

# Step 3: Scan all data from the original table
echo "Scanning data from $TABLE_NAME..."
ITEMS=$(aws dynamodb scan --table-name $TABLE_NAME --region $REGION --profile $AWS_PROFILE --query "Items" --output json)

# Check if there are any items
ITEM_COUNT=$(echo $ITEMS | jq length)
if [ "$ITEM_COUNT" -eq "0" ]; then
  echo "No items found in the original table."
else
  echo "Found $ITEM_COUNT items. Migrating data to backup table..."

  # Step 4: Insert data into the backup table
  echo $ITEMS | jq -c '.[]' | while read -r item; do
    # Ensure the item has a regexPattern attribute
    if echo $item | jq -e '.regexPattern' > /dev/null; then
      aws dynamodb put-item \
        --table-name $BACKUP_TABLE_NAME \
        --item "$item" \
        --region $REGION \
        --profile $AWS_PROFILE
    else
      echo "Warning: Skipping item without regexPattern attribute: $(echo $item | jq -c '.serverId')"
    fi
  done

  echo "Data migration to backup table completed."
fi

# Step 5: Delete the original table
echo "Deleting original table $TABLE_NAME..."
aws dynamodb delete-table --table-name $TABLE_NAME --region $REGION --profile $AWS_PROFILE

echo "Waiting for table deletion to complete..."
aws dynamodb wait table-not-exists --table-name $TABLE_NAME --region $REGION --profile $AWS_PROFILE

# Step 6: Create the new table with the updated schema
echo "Creating new table $TABLE_NAME with updated schema..."
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions \
    AttributeName=serverId,AttributeType=S \
    AttributeName=regexPattern,AttributeType=S \
  --key-schema \
    AttributeName=serverId,KeyType=HASH \
    AttributeName=regexPattern,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  --profile $AWS_PROFILE

echo "Waiting for new table to become active..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION --profile $AWS_PROFILE

# Step 7: Migrate data from backup to new table
if [ "$ITEM_COUNT" -gt "0" ]; then
  echo "Migrating data from backup table to new table..."
  BACKUP_ITEMS=$(aws dynamodb scan --table-name $BACKUP_TABLE_NAME --region $REGION --profile $AWS_PROFILE --query "Items" --output json)

  echo $BACKUP_ITEMS | jq -c '.[]' | while read -r item; do
    aws dynamodb put-item \
      --table-name $TABLE_NAME \
      --item "$item" \
      --region $REGION \
      --profile $AWS_PROFILE
  done

  echo "Data migration to new table completed."
fi

# Step 8: Clean up - delete the backup table
echo "Cleaning up: Deleting backup table $BACKUP_TABLE_NAME..."
aws dynamodb delete-table --table-name $BACKUP_TABLE_NAME --region $REGION --profile $AWS_PROFILE

echo "Migration completed successfully!"
echo "The $TABLE_NAME table now has 'serverId' as the partition key and 'regexPattern' as the sort key."