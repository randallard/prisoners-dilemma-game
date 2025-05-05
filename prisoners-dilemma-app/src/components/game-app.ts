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
  public playerStorageService: PlayerStorageService = new PlayerStorageService();
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  connectedCallback() {
    super.connectedCallback();
    
    // Load existing player data or show registration
    this.player = this.playerStorageService.getPlayer();
    
    // If player exists, increment the open count
    if (this.player) {
      this.playerStorageService.incrementOpenCount();
      // Refresh player data after incrementing
      this.player = this.playerStorageService.getPlayer();
    }
  }
  
  render() {
    // Show player registration if no player exists
    if (!this.player) {
      return this._renderRegistration();
    }
    
    // Otherwise show the game screen
    return this._renderGameScreen();
  }

  public setPlayerForTesting(playerData: PlayerData | null) {
    this.player = playerData;
  }
  
  private _renderRegistration() {
    return html`
      <player-form @register=${this._handleRegister}></player-form>
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
      </div>
    `;
  }
  
  private _handleRegister(e: CustomEvent) {
    const { name } = e.detail;
    
    // Save player data
    this.playerStorageService.savePlayer(name);
    
    // Refresh player data
    this.player = this.playerStorageService.getPlayer();
  }
}