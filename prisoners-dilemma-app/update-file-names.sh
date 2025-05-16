#!/bin/bash

# Define file mappings (old name -> new name)
declare -A file_mappings=(
  ["src/models/ConnectionStatus.ts"]="src/models/connection-status.ts"
  ["src/api/ApiErrors.ts"]="src/api/api-errors.ts"
  ["src/api/ConnectionApiService.ts"]="src/api/connection-api.service.ts"
  ["src/api/ConnectionDataMapper.ts"]="src/api/connection-data-mapper.ts"
  ["test/components/ConnectionStatusIndicator.test.ts"]="test/components/connection-status-indicator.test.ts"
  ["test/components/ConnectionUpdatesManager.test.ts"]="test/components/connection-updates-manager.test.ts"
  ["test/components/WebsocketConnectionManager.test.ts"]="test/components/websocket-connection-manager.test.ts"
  ["test/unit/services/ApiError.test.ts"]="test/unit/api-error.test.ts"
  ["test/unit/services/ConnectionApiService.test.ts"]="test/unit/services/connection-api.service.test.ts"
  ["test/unit/services/ConnectionDataMapper.test.ts"]="test/unit/services/connection-data-mapper.test.ts"
  ["test/unit/services/ConnectionService.api.test.ts"]="test/unit/services/connection-service.api.test.ts"
)

# Create a backup directory
mkdir -p backup

# Process each file mapping
for old_path in "${!file_mappings[@]}"; do
  new_path=${file_mappings[$old_path]}
  
  # Skip if the old file doesn't exist
  if [ ! -f "$old_path" ]; then
    echo "Skipping $old_path - file not found"
    continue
  fi
  
  # Create directory for new file if it doesn't exist
  mkdir -p "$(dirname "$new_path")"
  
  # Copy old file to backup
  cp "$old_path" "backup/$(basename "$old_path")"
  
  # Rename the file
  echo "Renaming $old_path to $new_path"
  mv "$old_path" "$new_path"
done

echo "File renaming completed! Now you should update imports manually."