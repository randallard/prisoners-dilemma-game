import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PlayerStorageService, PlayerData } from '../services/player-storage.service';
import './player-registration/player-form';

// Import Tailwind styles
import tailwindStyles from '../tailwind-output.css?inline';

/**
 * Main Game Application Component
 * Handles player registration and game display
 */
@customElement('game-app')
export class GameApp extends LitElement {
  @state() private player: PlayerData | null = null;
  
  // This will be injected in tests but created normally in connectedCallback
  public playerStorageService: PlayerStorageService = (() => {
    console.log('Creating new PlayerStorageService instance');
    const service = new PlayerStorageService();
    console.log('PlayerStorageService instance created:', service);
    return service;
  })();
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  // IMPORTANT: Shadow DOM setting for Lit components
  // Completely disable Shadow DOM to ensure events propagate correctly
  override createRenderRoot() {
    console.log('Creating render root without Shadow DOM');
    return this;  // Disables Shadow DOM to ensure events propagate correctly
  }
  
  connectedCallback() {
    super.connectedCallback();

    console.log('Testing localStorage functionality');
    PlayerStorageService.testLocalStorage();
    
    console.log('GameApp connected to DOM');
    
    // Load existing player data or show registration
    this.player = this.playerStorageService.getPlayer();
    console.log('Initial player data loaded:', this.player);
    
    // If player exists, increment the open count
    if (this.player) {
      this.playerStorageService.incrementOpenCount();
      // Refresh player data after incrementing
      this.player = this.playerStorageService.getPlayer();
      console.log('Updated player data after increment:', this.player);
    }

    // Add direct event listener for register event
    console.log('Adding direct event listener for register event');
    
    // Fix TypeScript error by properly typing the event handler
    this.addEventListener('register', ((e: Event) => {
      console.log('Register event captured at component level');
      this._handleRegister(e as CustomEvent);
    }) as EventListener);
    
    // Add document-level event listener with proper typing
    document.addEventListener('register', ((e: Event) => {
      console.log('Register event captured at document level');
      this._handleRegister(e as CustomEvent);
    }) as EventListener);
    
    // Add a fallback event listener on window
    window.addEventListener('register-fallback', ((e: Event) => {
      console.log('Fallback register event received at window level:', (e as CustomEvent).detail);
      this._handleRegister(e as CustomEvent);
    }) as EventListener);

    // Add direct event handler for form registration events through standard DOM events
    // This uses a more direct approach that's less prone to event propagation issues
    this.setupDirectEventHandlers();

    // Listen for the test event
    this.addEventListener('test-event', ((e: Event) => {
      console.log('Test event received in GameApp:', (e as CustomEvent).detail);
    }) as EventListener);
    
    // Also listen at document level
    document.addEventListener('test-event', ((e: Event) => {
      console.log('Test event received at document level:', (e as CustomEvent).detail);
    }) as EventListener);
  }

  /**
   * Setup direct event handlers for the form registration
   * This provides a more robust approach to event handling
   */
  private setupDirectEventHandlers() {
    // Wait a short time to ensure the DOM is fully initialized
    setTimeout(() => {
      const formElement = this.querySelector('player-form');
      if (formElement) {
        console.log('Found player-form element, setting up direct event handler');
        
        // Add direct event handler to the form element
        formElement.addEventListener('register', ((e: Event) => {
          console.log('Direct register event handler triggered');
          e.stopPropagation(); // Prevent duplicate handling
          this._handleRegister(e as CustomEvent);
        }) as EventListener);
        
        // Also watch for standard form submission as a fallback
        const form = formElement.querySelector('form');
        if (form) {
          form.addEventListener('submit', (e: Event) => {
            console.log('Form submit event captured directly');
            e.preventDefault();
            
            // Get the input value directly from the DOM
            const nameInput = formElement.querySelector('input');
            if (nameInput) {
              const name = (nameInput as HTMLInputElement).value.trim();
              if (name) {
                console.log('Processing form submission with name:', name);
                this._processRegistration(name);
              }
            }
          });
        }
      } else {
        console.warn('player-form element not found, skipping direct event handler setup');
      }
    }, 100); // Short delay to ensure DOM elements are available
  }
  
  render() {
    console.log('Rendering GameApp, player =', this.player);
    // Show player registration if no player exists
    if (!this.player) {
      console.log('Rendering registration form');
      return this._renderRegistration();
    }
    
    // Otherwise show the game screen
    console.log('Rendering game screen');
    return this._renderGameScreen();
  }

  public setPlayerForTesting(playerData: PlayerData | null) {
    this.player = playerData;
  }
  
  private _renderRegistration() {
    return html`
      <player-form @register=${(e: CustomEvent) => this._handleRegister(e)}></player-form>
    `;
  }
  
  private _renderGameScreen() {
    return html`
      <div class="game-screen bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">
          Prisoner's Dilemma
        </h2>
        
        <div class="text-center mb-4">
          <p class="player-name text-lg">
            Player: <span class="font-medium">${this.player?.name}</span>
          </p>
          <p class="open-count text-gray-600">
            Times opened: <span class="font-medium">${this.player?.openCount}</span>
          </p>
        </div>
        
        <p class="text-center text-gray-700 mb-4">
          Game functionality coming soon!
        </p>
        
        <!-- Emergency reset button for testing -->
        <button 
          @click=${this._resetPlayer}
          class="mt-4 py-2 px-4 border-0 rounded-lg shadow-sm text-sm 
                font-medium text-white bg-red-600 hover:bg-red-700"
        >
          Reset Player Data
        </button>
      </div>
    `;
  }
  
  /**
   * Handle registration event
   * Extracts player name from CustomEvent and processes registration
   */
  private _handleRegister(e: CustomEvent) {
    console.log('_handleRegister method called with event:', e);
    console.log('Event detail:', e.detail);
    
    if (e.detail && e.detail.name) {
      const { name } = e.detail;
      this._processRegistration(name);
    } else {
      console.error('Register event missing name in detail:', e);
    }
  }
  
  /**
   * Process player registration with the given name
   * Centralizes registration logic for multiple event sources
   */
  private _processRegistration(name: string) {
    console.log('Processing registration for name:', name);
    
    if (!name || !name.trim()) {
      console.error('Invalid name provided for registration');
      return;
    }
    
    // Save player data
    console.log('About to call playerStorageService.savePlayer with name:', name);
    try {
      const playerId = this.playerStorageService.savePlayer(name);
      console.log('Player saved successfully with ID:', playerId);
    } catch (error) {
      console.error('Error saving player:', error);
      // Try a direct localStorage operation as a fallback
      try {
        const playerId = 'fallback-' + Math.random().toString(36).substring(2, 9);
        const playerData = {
          id: playerId,
          name: name.trim(),
          openCount: 1
        };
        localStorage.setItem('prisonersDilemma_player', JSON.stringify(playerData));
        console.log('Fallback save successful');
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
      }
    }
    
    // Refresh player data
    console.log('Getting updated player data after save');
    this.player = this.playerStorageService.getPlayer();
    console.log('Updated player data:', this.player);
    
    // Check localStorage directly
    console.log('Direct localStorage check:', localStorage.getItem('prisonersDilemma_player'));
    
    // Force update
    console.log('Requesting UI update');
    this.requestUpdate();
  }
  
  // Emergency reset function for testing
  private _resetPlayer() {
    console.log('Resetting player data');
    localStorage.removeItem('prisonersDilemma_player');
    this.player = null;
    this.requestUpdate();
  }
}