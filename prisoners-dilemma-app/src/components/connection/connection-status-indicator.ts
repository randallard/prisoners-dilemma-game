import { html, css, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ConnectionService } from '../../services/connection-service';

/**
 * Interface for connection state change event detail
 */
interface ConnectionStateChangedDetail {
  isConnected: boolean;
}

/**
 * Declare global event map for TypeScript type checking
 */
declare global {
  interface HTMLElementEventMap {
    'connection-state-changed': CustomEvent<ConnectionStateChangedDetail>;
  }
}

/**
 * Component that displays the WebSocket connection status and provides controls
 * for managing the connection.
 * 
 * @cssvar --color-primary - Primary color for connected state
 * @cssvar --color-error - Color for error state
 * @cssvar --color-gray - Color for disconnected state
 * @cssvar --color-background - Background color
 * @cssvar --color-background-dark - Dark mode background color
 * @cssvar --color-text - Text color
 * @cssvar --color-text-dark - Dark mode text color
 */
@customElement('connection-status-indicator')
export class ConnectionStatusIndicator extends LitElement {
  @property({ type: String, attribute: 'player-id' }) playerID = '';
  
  @state() isConnected = false;
  @state() errorMessage = '';
  @state() hasError = false;
  
  private connectionService: ConnectionService = new ConnectionService();
  
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, 'Arial, sans-serif');
    }
    
    .status-container {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      border-radius: 0.25rem;
      background-color: var(--color-background, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    :host-context(.dark) .status-container,
    @media (prefers-color-scheme: dark) {
      .status-container {
        background-color: var(--color-background-dark, #1f2937);
        color: var(--color-text-dark, #f3f4f6);
      }
    }
    
    .status-indicator {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      margin-right: 0.5rem;
    }
    
    .status-indicator.connected {
      background-color: var(--color-primary, #10b981);
      box-shadow: 0 0 5px var(--color-primary, #10b981);
    }
    
    .status-indicator.disconnected {
      background-color: var(--color-gray, #6b7280);
    }
    
    .status-indicator.error {
      background-color: var(--color-error, #ef4444);
      box-shadow: 0 0 5px var(--color-error, #ef4444);
    }
    
    .status-text {
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .error-message {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--color-error, #ef4444);
    }
    
    button {
      margin-left: auto;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      border: 1px solid var(--color-gray, #6b7280);
      background-color: transparent;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    :host-context(.dark) button,
    @media (prefers-color-scheme: dark) {
      button {
        border-color: var(--color-gray, #4b5563);
      }
      button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  `;
  
  /**
   * Connected callback lifecycle method
   */
  connectedCallback(): void {
    super.connectedCallback();
    
    // If playerID is provided via attribute, connect automatically
    if (this.playerID) {
      this.setPlayerID(this.playerID);
    }
  }
  
  /**
   * Disconnected callback lifecycle method
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disconnect();
  }
  
  /**
   * Sets the player ID and connects to the WebSocket
   * 
   * @param playerID The ID of the player
   */
  async setPlayerID(playerID: string): Promise<void> {
    this.playerID = playerID;
    
    // Reset error state
    this.hasError = false;
    this.errorMessage = '';
    
    // Connect to WebSocket
    const result = await this.connectionService.connectToWebSocket(playerID);
    
    if (result.isSuccess()) {
      this.isConnected = true;
      this.hasError = false;
      this.errorMessage = '';
      this.dispatchConnectionStateEvent(true);
    } else {
      this.isConnected = false;
      this.hasError = true;
      this.errorMessage = result.getError().message;
      this.dispatchConnectionStateEvent(false);
    }
    
    this.requestUpdate();
  }
  
  /**
   * Disconnects from the WebSocket
   */
  disconnect(): void {
    this.connectionService.disconnectFromWebSocket();
    this.isConnected = false;
    this.dispatchConnectionStateEvent(false);
  }
  
  /**
   * Dispatches a connection state changed event
   * 
   * @param isConnected Whether the connection is established
   */
  private dispatchConnectionStateEvent(isConnected: boolean): void {
    const event = new CustomEvent<ConnectionStateChangedDetail>('connection-state-changed', {
      detail: { isConnected },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
  }
  
  /**
   * Renders the connection status indicator
   */
  render(): TemplateResult {
    return html`
      <div class="status-container">
        <div 
          class="status-indicator ${this.isConnected ? 'connected' : this.hasError ? 'error' : 'disconnected'}"
        ></div>
        <div class="status-text">
          ${this.isConnected 
            ? 'Connected' 
            : this.hasError 
              ? 'Error' 
              : 'Disconnected'}
        </div>
        ${this.hasError 
          ? html`<div class="error-message">${this.errorMessage}</div>` 
          : ''}
        ${this.isConnected 
          ? html`<button @click=${this.disconnect}>Disconnect</button>` 
          : this.playerID 
            ? html`<button @click=${() => this.setPlayerID(this.playerID)}>Reconnect</button>` 
            : ''}
      </div>
    `;
  }
  
  /**
   * Test helper method to verify current connection state
   * This method is only for testing and should not be used in production code
   * 
   * @returns Current connection state
   */
  _testGetConnectionState(): { isConnected: boolean; hasError: boolean; errorMessage: string } {
    return {
      isConnected: this.isConnected,
      hasError: this.hasError,
      errorMessage: this.errorMessage
    };
  }
}