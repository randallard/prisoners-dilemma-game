import { html, css, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ConnectionService } from '../../services/connection-service';
import { ConnectionData } from '../../models/connection-data';
import './connection-status-indicator';
import './connection-updates-manager';

/**
 * Component that integrates all WebSocket connection management functionality
 */
@customElement('websocket-connection-manager')
export class WebsocketConnectionManager extends LitElement {
  @property({ type: String, attribute: 'player-id' }) playerID = '';
  @state() connections: ConnectionData[] = [];
  @state() isConnected = false;
  
  private connectionService: ConnectionService = new ConnectionService();
  
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, 'Arial, sans-serif');
    }
    
    .connection-manager {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .section {
      margin-bottom: 1.5rem;
    }
    
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--color-text, #1f2937);
    }
    
    :host-context(.dark) .section-title,
    @media (prefers-color-scheme: dark) {
      .section-title {
        color: var(--color-text-dark, #f3f4f6);
      }
    }
    
    .connection-status-section {
      margin-bottom: 1rem;
    }
  `;
  
  /**
   * Connected callback lifecycle method
   */
  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    
    // Load connections from storage
    await this.loadConnections();
    
    // If playerID is provided via attribute, connect automatically
    if (this.playerID) {
      this.connectWebSocket();
    }
  }
  
  /**
   * Disconnected callback lifecycle method
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    
    // Disconnect from WebSocket when component is removed
    this.disconnectWebSocket();
  }
  
  /**
   * Updates the component when properties change
   * 
   * @param changedProperties Changed properties map
   */
  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('playerID') && this.playerID) {
      // Connect to WebSocket if playerID changes and is set
      this.connectWebSocket();
    }
  }
  
  /**
   * Loads connections from storage
   */
  async loadConnections(): Promise<void> {
    const result = await this.connectionService.getAllConnections();
    
    if (result.isSuccess()) {
      this.connections = result.getValue();
    } else {
      console.error('Failed to load connections:', result.getError());
    }
  }
  
  /**
   * Connects to the WebSocket server
   */
  async connectWebSocket(): Promise<void> {
    if (!this.playerID) {
      return;
    }
    
    const result = await this.connectionService.connectToWebSocket(this.playerID);
    
    if (result.isSuccess()) {
      this.isConnected = true;
    } else {
      console.error('Failed to connect to WebSocket:', result.getError());
    }
  }
  
  /**
   * Disconnects from the WebSocket server
   */
  disconnectWebSocket(): void {
    this.connectionService.disconnectFromWebSocket();
    this.isConnected = false;
  }
  
  /**
   * Handles connection state changes from the indicator
   * 
   * @param e Custom event with connection state
   */
  private handleConnectionStateChange(e: CustomEvent): void {
    this.isConnected = e.detail.isConnected;
  }
  
  /**
   * Handles connection updates
   * 
   * @param e Custom event with updated connection
   */
  private handleConnectionUpdate(e: CustomEvent): void {
    const { connectionId, connection } = e.detail;
    
    // Update the connections array
    const index = this.connections.findIndex(conn => conn.id === connectionId);
    
    if (index >= 0) {
      this.connections = [
        ...this.connections.slice(0, index),
        connection,
        ...this.connections.slice(index + 1)
      ];
    }
  }
  
  /**
   * Renders the WebSocket connection manager
   */
  render(): TemplateResult {
    return html`
      <div class="connection-manager">
        <div class="section connection-status-section">
          <div class="section-title">WebSocket Connection</div>
          <connection-status-indicator
            player-id="${this.playerID}"
            @connection-state-changed="${this.handleConnectionStateChange}"
          ></connection-status-indicator>
        </div>
        
        ${this.isConnected ? html`
          <div class="section">
            <div class="section-title">Real-time Updates</div>
            <connection-updates-manager
              .connections="${this.connections}"
              @connection-updated="${this.handleConnectionUpdate}"
            ></connection-updates-manager>
          </div>
        ` : ''}
      </div>
    `;
  }
}