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
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  connectedCallback() {
    super.connectedCallback();
    
    // Initialize services
    this.playerStorageService = new PlayerStorageService();
    this.connectionService = new ConnectionService();
    
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
    this.addEventListener('game-requested', this.handleGameRequested);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove event listeners
    this.removeEventListener('game-requested', this.handleGameRequested);
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
      <player-form @register=${this._handleRegister}></player-form>
    `;
  }
  
  private _renderGameLobby() {
    return html`
      <div class="game-screen bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">
              Prisoner's Dilemma
            </h2>
            
            <div class="mt-2">
              <p class="player-name text-lg">
                Welcome, <span class="font-medium">${this.player?.name}</span>
              </p>
              <p class="open-count text-gray-600 text-sm">
                Times opened: <span class="font-medium">${this.player?.openCount}</span>
              </p>
            </div>
          </div>
          
          <div class="mt-4 md:mt-0">
            <button
              @click=${this._handleSignOut}
              class="text-sm text-gray-600 hover:text-gray-800 underline"
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
      <div class="game-screen bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            Game with ${this.activeConnection?.name}
          </h2>
          
          <button
            @click=${this._handleExitGame}
            class="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Exit Game
          </button>
        </div>
        
        <div class="text-center p-10 bg-gray-100 rounded-lg">
          <p class="text-lg text-gray-700 mb-4">
            Game functionality coming soon!
          </p>
          <p class="text-gray-600">
            You are playing with ${this.activeConnection?.name}
          </p>
        </div>
      </div>
    `;
  }
  
  private _renderErrorScreen() {
    return html`
      <div class="error-screen bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-center text-red-600 mb-4">
          Error
        </h2>
        
        <p class="text-center text-gray-700 mb-6">
          ${this.errorMessage}
        </p>
        
        <button
          @click=${this._dismissError}
          class="w-full py-3 px-4 border-0 rounded-lg shadow-md text-lg font-medium 
                 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                 focus:ring-blue-500 transition-colors duration-200"
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
  private handleGameRequested = (e: CustomEvent) => {
    const { connectionId, connectionName } = e.detail;
    this.startGame(connectionId, connectionName);
  };
  
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