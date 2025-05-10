import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
// Update this path to match your project structure
import tailwindStyles from '../../tailwind-output.css?inline';
import { ConnectionService, ConnectionStatus, ConnectionData } from '../../services/connection.service';

/**
 * Connection list component
 * Displays a list of the user's connections with filtering and management options
 */
@customElement('connection-list')
export class ConnectionListComponent extends LitElement {
  @property({ type: String }) currentFilter: ConnectionStatus | 'all' = 'all';
  @state() private connections: ConnectionData[] = [];
  @state() private loading: boolean = true;
  @state() private errorMessage: string | null = null;
  
  // This will be injected in tests but created normally in connectedCallback
  public connectionService: ConnectionService = new ConnectionService();
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  connectedCallback() {
    super.connectedCallback();
    this.refreshConnections();
  }
  
  /**
   * Refreshes the connections list from the service
   */
  public refreshConnections() {
    this.loading = true;
    this.errorMessage = null;

    let connectionsResult;
    if (this.currentFilter === 'all') {
      connectionsResult = this.connectionService.getConnections();
    } else {
      connectionsResult = this.connectionService.getConnectionsByStatus(this.currentFilter as ConnectionStatus);
    }
    
    if (connectionsResult.isSuccess()) {
      this.connections = connectionsResult.getValue();
    } else {
      this.showError(connectionsResult.getError().message);
    }
    
    this.loading = false;
  }
  
  /**
   * Displays an error message
   * @param message The error message to display
   */
  public showError(message: string) {
    this.errorMessage = message;
  }
  
  /**
   * Confirms the deletion of a connection
   * @param connectionId The ID of the connection to delete
   */
  public confirmDelete(connectionId: string) {
    const deleteResult = this.connectionService.deleteConnection(connectionId);
    
    if (deleteResult.isSuccess()) {
      // Refresh connections after successful deletion
      this.refreshConnections();
      
      // Dispatch an event to notify parent components that connections were refreshed
      this.dispatchEvent(new CustomEvent('refresh-connections', {
        bubbles: true,
        composed: true
      }));
    } else {
      this.showError(deleteResult.getError().message);
    }
  }
  
  /**
   * Handles status filter change
   * @param e The change event
   */
  private _handleFilterChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.currentFilter = select.value as ConnectionStatus | 'all';
    this.refreshConnections();
  }
  
  /**
   * Handles clicking the accept button for a connection
   * @param connectionId The ID of the connection to accept
   */
  private _handleAccept(connectionId: string) {
    const acceptResult = this.connectionService.acceptConnection(connectionId);
    
    if (acceptResult.isSuccess()) {
      // Refresh connections after successful acceptance
      this.refreshConnections();
      
      // Dispatch an event to notify parent components that connections were refreshed
      this.dispatchEvent(new CustomEvent('refresh-connections', {
        bubbles: true,
        composed: true
      }));
    } else {
      this.showError(acceptResult.getError().message);
    }
  }
  
  /**
   * Handles clicking the delete button for a connection
   * @param connectionId The ID of the connection to delete
   * @param connectionName The name of the connection for display in confirmation
   */
  private _handleDelete(connectionId: string, connectionName: string) {
    // Dispatch an event to show confirmation dialog
    this.dispatchEvent(new CustomEvent('confirm-delete-connection', {
      detail: { connectionId, connectionName },
      bubbles: true,
      composed: true
    }));
  }
  
  /**
   * Handles clicking the play button for a connection
   * @param connectionId The ID of the connection to play with
   * @param connectionName The name of the connection for display
   */
  private _handlePlay(connectionId: string, connectionName: string) {
    // Dispatch an event to start a game with this connection
    this.dispatchEvent(new CustomEvent('play-with-connection', {
      detail: { connectionId, connectionName },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Dismisses the current error message
   */
  private _dismissError() {
    this.errorMessage = null;
  }
  
  render() {
    return html`
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-4">
          Your Connections
        </h2>
        
        ${this._renderErrorMessage()}
        
        <div class="mb-4">
          <label for="status-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by Status
          </label>
          <select
            id="status-filter"
            class="status-filter w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            @change=${this._handleFilterChange}
          >
            <option value="all" ?selected=${this.currentFilter === 'all'}>All Connections</option>
            <option value="${ConnectionStatus.PENDING}" ?selected=${this.currentFilter === ConnectionStatus.PENDING}>Pending</option>
            <option value="${ConnectionStatus.ACTIVE}" ?selected=${this.currentFilter === ConnectionStatus.ACTIVE}>Active</option>
          </select>
        </div>
        
        ${this._renderConnectionsList()}
      </div>
    `;
  }
  
  /**
   * Renders the error message if one exists
   */
  private _renderErrorMessage() {
    return this.errorMessage ? html`
      <div class="error-message bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4" role="alert">
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline">${this.errorMessage}</span>
        <button 
          @click=${this._dismissError}
          class="dismiss-error-button absolute top-0 bottom-0 right-0 px-4 py-3"
        >
          <span class="sr-only">Dismiss</span>
          <svg class="h-6 w-6 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ` : '';
  }
  
  /**
   * Renders the connections list, loading indicator, or empty state
   */
  private _renderConnectionsList() {
    if (this.loading) {
      return html`
        <div class="loading-indicator flex items-center justify-center py-8">
          <svg class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-3 text-lg text-gray-600 dark:text-gray-300">Loading connections...</span>
        </div>
      `;
    }
    
    if (this.connections.length === 0) {
      return html`
        <div class="empty-state py-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 text-lg mb-4">No connections found.</p>
          <p class="text-gray-500 dark:text-gray-400">
            ${this.currentFilter !== 'all' 
            ? html`<button @click=${() => this.currentFilter = 'all'} class="text-blue-600 dark:text-blue-400 hover:underline">View all connections</button>` 
            : html`Generate a connection link to invite a friend.`}
          </p>
        </div>
      `;
    }
    
    return html`
      <ul class="connections-list space-y-4">
        ${this.connections.map(connection => this._renderConnectionItem(connection))}
      </ul>
    `;
  }
  
  /**
   * Formats a timestamp into a human-readable date
   * @param timestamp The timestamp to format
   */
  private _formatDateFromTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    
    // If date is today, just show time
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If date is yesterday, show "Yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  /**
   * Renders a single connection item
   * @param connection The connection data to render
   */
  private _renderConnectionItem(connection: ConnectionData) {
    return html`
      <li class="connection-item border dark:border-gray-700 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-700">
        <div class="flex items-center justify-between mb-2">
          <span class="connection-name font-semibold text-lg text-gray-900 dark:text-gray-100">${connection.name}</span>
          <span 
            class="status-indicator ${connection.status === ConnectionStatus.ACTIVE ? 'active bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'pending bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'} px-2 py-1 rounded-full text-xs font-semibold"
          >
            ${connection.status === ConnectionStatus.ACTIVE ? 'Active' : 'Pending'}
          </span>
        </div>
        
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          ${connection.initiatedByMe 
            ? 'You invited this person' 
            : 'This person invited you'}
          <span class="mx-1">•</span>
          ${this._formatDateFromTimestamp(connection.createdAt)}
        </div>
        
        <div class="connection-actions flex justify-end space-x-2">
          ${this._renderConnectionActions(connection)}
        </div>
      </li>
    `;
  }
  
  /**
   * Renders the appropriate action buttons for a connection based on its status
   * @param connection The connection data
   */
  private _renderConnectionActions(connection: ConnectionData) {
    // Pending connection initiated by me - show delete option
    if (connection.status === ConnectionStatus.PENDING && connection.initiatedByMe) {
      return html`
        <button
          @click=${() => this._handleDelete(connection.id, connection.name)}
          class="delete-button px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
        >
          Cancel Invitation
        </button>
      `;
    }
    
    // Pending connection initiated by them - show accept option
    if (connection.status === ConnectionStatus.PENDING && !connection.initiatedByMe) {
      return html`
        <button
          @click=${() => this._handleDelete(connection.id, connection.name)}
          class="delete-button px-3 py-1 bg-gray-600 dark:bg-gray-600 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors duration-200 mr-2"
        >
          Decline
        </button>
        <button
          @click=${() => this._handleAccept(connection.id)}
          class="accept-button px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
        >
          Accept
        </button>
      `;
    }
    
    // Active connection - show play option
    if (connection.status === ConnectionStatus.ACTIVE) {
      return html`
        <button
          @click=${() => this._handleDelete(connection.id, connection.name)}
          class="delete-button px-3 py-1 bg-gray-600 dark:bg-gray-600 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors duration-200 mr-2"
        >
          Remove
        </button>
        <button
          @click=${() => this._handlePlay(connection.id, connection.name)}
          class="play-button px-3 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200"
        >
          Play
        </button>
      `;
    }
    
    // Default - just show delete option
    return html`
      <button
        @click=${() => this._handleDelete(connection.id, connection.name)}
        class="delete-button px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
      >
        Delete
      </button>
    `;
  }
}