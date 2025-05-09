# Prisoner's Dilemma Game
A game based on the project in 
[What Game Theory Reveals About Life, The Universe, and Everything](https://youtu.be/mScpHTIi-kM?si=pEeo6_Cg2zjh-FHq)

## Documentation and Journaling
- [Documentation](https://randallard.github.io/prisoners-dilemma-docs)
- [Coding with AI Project](https://randallard.github.io/coding-with-ai/projects/prisoners-dilemma/)

## Development

Run tests with:

```bash
# Run unit tests with Vitest
npm run test:unit

# Run component tests with @web/test-runner
npm run test:components

# Run all tests
npm run test
```

## AI Development Tools

Use the PowerShell script to prepare files for AI assistant review:

```powershell
# Basic usage - copies core project files only
.\get-current-for-ai.ps1

# Include the 3 most recent journal entries
.\get-current-for-ai.ps1 -JournalEntries 3

# Include user stories documentation
.\get-current-for-ai.ps1 -IncludeUserStories

# Include both journal entries and user stories
.\get-current-for-ai.ps1 -JournalEntries 2 -IncludeUserStories
```

The script copies selected files to an `ai-chat-files` directory for easy sharing with AI assistants.