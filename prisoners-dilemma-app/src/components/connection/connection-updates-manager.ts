import { html, css, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ConnectionData } from '../../models/connection-data';
import { ConnectionStatus } from '../../models/connection-status';
import { ConnectionService } from '../../services/connection-service';

/**
 * Interface for connection update event detail
 */
interface ConnectionUpdatedDetail {
  connectionId: string;
  connection: ConnectionData;
}

/**
 * Declare global event map for TypeScript type checking
 */
declare global {
  interface HTMLElementEventMap {
    'connection-updated': CustomEvent<ConnectionUpdatedDetail>;
  }
}

/**
 * Component that manages and displays real-time updates for connections
 * 
 * @cssvar --color-primary - Primary color for active state
 * @cssvar --color-error - Color for error and expired state
 * @cssvar --color-gray - Color for pending state
 * @cssvar --color-background - Background color
 * @cssvar --color-background-dark - Dark mode background color
 * @cssvar --color-text - Text color
 * @cssvar --color-text-dark - Dark mode text color
 */
@customElement('connection-updates-manager')
export class ConnectionUpdatesManager extends LitElement {
  @property({ type: Array }) connections: ConnectionData[] = [];
  @state() syncInProgress = false;
  
  private connectionService: ConnectionService = new ConnectionService();
  
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, 'Arial, sans-serif');
    }
    
    .connections-container {
      padding: 1rem;
      border-radius: 0.5rem;
      background-color: var(--color-background, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    :host-context(.dark) .connections-container,
    @media (prefers-color-scheme: dark) {
      .connections-container {
        background-color: var(--color-background-dark, #1f2937);
        color: var(--color-text-dark, #f3f4f6);
      }
    }
    
    .title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    
    .no-connections {
      padding: 1rem;
      text-align: center;
      color: var(--color-gray, #6b7280);
      font-style: italic;
    }
    
    .connection-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .connection-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid var(--color-gray, #e5e7eb);
      transition: all 0.2s ease;
    }
    
    :host-context(.dark) .connection-item,
    @media (prefers-color-scheme: dark) {
      .connection-item {
        border-color: var(--color-gray, #4b5563);
      }
    }
    
    .connection-item:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .connection-status-dot {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      margin-right: 0.75rem;
      flex-shrink: 0;
    }
    
    .connection-status-dot.pending {
      background-color: var(--color-gray, #9ca3af);
    }
    
    .connection-status-dot.active {
      background-color: var(--color-primary, #10b981);
      box-shadow: 0 0 5px var(--color-primary, #10b981);
    }
    
    .connection-status-dot.expired {
      background-color: var(--color-error, #ef4444);
    }
    
    .connection-details {
      flex: 1;
    }
    
    .connection-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .connection-status {
      font-size: 0.75rem;
      color: var(--color-gray, #6b7280);
    }
    
    .connection-status.active {
      color: var(--color-primary, #10b981);
    }
    
    .connection-status.expired {
      color: var(--color-error, #ef4444);
    }
    
    .connection-timestamp {
      font-size: 0.75rem;
      color: var(--color-gray, #6b7280);
      margin-top: 0.25rem;
    }
    
    .sync-button {
      margin-left: auto;
      padding: 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      border: 1px solid var(--color-gray, #e5e7eb);
      background-color: transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    :host-context(.dark) .sync-button,
    @media (prefers-color-scheme: dark) {
      .sync-button {
        border-color: var(--color-gray, #4b5563);
        color: var(--color-text-dark, #f3f4f6);
      }
    }
    
    .sync-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    :host-context(.dark) .sync-button:hover,
    @media (prefers-color-scheme: dark) {
      .sync-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
    
    .sync-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .sync-icon {
      width: 1rem;
      height: 1rem;
    }
    
    .sync-icon.spinning {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;
  
  /**
   * Sets the connections to display
   * 
   * @param connections Array of connection data
   */
  setConnections(connections: ConnectionData[]): void {
    this.connections = [...connections];
  }
  
  /**
   * Handles a connection update from the WebSocket
   * 
   * @param connectionId ID of the connection that was updated
   */
  async handleConnectionUpdate(connectionId: string): Promise<void> {
    // Sync the connection with the server
    const result = await this.connectionService.syncConnectionWithServer(connectionId);
    
    if (result.isSuccess()) {
      // Find and update the connection in the local array
      const index = this.connections.findIndex(conn => conn.id === connectionId);
      if (index >= 0) {
        // Create a new array to trigger a re-render
        this.connections = [
          ...this.connections.slice(0, index),
          result.getValue(),
          ...this.connections.slice(index + 1)
        ];
        
        // Dispatch an event to notify parent components
        this.dispatchConnectionUpdatedEvent(connectionId, result.getValue());
      }
    }
  }
  
  /**
   * Syncs all connections with the server
   */
  async syncAllConnections(): Promise<void> {
    // Prevent multiple syncs at once
    if (this.syncInProgress) {
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      // Sync each connection one by one
      for (const connection of this.connections) {
        const result = await this.connectionService.syncConnectionWithServer(connection.id);
        
        if (result.isSuccess()) {
          // Update the connection in the local array
          const index = this.connections.findIndex(conn => conn.id === connection.id);
          if (index >= 0) {
            // Update the connection at this index
            this.connections[index] = result.getValue();
            
            // Dispatch an event to notify parent components
            this.dispatchConnectionUpdatedEvent(connection.id, result.getValue());
          }
        }
      }
      
      // Create a new array to trigger a re-render
      this.connections = [...this.connections];
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Dispatches a connection updated event
   * 
   * @param connectionId ID of the updated connection
   * @param connection Updated connection data
   */
  private dispatchConnectionUpdatedEvent(connectionId: string, connection: ConnectionData): void {
    const event = new CustomEvent<ConnectionUpdatedDetail>('connection-updated', {
      detail: {
        connectionId,
        connection
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
  }
  
  /**
   * Formats a date for display
   * 
   * @param date Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  }
  
  /**
   * Gets status display text based on connection status
   * 
   * @param status Connection status
   * @returns Display text for the status
   */
  private getStatusText(status: ConnectionStatus): string {
    switch (status) {
      case ConnectionStatus.PENDING:
        return 'Status: Pending';
      case ConnectionStatus.ACTIVE:
        return 'Status: Active';
      case ConnectionStatus.EXPIRED:
        return 'Status: Expired';
      default:
        return `Status: ${status}`;
    }
  }
  
  /**
   * Gets CSS class for connection status
   * 
   * @param status Connection status
   * @returns CSS class for the status
   */
  private getStatusClass(status: ConnectionStatus): string {
    switch (status) {
      case ConnectionStatus.PENDING:
        return 'pending';
      case ConnectionStatus.ACTIVE:
        return 'active';
      case ConnectionStatus.EXPIRED:
        return 'expired';
      default:
        return '';
    }
  }
  
  /**
   * Renders the connection updates manager
   */
  render(): TemplateResult {
    return html`
      <div class="connections-container">
        <div class="title">Connection Updates</div>
        
        ${this.connections.length === 0 
          ? html`<div class="no-connections">No connections available</div>` 
          : html`
            <div class="connection-list">
              ${this.connections.map(connection => html`
                <div class="connection-item" data-id="${connection.id}">
                  <div class="connection-status-dot ${this.getStatusClass(connection.status)}"></div>
                  <div class="connection-details">
                    <div class="connection-name">${connection.name}</div>
                    <div class="connection-status ${this.getStatusClass(connection.status)}">
                      ${this.getStatusText(connection.status)}
                    </div>
                    <div class="connection-timestamp">
                      Created: ${this.formatDate(connection.createdAt)}
                      ${connection.lastUpdated 
                        ? html`, Updated: ${this.formatDate(connection.lastUpdated)}` 
                        : ''}
                    </div>
                  </div>
                  <button 
                    class="sync-button" 
                    @click=${() => this.handleConnectionUpdate(connection.id)}
                    ?disabled=${this.syncInProgress}
                  >
                    <svg 
                      class="sync-icon ${this.syncInProgress ? 'spinning' : ''}" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        stroke-linecap="round" 
                        stroke-linejoin="round" 
                        stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sync
                  </button>
                </div>
              `)}
            </div>
            
            <button 
              class="sync-button" 
              style="margin-top: 1rem;"
              @click=${this.syncAllConnections}
              ?disabled=${this.syncInProgress}
            >
              <svg 
                class="sync-icon ${this.syncInProgress ? 'spinning' : ''}" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync All Connections
            </button>
          `}
      </div>
    `;
  }
}