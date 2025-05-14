import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PlayerStorageService, PlayerData } from '../services/player-storage.service';
import { ConnectionService } from '../services/connection.service';
import './player-registration/player-form';
import './connection/connection-manager';

// Import Tailwind styles
import tailwindStyles from '../tailwind-output.css?inline';

/**
 * Main Game Application Component
 * Handles player registration, connection management, and game display
 */
@customElement('game-app')
export class GameApp extends LitElement {
  @state() private player: PlayerData | null = null;
  @state() private errorMessage: string | null = null;
  @state() private activeConnection: { id: string, name: string } | null = null;
  @state() private isPlaying: boolean = false;
  
  // These will be injected in tests but created normally in connectedCallback
  public playerStorageService: PlayerStorageService = new PlayerStorageService();
  public connectionService: ConnectionService = new ConnectionService();
  
  // Bound event handler reference - important for proper removeEventListener
  // Changed type from CustomEvent to Event to match EventListener interface
  private boundHandleGameRequested: (e: Event) => void;
  
  constructor() {
    super();
    // Bind the event handler in the constructor
    this.boundHandleGameRequested = this.handleGameRequested.bind(this);
  }
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`
    ${unsafeCSS(tailwindStyles)}
    
    /* Ensure the dark mode toggle is visible and has appropriate spacing */
    .game-header {
      position: relative;
      z-index: 5;
    }
    
    dark-mode-toggle {
      display: inline-block;
      margin-right: 12px;
    }
  `;
  
  connectedCallback() {
    super.connectedCallback();
    
    // Initialize services
    this.playerStorageService = new PlayerStorageService();
    this.connectionService = new ConnectionService();
    
    // Initialize dark mode
    
    // Load existing player data or show registration
    const playerResult = this.playerStorageService.getPlayer();
    
    if (playerResult.isSuccess()) {
      this.player = playerResult.getValue();
      
      // If player exists, increment the open count
      const incrementResult = this.playerStorageService.incrementOpenCount();
      
      if (incrementResult.isSuccess()) {
        // Refresh player data after incrementing
        const updatedPlayerResult = this.playerStorageService.getPlayer();
        if (updatedPlayerResult.isSuccess()) {
          this.player = updatedPlayerResult.getValue();
        }
      }
    } else {
      // No player found, leave this.player as null
      this.player = null;
    }
    
    // Listen for game-requested events from connection manager
    // Use the bound reference
    this.addEventListener('game-requested', this.boundHandleGameRequested);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove event listeners - use the same bound reference
    this.removeEventListener('game-requested', this.boundHandleGameRequested);
  }
  
  render() {
    // Show error message if there is one
    if (this.errorMessage) {
      return this._renderErrorScreen();
    }
    
    // Show player registration if no player exists
    if (!this.player) {
      return this._renderRegistration();
    }
    
    // If actively playing a game, show the game screen
    if (this.isPlaying && this.activeConnection) {
      return this._renderActiveGame();
    }
    
    // Otherwise show the game lobby with connection manager
    return this._renderGameLobby();
  }

  public setPlayerForTesting(playerData: PlayerData | null) {
    this.player = playerData;
  }
  
  private _renderRegistration() {
    return html`
      <div class="flex justify-between items-center mb-4 game-header">
        <div></div>
      </div>
      <player-form @register=${this._handleRegister}></player-form>
    `;
  }
  
  private _renderGameLobby() {
    return html`
      <div class="game-screen bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div class="game-header flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <div>
            <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Prisoner's Dilemma
            </h2>
            
            <div class="mt-2">
              <p class="player-name text-lg">
                Welcome, <span class="font-medium text-gray-900 dark:text-gray-100">${this.player?.name}</span>
              </p>
              <p class="open-count text-gray-600 dark:text-gray-400 text-sm">
                Times opened: <span class="font-medium">${this.player?.openCount}</span>
              </p>
            </div>
          </div>
          
          <div class="mt-4 md:mt-0 flex items-center space-x-2">
            <dark-mode-toggle></dark-mode-toggle>
            <button
              @click=${this._handleSignOut}
              class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <connection-manager></connection-manager>
      </div>
    `;
  }
  
  private _renderActiveGame() {
    return html`
      <div class="game-screen bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div class="game-header flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Game with ${this.activeConnection?.name}
          </h2>
          
          <div class="flex items-center space-x-2">
            <dark-mode-toggle></dark-mode-toggle>
            <button
              @click=${this._handleExitGame}
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Exit Game
            </button>
          </div>
        </div>
        
        <div class="text-center p-10 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
            Game functionality coming soon!
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            You are playing with ${this.activeConnection?.name}
          </p>
        </div>
      </div>
    `;
  }
  
  private _renderErrorScreen() {
    return html`
      <div class="error-screen bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md mx-auto">
        <div class="game-header flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-center text-red-600 dark:text-red-400">
            Error
          </h2>
          <dark-mode-toggle></dark-mode-toggle>
        </div>
        
        <p class="text-center text-gray-700 dark:text-gray-300 mb-6">
          ${this.errorMessage}
        </p>
        
        <button
          @click=${this._dismissError}
          class="w-full py-3 px-4 border-0 rounded-lg shadow-md text-lg font-medium 
                 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    `;
  }
  
  private _handleRegister(e: CustomEvent) {
    const { name } = e.detail;
    
    // Save player data
    const saveResult = this.playerStorageService.savePlayer(name);
    
    if (saveResult.isSuccess()) {
      // Refresh player data
      const playerResult = this.playerStorageService.getPlayer();
      
      if (playerResult.isSuccess()) {
        this.player = playerResult.getValue();
        this.errorMessage = null;
      } else {
        this.errorMessage = playerResult.getError().message;
      }
    } else {
      this.errorMessage = saveResult.getError().message;
    }
  }
  
  private _dismissError() {
    this.errorMessage = null;
  }
  
  private _handleSignOut() {
    // For now, just reset the player data
    this.player = null;
    this.isPlaying = false;
    this.activeConnection = null;
    
    // In a real implementation, we might clear localStorage or perform other cleanup
  }
  
  private _handleExitGame() {
    this.isPlaying = false;
    this.activeConnection = null;
  }
  
  /**
   * Handles the game-requested event from the connection manager
   * @param e The event
   */
  private handleGameRequested(e: Event) {
    // Cast the Event to CustomEvent to access the detail property
    const customEvent = e as CustomEvent;
    const { connectionId, connectionName } = customEvent.detail;
    this.startGame(connectionId, connectionName);
  }
  
  /**
   * Starts a game with the specified connection
   * @param connectionId The ID of the connection to play with
   * @param connectionName The name of the connection to play with
   */
  private startGame(connectionId: string, connectionName: string) {
    // Set the active connection and enter game mode
    this.activeConnection = { id: connectionId, name: connectionName };
    this.isPlaying = true;
  }
}