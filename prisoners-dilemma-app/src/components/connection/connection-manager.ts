import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
// Update this path to match your project structure
import tailwindStyles from '../../tailwind-output.css?inline';
import { ConnectionService } from '../../services/connection.service';

// Import child components
import './connection-form';
import './connection-list';

/**
 * Connection manager component
 * Orchestrates connection creation and management
 */
@customElement('connection-manager')
export class ConnectionManagerComponent extends LitElement {
  @property({ type: String }) activeTab: 'new-connection' | 'connections-list' = 'new-connection';
  @state() private confirmDeleteDialogOpen = false;
  @state() private connectionToDelete: { id: string, name: string } | null = null;
  @state() private showIncomingConnectionDialog = false;
  @state() private incomingConnectionId: string | null = null;
  @state() private incomingFriendName = '';
  @state() private errorMessage: string | null = null;
  
  // This will be injected in tests but created normally in connectedCallback
  public connectionService: ConnectionService = new ConnectionService();
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  connectedCallback() {
    super.connectedCallback();
    this.connectionService = new ConnectionService();
    
    // Handle any connection parameter in the URL
    this.handleIncomingConnectionFromURL();
    
    // Listen for events from child components
    this.addEventListener('connection-created', this.handleConnectionCreated);
    this.addEventListener('confirm-delete-connection', this.handleConfirmDelete);
    this.addEventListener('refresh-connections', this.handleRefreshConnections);
    this.addEventListener('play-with-connection', this.handlePlayWithConnection);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove event listeners
    this.removeEventListener('connection-created', this.handleConnectionCreated);
    this.removeEventListener('confirm-delete-connection', this.handleConfirmDelete);
    this.removeEventListener('refresh-connections', this.handleRefreshConnections);
    this.removeEventListener('play-with-connection', this.handlePlayWithConnection);
  }
  
  render() {
    return html`
      <div class="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
          Connection Manager
        </h2>
        
        ${this._renderErrorMessage()}
        
        ${this.showIncomingConnectionDialog 
          ? this._renderIncomingConnectionDialog() 
          : this._renderMainContent()}
        
        ${this.confirmDeleteDialogOpen && this.connectionToDelete 
          ? this._renderConfirmDeleteDialog() 
          : ''}
      </div>
    `;
  }
  
  /**
   * Renders the main content with tabs
   */
  private _renderMainContent() {
    return html`
      <div class="tabs mb-6">
        <div class="flex border-b">
          <button 
            class="tab-button py-2 px-4 text-center ${this.activeTab === 'new-connection' ? 'active border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
            @click=${() => this.activeTab = 'new-connection'}
            data-tab="new-connection"
          >
            New Connection
          </button>
          <button 
            class="tab-button py-2 px-4 text-center ${this.activeTab === 'connections-list' ? 'active border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
            @click=${() => this.activeTab = 'connections-list'}
            data-tab="connections-list"
          >
            Your Connections
          </button>
        </div>
      </div>
      
      <div class="tab-content">
        <div class="tab-pane ${this.activeTab === 'new-connection' ? 'block' : 'hidden'}">
          <connection-form></connection-form>
        </div>
        <div class="tab-pane ${this.activeTab === 'connections-list' ? 'block' : 'hidden'}">
          <connection-list></connection-list>
        </div>
      </div>
    `;
  }
  
  /**
   * Renders the incoming connection dialog
   */
  private _renderIncomingConnectionDialog() {
    return html`
      <div class="incoming-connection-dialog bg-blue-50 border border-blue-300 rounded-lg p-6 mb-6">
        <h3 class="text-xl font-bold text-blue-800 mb-4">
          Connection Invitation
        </h3>
        
        <p class="text-blue-700 mb-4">
          Someone has invited you to connect. Enter your name to accept the invitation:
        </p>
        
        <form @submit=${this._handleIncomingConnectionSubmit} class="space-y-4">
          <div>
            <label for="your-name" class="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              id="your-name"
              type="text"
              .value=${this.incomingFriendName}
              @input=${(e: Event) => this.incomingFriendName = (e.target as HTMLInputElement).value}
              placeholder="Enter your name"
              class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div class="flex space-x-3">
            <button
              type="button"
              @click=${this._cancelIncomingConnection}
              class="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Accept Invitation
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Renders the confirmation dialog for deleting a connection
   */
  private _renderConfirmDeleteDialog() {
    return html`
      <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div class="confirmation-dialog bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            Confirm Delete
          </h3>
          
          <p class="text-gray-600 mb-6">
            Are you sure you want to delete the connection with <span class="font-semibold">${this.connectionToDelete?.name}</span>? This action cannot be undone.
          </p>
          
          <div class="flex justify-end space-x-3">
            <button
              @click=${this._handleCancelDelete}
              class="cancel-button py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              @click=${this._handleConfirmDeleteAction}
              class="confirm-button py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Renders error message if one exists
   */
  private _renderErrorMessage() {
    return this.errorMessage ? html`
      <div class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline">${this.errorMessage}</span>
        <button 
          @click=${() => this.errorMessage = null}
          class="dismiss-error-button absolute top-0 bottom-0 right-0 px-4 py-3"
        >
          <span class="sr-only">Dismiss</span>
          <svg class="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ` : '';
  }
  
  /**
   * Checks the URL for an incoming connection parameter
   * and handles it appropriately
   */
  public handleIncomingConnectionFromURL() {
    // Check for connection parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const connectionId = urlParams.get('connection');
    
    if (connectionId) {
      // Show the incoming connection dialog
      this.incomingConnectionId = connectionId;
      this.showIncomingConnectionDialog = true;
    }
  }
  
  /**
   * Handles the connection-created event from the connection form
   * @param e The event
   */
  private handleConnectionCreated = (e: CustomEvent) => {
    // Switch to the connections list tab
    this.activeTab = 'connections-list';
    
    // Refresh the connections list
    this.refreshConnectionsList();
  };
  
  /**
   * Handles the confirm-delete-connection event from the connection list
   * @param e The event
   */
  private handleConfirmDelete = (e: CustomEvent) => {
    const { connectionId, connectionName } = e.detail;
    
    // Show the confirmation dialog
    this.connectionToDelete = { id: connectionId, name: connectionName };
    this.confirmDeleteDialogOpen = true;
  };
  
  /**
   * Handles the refresh-connections event from the connection list
   */
  private handleRefreshConnections = () => {
    this.refreshConnectionsList();
  };
  
  /**
   * Handles the play-with-connection event from the connection list
   * @param e The event
   */
  private handlePlayWithConnection = (e: CustomEvent) => {
    const { connectionId, connectionName } = e.detail;
    
    // Dispatch an event to start a game with this connection
    this.dispatchEvent(new CustomEvent('game-requested', {
      detail: { connectionId, connectionName },
      bubbles: true,
      composed: true
    }));
  };
  
  /**
   * Refreshes the connections list component
   */
  private refreshConnectionsList() {
    // Get the connection list component and refresh it
    const connectionList = this.shadowRoot?.querySelector('connection-list');
    if (connectionList) {
      // @ts-ignore - Accessing public method of the component
      connectionList.refreshConnections();
    }
  }
  
  /**
   * Handles submitting the incoming connection form
   * @param e The submit event
   */
  private _handleIncomingConnectionSubmit(e: Event) {
    e.preventDefault();
    
    if (!this.incomingConnectionId || !this.incomingFriendName.trim()) {
      this.errorMessage = 'Please enter your name to accept the connection.';
      return;
    }
    
    // Register the incoming connection
    const result = this.connectionService.registerIncomingConnection(
      this.incomingConnectionId,
      this.incomingFriendName.trim()
    );
    
    if (result.isSuccess()) {
      // Hide the dialog
      this.showIncomingConnectionDialog = false;
      this.incomingConnectionId = null;
      this.incomingFriendName = '';
      
      // Switch to connections list tab
      this.activeTab = 'connections-list';
      
      // Refresh the connections list
      this.refreshConnectionsList();
    } else {
      this.errorMessage = result.getError().message;
    }
  }
  
  /**
   * Cancels the incoming connection dialog
   */
  private _cancelIncomingConnection() {
    this.showIncomingConnectionDialog = false;
    this.incomingConnectionId = null;
    this.incomingFriendName = '';
  }
  
  /**
   * Handles canceling the delete confirmation
   */
  private _handleCancelDelete() {
    this.confirmDeleteDialogOpen = false;
    this.connectionToDelete = null;
  }
  
  /**
   * Handles confirming the delete action
   */
  private _handleConfirmDeleteAction() {
    if (!this.connectionToDelete) {
      return;
    }
    
    // Get the connection list component
    const connectionList = this.shadowRoot?.querySelector('connection-list');
    if (connectionList) {
      // Call the confirmDelete method on the connection list
      // @ts-ignore - Accessing public method of the component
      connectionList.confirmDelete(this.connectionToDelete.id);
    }
    
    // Close the dialog
    this.confirmDeleteDialogOpen = false;
    this.connectionToDelete = null;
  }