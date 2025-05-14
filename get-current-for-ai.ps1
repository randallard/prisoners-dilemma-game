# PowerShell script to copy relevant files to ai-chat-files directory
#
# Usage examples:
#
# 1. Basic usage - copies core project files only
#    .\get-current-for-ai.ps1
#
# 2. Include the 3 most recent journal entries
#    .\get-current-for-ai.ps1 -JournalEntries 3
#
# 3. Include user stories documentation
#    .\get-current-for-ai.ps1 -IncludeUserStories
#
# 4. Include both journal entries and user stories
#    .\get-current-for-ai.ps1 -JournalEntries 2 -IncludeUserStories

param (
    [Parameter()]
    [int]$JournalEntries = 0,  # Number of recent journal entries to include (0 = none)

    [Parameter()]
    [switch]$IncludeUserStories = $false  # Flag to include user stories documentation
)

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

$aiChatFilesDir = "ai-chat-files"

if (Test-Path $aiChatFilesDir) {
    Write-Host "Removing existing $aiChatFilesDir directory..." -ForegroundColor Cyan
    Remove-Item -Path $aiChatFilesDir -Recurse -Force
    Write-Host "Removed existing directory: $aiChatFilesDir" -ForegroundColor Cyan
}

# Create a fresh ai-chat-files directory
New-Item -ItemType Directory -Path $aiChatFilesDir | Out-Null
Write-Host "Created directory: $aiChatFilesDir" -ForegroundColor Cyan

# Copy the project plan and status file using the new helper function
Copy-ToAIChatFiles -SourcePath "../prisoners-dilemma-docs/docs/project-plan-and-status.md"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/game-app.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/dark-mode-toggle.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/player-registration/player-form.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/connection/connection-list.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/connection/connection-form.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/connection/connection-manager.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/player-storage.service.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/uuid-utils.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/connection.service.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/connection-result.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/dark-mode.service.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/player-result.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/dark-mode-toggle.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/game-app.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/player-form.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/connection-list.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/connection-form.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/connection-manager.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/mock-connection-service.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/unit/services/player-storage.service.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/unit/services/connection.service.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/unit/services/dark-mode.service.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/index.css"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/index.html"

# Copy user stories if the -IncludeUserStories flag is set
if ($IncludeUserStories) {
    $userStoriesPath = "../prisoners-dilemma-docs/docs/technical/user-stories.md"
    Copy-ToAIChatFiles -SourcePath $userStoriesPath
    if ($?) {
        Write-Host "Included user stories file as requested" -ForegroundColor Cyan
    }
}

# Find and copy the latest N journal entries if -JournalEntries parameter > 0
$journalDir = "../prisoners-dilemma-docs/docs/development-journal"
if ($JournalEntries -gt 0 -and (Test-Path $journalDir)) {
    # Get all entry files with pattern entry-*.md and sort them
    $entryFiles = Get-ChildItem -Path $journalDir -Filter "entry-*.md" | 
                  Where-Object { $_.Name -match "entry-\d+\.md" } |
                  Sort-Object -Property Name -Descending
    
    if ($entryFiles.Count -gt 0) {
        # Take the specified number of most recent entries (or all if fewer exist)
        $entriesToCopy = [Math]::Min($JournalEntries, $entryFiles.Count)
        Write-Host "Copying $entriesToCopy most recent journal entries..." -ForegroundColor Cyan
        
        for ($i = 0; $i -lt $entriesToCopy; $i++) {
            $entry = $entryFiles[$i]
            Copy-ToAIChatFiles -SourcePath $entry.FullName
        }
    } else {
        Write-Host "Warning: No journal entries found in $journalDir" -ForegroundColor Yellow
    }
} else {
    if ($JournalEntries -gt 0) {
        Write-Host "Warning: Could not find journal directory $journalDir" -ForegroundColor Yellow
    }
}

Write-Host "Script completed successfully!" -ForegroundColor Cyan