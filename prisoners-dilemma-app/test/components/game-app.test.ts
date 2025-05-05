import { html, fixture, expect, oneEvent, waitUntil } from '@open-wc/testing';
import { GameApp } from '../../src/components/game-app';
import { PlayerStorageService } from '../../src/services/player-storage.service';

// Make sure the component definition is registered
import '../../src/components/game-app';
import '../../src/components/player-registration/player-form';

// Create a mock implementation of PlayerStorageService
class MockPlayerStorageService extends PlayerStorageService {
  // Override methods for testing
  savePlayer(name: string): string {
    // Set mock values instead of actually using localStorage
    this.mockPlayerId = 'test-id-123';
    this.mockPlayerName = name;
    this.mockOpenCount = 1;
    return this.mockPlayerId;
  }

  getPlayer() {
    if (!this.mockPlayerId) return null;
    return {
      id: this.mockPlayerId,
      name: this.mockPlayerName,
      openCount: this.mockOpenCount
    };
  }

  incrementOpenCount() {
    if (this.mockOpenCount) {
      this.mockOpenCount++;
    }
  }

  updatePlayerName(name: string) {
    this.mockPlayerName = name;
  }

  // Override protected method for testing
  protected generateUUID(): string {
    return 'test-id-123'; // Return a fixed ID for testing
  }

  // Mock state properties
  private mockPlayerId: string | null = null;
  private mockPlayerName: string = '';
  private mockOpenCount: number = 0;
}

describe('GameApp', () => {
  let element: GameApp;
  let mockService: MockPlayerStorageService;

  beforeEach(async () => {
    // Reset the mock service completely for each test
    mockService = new MockPlayerStorageService();
    
    // Define a fixed behavior for getPlayer initially
    // This is critical - an inconsistent mock can lead to infinite updates
    const noPlayer = mockService.getPlayer() === null;
    
    // Create element with fixture
    element = await fixture<GameApp>(html`<game-app></game-app>`);
    
    // Replace the service with our mock
    element.playerStorageService = mockService;
    
    // Wait for update to complete
    await element.updateComplete;
  });

  it('shows registration form when no player exists', async () => {
    // Explicitly ensure no player exists
    mockService.getPlayer = () => null;
    
    // Trigger update and wait for it to complete
    await element.requestUpdate();
    await element.updateComplete;
    
    // Check that the form exists
    const form = element.shadowRoot!.querySelector('player-form');
    expect(form).to.exist;
  });

  it('shows game screen when player exists', async () => {
    mockService.savePlayer('Test Player');
    
    // Use the dedicated testing method instead of direct property access
    element.setPlayerForTesting(mockService.getPlayer());
    
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

  // We'll add the event test back after fixing the core tests
  it('saves player data when registration form is submitted', async () => {
    // Ensure no player exists
    mockService.getPlayer = () => null;
    
    // Trigger update to show the form
    await element.requestUpdate();
    await element.updateComplete;
    
    // Verify the form is showing
    const form = element.shadowRoot!.querySelector('player-form');
    expect(form).to.exist;
    
    // Track if savePlayer was called
    let savedName = '';
    mockService.savePlayer = (name: string) => {
      savedName = name;
      return 'test-id-123';
    };
    
    // Configure getPlayer to return a player AFTER savePlayer is called
    let playerWasSaved = false;
    mockService.getPlayer = () => {
      if (playerWasSaved) {
        return {
          id: 'test-id-123',
          name: savedName,
          openCount: 1
        };
      }
      return null;
    };
    
    // Dispatch the register event
    form!.dispatchEvent(new CustomEvent('register', {
      detail: { name: 'Test Player' },
      bubbles: true,
      composed: true
    }));
    
    // Mark that player was saved to change mock behavior
    playerWasSaved = true;
    
    // Wait for update to complete
    await element.updateComplete;
    
    // Check that the name was saved
    expect(savedName).to.equal('Test Player');
  });
});