# PowerShell script to copy relevant files to ai-chat-files directory

param (
    [Parameter()]
    [int]$JournalEntries = 0,  # Default to 1 if not specified

    [Parameter()]
    [switch]$IncludeUserStories = $false  # New flag to include user stories
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
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/components/player-registration/player-form.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/src/services/player-storage.service.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/game-app.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/components/player-form.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/test/services/player-storage.service.test.ts"
Copy-ToAIChatFiles -SourcePath "prisoners-dilemma-app/index.html"

# Copy user stories if the flag is set
if ($IncludeUserStories) {
    $userStoriesPath = "../prisoners-dilemma-docs/docs/technical/user-stories.md"
    Copy-ToAIChatFiles -SourcePath $userStoriesPath
    if ($?) {
        Write-Host "Included user stories file as requested" -ForegroundColor Cyan
    }
}

# Find and copy the latest N journal entries
$journalDir = "../prisoners-dilemma-docs/docs/development-journal"
if (Test-Path $journalDir) {
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
    Write-Host "Warning: Could not find journal directory $journalDir" -ForegroundColor Yellow
}

Write-Host "Script completed successfully!" -ForegroundColor Cyan