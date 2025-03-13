# Migration script for DynamoDB tables to match the structure in dynamodb-stack.ts
# This script updates the tables to use the correct attribute names and structure

# Configuration
$Endpoint = "http://localhost:8000"  # Use this for local DynamoDB
$Region = "us-west-2"
$AccessKey = "local"
$SecretKey = "local"

# Set AWS credentials
$env:AWS_ACCESS_KEY_ID = $AccessKey
$env:AWS_SECRET_ACCESS_KEY = $SecretKey
$env:AWS_DEFAULT_REGION = $Region

Write-Host "Starting DynamoDB table migration..."

# Function to generate a UUID
function New-UUID {
    return [guid]::NewGuid().ToString()
}

# Function to check if a table exists
function Test-TableExists {
    param (
        [string]$TableName
    )

    try {
        $null = aws dynamodb describe-table --table-name $TableName --endpoint-url $Endpoint --region $Region
        return $true
    } catch {
        return $false
    }
}

# Function to wait for a table to become active
function Wait-TableActive {
    param (
        [string]$TableName
    )

    Write-Host "Waiting for table $TableName to become active..."
    $maxAttempts = 10
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        $tableInfo = aws dynamodb describe-table --table-name $TableName --endpoint-url $Endpoint --region $Region | ConvertFrom-Json
        if ($tableInfo.Table.TableStatus -eq "ACTIVE") {
            Write-Host "Table $TableName is now active."
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "Table $TableName did not become active in time."
}

# Migrate Webhooks table - Fix the 'name' reserved keyword issue
function Migrate-WebhooksTable {
    Write-Host "Migrating Webhooks table..."

    # Check if the table exists
    if (-not (Test-TableExists -TableName "Webhooks")) {
        Write-Host "Webhooks table does not exist. Creating new table..."

        # Create the table with the correct schema
        aws dynamodb create-table `
            --table-name "Webhooks" `
            --attribute-definitions `
                AttributeName=id,AttributeType=S `
                AttributeName=webhookName,AttributeType=S `
            --key-schema AttributeName=id,KeyType=HASH `
            --global-secondary-indexes '[{
                "IndexName": "NameIndex",
                "KeySchema": [{"AttributeName": "webhookName", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
            }]' `
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
            --endpoint-url $Endpoint `
            --region $Region

        Wait-TableActive -TableName "Webhooks"
        Write-Host "Webhooks table created successfully."
        return
    }

    # Check if the table already has the correct schema
    $tableInfo = aws dynamodb describe-table --table-name "Webhooks" --endpoint-url $Endpoint --region $Region | ConvertFrom-Json
    $gsiExists = $false
    $correctGsi = $false

    foreach ($gsi in $tableInfo.Table.GlobalSecondaryIndexes) {
        if ($gsi.IndexName -eq "NameIndex") {
            $gsiExists = $true
            $partitionKey = $gsi.KeySchema | Where-Object { $_.KeyType -eq "HASH" } | Select-Object -ExpandProperty AttributeName
            if ($partitionKey -eq "webhookName") {
                $correctGsi = $true
            }
        }
    }

    if ($gsiExists -and $correctGsi) {
        Write-Host "Webhooks table already has the correct schema."
        return
    }

    # Create a backup table with the correct schema
    $backupTableName = "Webhooks_Backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Creating backup table $backupTableName with the correct schema..."

    aws dynamodb create-table `
        --table-name $backupTableName `
        --attribute-definitions `
            AttributeName=id,AttributeType=S `
            AttributeName=webhookName,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --global-secondary-indexes '[{
            "IndexName": "NameIndex",
            "KeySchema": [{"AttributeName": "webhookName", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --endpoint-url $Endpoint `
        --region $Region

    Wait-TableActive -TableName $backupTableName

    # Copy and transform data from the original table to the backup table
    Write-Host "Copying and transforming data to the backup table..."
    $items = aws dynamodb scan --table-name "Webhooks" --endpoint-url $Endpoint --region $Region --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $items) {
        # Check if the item has a 'name' attribute and transform it to 'webhookName'
        if ($item.PSObject.Properties.Name -contains "name") {
            $webhookName = $item.name
            $item.PSObject.Properties.Remove("name")
            $item | Add-Member -NotePropertyName "webhookName" -NotePropertyValue $webhookName
        }

        # Ensure the item has an 'id' attribute
        if (-not ($item.PSObject.Properties.Name -contains "id")) {
            $item | Add-Member -NotePropertyName "id" -NotePropertyValue @{ "S" = (New-UUID) }
        }

        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name $backupTableName `
            --item $itemJson `
            --endpoint-url $Endpoint `
            --region $Region
    }

    # Delete the original table
    Write-Host "Deleting the original Webhooks table..."
    aws dynamodb delete-table --table-name "Webhooks" --endpoint-url $Endpoint --region $Region
    Start-Sleep -Seconds 2

    # Create the new table with the correct schema
    Write-Host "Creating new Webhooks table with the correct schema..."
    aws dynamodb create-table `
        --table-name "Webhooks" `
        --attribute-definitions `
            AttributeName=id,AttributeType=S `
            AttributeName=webhookName,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --global-secondary-indexes '[{
            "IndexName": "NameIndex",
            "KeySchema": [{"AttributeName": "webhookName", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --endpoint-url $Endpoint `
        --region $Region

    Wait-TableActive -TableName "Webhooks"

    # Copy data from the backup table to the new table
    Write-Host "Copying data from the backup table to the new Webhooks table..."
    $backupItems = aws dynamodb scan --table-name $backupTableName --endpoint-url $Endpoint --region $Region --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $backupItems) {
        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name "Webhooks" `
            --item $itemJson `
            --endpoint-url $Endpoint `
            --region $Region
    }

    # Delete the backup table
    Write-Host "Deleting the backup table..."
    aws dynamodb delete-table --table-name $backupTableName --endpoint-url $Endpoint --region $Region

    Write-Host "Webhooks table migration completed successfully."
}

# Migrate RegexPatterns table
function Migrate-RegexPatternsTable {
    Write-Host "Migrating RegexPatterns table..."

    # Check if the table exists
    if (-not (Test-TableExists -TableName "RegexPatterns")) {
        Write-Host "RegexPatterns table does not exist. Creating new table..."

        # Create the table with the correct schema
        aws dynamodb create-table `
            --table-name "RegexPatterns" `
            --attribute-definitions `
                AttributeName=id,AttributeType=S `
                AttributeName=serverId,AttributeType=S `
                AttributeName=regexPattern,AttributeType=S `
            --key-schema AttributeName=id,KeyType=HASH `
            --global-secondary-indexes '[{
                "IndexName": "ServerRegexIndex",
                "KeySchema": [
                    {"AttributeName": "serverId", "KeyType": "HASH"},
                    {"AttributeName": "regexPattern", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
            }]' `
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
            --endpoint-url $Endpoint `
            --region $Region

        Wait-TableActive -TableName "RegexPatterns"
        Write-Host "RegexPatterns table created successfully."
        return
    }

    # Check if the table already has the correct schema
    $tableInfo = aws dynamodb describe-table --table-name "RegexPatterns" --endpoint-url $Endpoint --region $Region | ConvertFrom-Json
    $primaryKey = $tableInfo.Table.KeySchema | Where-Object { $_.KeyType -eq "HASH" } | Select-Object -ExpandProperty AttributeName

    if ($primaryKey -eq "id") {
        Write-Host "RegexPatterns table already has the correct schema."
        return
    }

    # Create a backup table with the correct schema
    $backupTableName = "RegexPatterns_Backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Creating backup table $backupTableName with the correct schema..."

    aws dynamodb create-table `
        --table-name $backupTableName `
        --attribute-definitions `
            AttributeName=id,AttributeType=S `
            AttributeName=serverId,AttributeType=S `
            AttributeName=regexPattern,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --global-secondary-indexes '[{
            "IndexName": "ServerRegexIndex",
            "KeySchema": [
                {"AttributeName": "serverId", "KeyType": "HASH"},
                {"AttributeName": "regexPattern", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --endpoint-url $Endpoint `
        --region $Region

    Wait-TableActive -TableName $backupTableName

    # Copy data from the original table to the backup table
    Write-Host "Copying data to the backup table..."
    $items = aws dynamodb scan --table-name "RegexPatterns" --endpoint-url $Endpoint --region $Region --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $items) {
        # Ensure the item has an 'id' attribute
        if (-not ($item.PSObject.Properties.Name -contains "id")) {
            $item | Add-Member -NotePropertyName "id" -NotePropertyValue @{ "S" = (New-UUID) }
        }

        # Check if the item has a 'webhookName' attribute (might be 'name' in old data)
        if ($item.PSObject.Properties.Name -contains "name" -and -not ($item.PSObject.Properties.Name -contains "webhookName")) {
            $webhookName = $item.name
            $item.PSObject.Properties.Remove("name")
            $item | Add-Member -NotePropertyName "webhookName" -NotePropertyValue $webhookName
        }

        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name $backupTableName `
            --item $itemJson `
            --endpoint-url $Endpoint `
            --region $Region
    }

    # Delete the original table
    Write-Host "Deleting the original RegexPatterns table..."
    aws dynamodb delete-table --table-name "RegexPatterns" --endpoint-url $Endpoint --region $Region
    Start-Sleep -Seconds 2

    # Create the new table with the correct schema
    Write-Host "Creating new RegexPatterns table with the correct schema..."
    aws dynamodb create-table `
        --table-name "RegexPatterns" `
        --attribute-definitions `
            AttributeName=id,AttributeType=S `
            AttributeName=serverId,AttributeType=S `
            AttributeName=regexPattern,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --global-secondary-indexes '[{
            "IndexName": "ServerRegexIndex",
            "KeySchema": [
                {"AttributeName": "serverId", "KeyType": "HASH"},
                {"AttributeName": "regexPattern", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --endpoint-url $Endpoint `
        --region $Region

    Wait-TableActive -TableName "RegexPatterns"

    # Copy data from the backup table to the new table
    Write-Host "Copying data from the backup table to the new RegexPatterns table..."
    $backupItems = aws dynamodb scan --table-name $backupTableName --endpoint-url $Endpoint --region $Region --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $backupItems) {
        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name "RegexPatterns" `
            --item $itemJson `
            --endpoint-url $Endpoint `
            --region $Region
    }

    # Delete the backup table
    Write-Host "Deleting the backup table..."
    aws dynamodb delete-table --table-name $backupTableName --endpoint-url $Endpoint --region $Region

    Write-Host "RegexPatterns table migration completed successfully."
}

# Migrate Servers table
function Migrate-ServersTable {
    Write-Host "Migrating Servers table..."

    # Check if the table exists
    if (-not (Test-TableExists -TableName "Servers")) {
        Write-Host "Servers table does not exist. Creating new table..."

        # Create the table with the correct schema
        aws dynamodb create-table `
            --table-name "Servers" `
            --attribute-definitions `
                AttributeName=id,AttributeType=S `
                AttributeName=serverId,AttributeType=S `
            --key-schema AttributeName=id,KeyType=HASH `
            --global-secondary-indexes '[{
                "IndexName": "ServerIdIndex",
                "KeySchema": [{"AttributeName": "serverId", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
            }]' `
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
            --endpoint-url $Endpoint `
            --region $Region

        Wait-TableActive -TableName "Servers"
        Write-Host "Servers table created successfully."
        return
    }

    # Check if the table already has the correct schema
    $tableInfo = aws dynamodb describe-table --table-name "Servers" --endpoint-url $Endpoint --region $Region | ConvertFrom-Json
    $primaryKey = $tableInfo.Table.KeySchema | Where-Object { $_.KeyType -eq "HASH" } | Select-Object -ExpandProperty AttributeName

    if ($primaryKey -eq "id") {
        Write-Host "Servers table already has the correct schema."
        return
    }

    # Create a backup table with the correct schema
    $backupTableName = "Servers_Backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Creating backup table $backupTableName with the correct schema..."

    aws dynamodb create-table `
        --table-name $backupTableName `
        --attribute-definitions `
            AttributeName=id,AttributeType=S `
            AttributeName=serverId,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --global-secondary-indexes '[{
            "IndexName": "ServerIdIndex",
            "KeySchema": [{"AttributeName": "serverId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --endpoint-url $Endpoint `
        --region $Region

    Wait-TableActive -TableName $backupTableName

    # Copy data from the original table to the backup table
    Write-Host "Copying data to the backup table..."
    $items = aws dynamodb scan --table-name "Servers" --endpoint-url $Endpoint --region $Region --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $items) {
        # Ensure the item has an 'id' attribute
        if (-not ($item.PSObject.Properties.Name -contains "id")) {
            $item | Add-Member -NotePropertyName "id" -NotePropertyValue @{ "S" = (New-UUID) }
        }

        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name $backupTableName `
            --item $itemJson `
            --endpoint-url $Endpoint `
            --region $Region
    }

    # Delete the original table
    Write-Host "Deleting the original Servers table..."
    aws dynamodb delete-table --table-name "Servers" --endpoint-url $Endpoint --region $Region
    Start-Sleep -Seconds 2

    # Create the new table with the correct schema
    Write-Host "Creating new Servers table with the correct schema..."
    aws dynamodb create-table `
        --table-name "Servers" `
        --attribute-definitions `
            AttributeName=id,AttributeType=S `
            AttributeName=serverId,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --global-secondary-indexes '[{
            "IndexName": "ServerIdIndex",
            "KeySchema": [{"AttributeName": "serverId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --endpoint-url $Endpoint `
        --region $Region

    Wait-TableActive -TableName "Servers"

    # Copy data from the backup table to the new table
    Write-Host "Copying data from the backup table to the new Servers table..."
    $backupItems = aws dynamodb scan --table-name $backupTableName --endpoint-url $Endpoint --region $Region --query "Items" --output json | ConvertFrom-Json

    foreach ($item in $backupItems) {
        $itemJson = $item | ConvertTo-Json -Compress
        aws dynamodb put-item `
            --table-name "Servers" `
            --item $itemJson `
            --endpoint-url $Endpoint `
            --region $Region
    }

    # Delete the backup table
    Write-Host "Deleting the backup table..."
    aws dynamodb delete-table --table-name $backupTableName --endpoint-url $Endpoint --region $Region

    Write-Host "Servers table migration completed successfully."
}

# Run the migrations
Migrate-WebhooksTable
Migrate-RegexPatternsTable
Migrate-ServersTable

Write-Host "All tables have been migrated successfully!"