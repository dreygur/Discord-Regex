# Migration script to update RegexPatterns table with regexPattern as sort key
# Prerequisites: AWS CLI installed and configured, PowerShell

# Configuration
$AwsProfile = "upwork"  # Use the upwork profile
$TableName = "RegexPatterns"
$BackupTableName = "${TableName}_backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
$Region = aws configure get region --profile $AwsProfile
if ([string]::IsNullOrEmpty($Region)) {
    $Region = "us-east-1"  # Default region if not configured
}

Write-Host "Starting migration of $TableName table in $Region region using AWS profile: $AwsProfile..."
Write-Host "Creating backup table: $BackupTableName"

# Step 1: Check if the table exists
try {
    $null = aws dynamodb describe-table --table-name $TableName --region $Region --profile $AwsProfile
    $TableExists = $true
} catch {
    $TableExists = $false
}

if (-not $TableExists) {
    Write-Host "Table $TableName does not exist. Creating new table with the correct schema."

    # Create the table with the new schema
    aws dynamodb create-table `
        --table-name $TableName `
        --attribute-definitions `
            AttributeName=serverId,AttributeType=S `
            AttributeName=regexPattern,AttributeType=S `
        --key-schema `
            AttributeName=serverId,KeyType=HASH `
            AttributeName=regexPattern,KeyType=RANGE `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --region $Region `
        --profile $AwsProfile

    Write-Host "Table $TableName created successfully with the new schema."
    exit
}

# Step 2: Create a backup table with the new schema
aws dynamodb create-table `
    --table-name $BackupTableName `
    --attribute-definitions `
        AttributeName=serverId,AttributeType=S `
        AttributeName=regexPattern,AttributeType=S `
    --key-schema `
        AttributeName=serverId,KeyType=HASH `
        AttributeName=regexPattern,KeyType=RANGE `
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
    --region $Region `
    --profile $AwsProfile

Write-Host "Backup table created. Waiting for it to become active..."
aws dynamodb wait table-exists --table-name $BackupTableName --region $Region --profile $AwsProfile

# Step 3: Scan all data from the original table
Write-Host "Scanning data from $TableName..."
$Items = aws dynamodb scan --table-name $TableName --region $Region --profile $AwsProfile --query "Items" --output json | ConvertFrom-Json

# Check if there are any items
$ItemCount = $Items.Length
if ($ItemCount -eq 0) {
    Write-Host "No items found in the original table."
} else {
    Write-Host "Found $ItemCount items. Migrating data to backup table..."

    # Step 4: Insert data into the backup table
    foreach ($item in $Items) {
        # Ensure the item has a regexPattern attribute
        if ($item.PSObject.Properties.Name -contains "regexPattern") {
            $itemJson = $item | ConvertTo-Json -Compress
            aws dynamodb put-item `
                --table-name $BackupTableName `
                --item $itemJson `
                --region $Region `
                --profile $AwsProfile
        } else {
            Write-Host "Warning: Skipping item without regexPattern attribute: $($item.serverId.S)"
        }
    }

    Write-Host "Data migration to backup table completed."
}

# Step 5: Delete the original table
Write-Host "Deleting original table $TableName..."
aws dynamodb delete-table --table-name $TableName --region $Region --profile $AwsProfile

Write-Host "Waiting for table deletion to complete..."
aws dynamodb wait table-not-exists --table-name $TableName --region $Region --profile $AwsProfile

# Step 6: Create the new table with the updated schema
Write-Host "Creating new table $TableName with updated schema..."
aws dynamodb create-table `
    --table-name $TableName `
    --attribute-definitions `
        AttributeName=serverId,AttributeType=S `
        AttributeName=regexPattern,AttributeType=S `
    --key-schema `
        AttributeName=serverId,KeyType=HASH `
        AttributeName=regexPattern,KeyType=RANGE `
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
    --region $Region `
    --profile $AwsProfile

Write-Host "Waiting for new table to become active..."
aws dynamodb wait table-exists --table-name $TableName --region $Region --profile $AwsProfile

# Step 7: Migrate data from backup to new table
if ($ItemCount -gt 0) {
    Write-Host "Migrating data from backup table to new table..."
    $BackupItems = aws dynamodb scan --table-name $BackupTableName --region $Region --profile $AwsProfile --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $BackupItems) {
        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name $TableName `
            --item $itemJson `
            --region $Region `
            --profile $AwsProfile
    }

    Write-Host "Data migration to new table completed."
}

# Step 8: Clean up - delete the backup table
Write-Host "Cleaning up: Deleting backup table $BackupTableName..."
aws dynamodb delete-table --table-name $BackupTableName --region $Region --profile $AwsProfile

Write-Host "Migration completed successfully!"
Write-Host "The $TableName table now has 'serverId' as the partition key and 'regexPattern' as the sort key."