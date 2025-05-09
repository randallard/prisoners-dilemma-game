import { html, fixture, expect, oneEvent } from '@open-wc/testing';
import { GameApp } from '../../src/components/game-app';
import { PlayerStorageService, PlayerData } from '../../src/services/player-storage.service';
import { Result } from '../../src/services/connection-result';
import { PlayerError, PlayerErrorType } from '../../src/services/player-result';

// Make sure the component definition is registered
import '../../src/components/game-app';
import '../../src/components/player-registration/player-form';

// Create a mock implementation of PlayerStorageService
class MockPlayerStorageService extends PlayerStorageService {
  // Override methods for testing
  savePlayer(name: string): Result<string, PlayerError> {
    if (!name || name.trim() === '') {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.INVALID_NAME,
          'Player name cannot be empty'
        )
      );
    }
    
    // Set mock values instead of actually using localStorage
    this.mockPlayerId = 'test-id-123';
    this.mockPlayerName = name;
    this.mockOpenCount = 1;
    
    return Result.success(this.mockPlayerId);
  }

  getPlayer(): Result<PlayerData, PlayerError> {
    if (!this.mockPlayerId) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.PLAYER_NOT_FOUND,
          'No player data found'
        )
      );
    }
    
    return Result.success({
      id: this.mockPlayerId,
      name: this.mockPlayerName,
      openCount: this.mockOpenCount
    });
  }

  incrementOpenCount(): Result<boolean, PlayerError> {
    if (!this.mockPlayerId) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.PLAYER_NOT_FOUND,
          'No player data found'
        )
      );
    }
    
    this.mockOpenCount++;
    return Result.success(true);
  }

  updatePlayerName(name: string): Result<boolean, PlayerError> {
    if (!this.mockPlayerId) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.PLAYER_NOT_FOUND,
          'No player data found'
        )
      );
    }
    
    if (!name || name.trim() === '') {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.INVALID_NAME,
          'Player name cannot be empty'
        )
      );
    }
    
    this.mockPlayerName = name;
    return Result.success(true);
  }

  // Override protected method for testing
  protected generateUUID(): string {
    return 'test-id-123'; // Return a fixed ID for testing
  }

  // Mock state properties
  private mockPlayerId: string | null = null;
  private mockPlayerName: string = '';
  private mockOpenCount: number = 0;
  
  // Helper for testing
  public setMockPlayer(id: string, name: string, openCount: number) {
    this.mockPlayerId = id;
    this.mockPlayerName = name;
    this.mockOpenCount = openCount;
  }
  
  public clearMockPlayer() {
    this.mockPlayerId = null;
    this.mockPlayerName = '';
    this.mockOpenCount = 0;
  }
}

describe('GameApp', () => {
  let element: GameApp;
  let mockService: MockPlayerStorageService;

  beforeEach(async () => {
    // Reset the mock service completely for each test
    mockService = new MockPlayerStorageService();
    
    // Create element with fixture
    element = await fixture<GameApp>(html`<game-app></game-app>`);
    
    // Replace the service with our mock
    element.playerStorageService = mockService;
    
    // Wait for update to complete
    await element.updateComplete;
  });

  it('shows registration form when no player exists', async () => {
    // Ensure no player exists
    mockService.clearMockPlayer();
    
    // Trigger update and wait for it to complete
    await element.requestUpdate();
    await element.updateComplete;
    
    // Check that the form exists
    const form = element.shadowRoot!.querySelector('player-form');
    expect(form).to.exist;
  });

  it('shows game screen when player exists', async () => {
    // Set up mock player data
    mockService.setMockPlayer('test-id-123', 'Test Player', 1);
    
    // Use the dedicated testing method instead of direct property access
    const playerResult = mockService.getPlayer();
    expect(playerResult.isSuccess()).to.be.true;
    element.setPlayerForTesting(playerResult.getValue());
    
    // Force re-render and wait for update to complete
    await element.updateComplete;
        
    // Check if player form is gone
    const playerForm = element.shadowRoot!.querySelector('player-form');
    expect(playerForm).to.not.exist;
    
    // Check if game screen appears instead
    const gameScreen = element.shadowRoot!.querySelector('.game-screen');
    expect(gameScreen).to.exist;
    
    // Verify player name and open count are displayed
    const playerNameElement = element.shadowRoot!.querySelector('.player-name');
    expect(playerNameElement?.textContent).to.include('Test Player');
    
    const openCountElement = element.shadowRoot!.querySelector('.open-count');
    expect(openCountElement?.textContent).to.include('1');
  });

  it('saves player data when registration form is submitted', async () => {
    // Ensure no player exists
    mockService.clearMockPlayer();
    
    // Trigger update to show the form
    await element.requestUpdate();
    await element.updateComplete;
    
    // Verify the form is showing
    const form = element.shadowRoot!.querySelector('player-form');
    expect(form).to.exist;
    
    // Track if savePlayer was called with correct name
    let savedName = '';
    const originalSavePlayer = mockService.savePlayer;
    mockService.savePlayer = (name: string) => {
      savedName = name;
      mockService.setMockPlayer('test-id-123', name, 1);
      return Result.success('test-id-123');
    };
    
    // Dispatch the register event
    form!.dispatchEvent(new CustomEvent('register', {
      detail: { name: 'Test Player' },
      bubbles: true,
      composed: true
    }));
    
    // Wait for update to complete
    await element.updateComplete;
    
    // Check that the name was saved
    expect(savedName).to.equal('Test Player');
    
    // Check that the game screen is now showing
    const gameScreen = element.shadowRoot!.querySelector('.game-screen');
    expect(gameScreen).to.exist;
  });
  
  it('shows error screen when player storage fails', async () => {
    // Ensure no player exists
    mockService.clearMockPlayer();
    
    // Set up mock to simulate a storage error
    mockService.savePlayer = () => Result.failure(
      new PlayerError(
        PlayerErrorType.STORAGE_ERROR,
        'Failed to save player data'
      )
    );
    
    // Get and submit the form
    const form = element.shadowRoot!.querySelector('player-form');
    expect(form).to.exist;
    
    form!.dispatchEvent(new CustomEvent('register', {
      detail: { name: 'Test Player' },
      bubbles: true,
      composed: true
    }));
    
    // Wait for update to complete
    await element.updateComplete;
    
    // Check that the error screen is showing
    const errorScreen = element.shadowRoot!.querySelector('.error-screen');
    expect(errorScreen).to.exist;
    expect(errorScreen!.textContent).to.include('Failed to save player data');
    
    // Check that the error can be dismissed
    const tryAgainButton = element.shadowRoot!.querySelector<HTMLButtonElement>('.error-screen button');
    expect(tryAgainButton).to.exist;
    
    tryAgainButton!.click();
    await element.updateComplete;
    
    // Should now show the registration form again
    const registrationForm = element.shadowRoot!.querySelector('player-form');
    expect(registrationForm).to.exist;
  });
});