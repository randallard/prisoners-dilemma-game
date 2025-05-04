# PowerShell script to copy relevant files to ai-chat-files directory

# Helper function to copy files to the ai-chat-files directory
function Copy-ToAIChatFiles {
    param (
        [Parameter(Mandatory=$true)]
        [string]$SourcePath,
        
        [Parameter(Mandatory=$false)]
        [string]$DestinationDir = "ai-chat-files",
        
        [Parameter(Mandatory=$false)]
        [string]$NewFileName
    )
    
    # Check if source file exists
    if (-not (Test-Path $SourcePath)) {
        Write-Host "Warning: Source file not found: $SourcePath" -ForegroundColor Yellow
        return $false
    }
    
    # If no new filename specified, use the original filename
    if (-not $NewFileName) {
        $NewFileName = (Get-Item $SourcePath).Name
    }
    
    # Create the full destination path
    $destinationPath = Join-Path -Path $DestinationDir -ChildPath $NewFileName
    
    # Copy the file
    try {
        Copy-Item -Path $SourcePath -Destination $destinationPath -Force
        Write-Host "Copied: $SourcePath to $destinationPath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Error copying file: $_" -ForegroundColor Red
        return $false
    }
}

# Create ai-chat-files directory if it doesn't exist
$aiChatFilesDir = "ai-chat-files"
if (-not (Test-Path $aiChatFilesDir)) {
    New-Item -ItemType Directory -Path $aiChatFilesDir | Out-Null
    Write-Host "Created directory: $aiChatFilesDir" -ForegroundColor Cyan
}

# Copy the project plan and status file using the new helper function
Copy-ToAIChatFiles -SourcePath "../prisoners-dilemma-docs/docs/project-plan-and-status.md"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/game-app.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/player-registration/player-form.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/player-storage.service.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/game-app.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/player-form.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/services/player-storage.service.test.ts"

Write-Host "Script completed successfully!" -ForegroundColor Cyan