import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
// Update this path to match your project structure
import tailwindStyles from '../../tailwind-output.css?inline';
import { ConnectionService } from '../../services/connection.service';

/**
 * Connection form component
 * Allows generating a shareable connection link for inviting friends
 */
@customElement('connection-form')
export class ConnectionFormComponent extends LitElement {
  @property({ type: String }) friendName = '';
  @state() private hasError = false;
  @state() private errorMessage: string | null = null;
  @state() private connectionLink: string | null = null;
  @state() private showCopyConfirmation = false;
  
  // This will be injected in tests but created normally in connectedCallback
  public connectionService: ConnectionService = new ConnectionService();
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  connectedCallback() {
    super.connectedCallback();
    this.connectionService = new ConnectionService();
  }
  
  render() {
    return html`
      <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-2">
          Connect with a Friend
        </h2>
        
        <p class="instructions text-gray-600 mb-6 text-center">
          Enter a name for your friend to generate a connection link you can share.
        </p>
        
        ${this._renderErrorMessage()}
        
        ${this.connectionLink 
          ? this._renderLinkContainer() 
          : this._renderForm()}
      </div>
    `;
  }
  
  /**
   * Renders the connection generation form
   */
  private _renderForm() {
    return html`
      <form @submit=${this._handleSubmit} class="space-y-6">
        <div>
          <div class="relative">
            <input
              type="text"
              .value=${this.friendName}
              @input=${this._handleInput}
              @keydown=${this._handleKeyDown}
              placeholder="Enter your friend's name"
              class="w-full px-4 py-3 border-2 ${this._getInputClasses()} 
                     rounded-lg shadow-sm focus:outline-none focus:border-blue-500
                     text-lg transition-colors duration-200"
              aria-required="true"
            />
          </div>
        </div>

        <button
          type="submit"
          class="w-full py-3 px-4 border-0 rounded-lg shadow-md text-lg font-medium 
                 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                 focus:ring-blue-500 transition-colors duration-200"
        >
          Generate Connection Link
        </button>
      </form>
    `;
  }
  
  /**
   * Renders the container with the generated connection link
   */
  private _renderLinkContainer() {
    return html`
      <div class="link-container bg-gray-100 p-4 rounded-lg mb-6">
        <h3 class="font-medium text-gray-800 mb-2">Your Connection Link:</h3>
        <div class="connection-link bg-white p-3 border rounded mb-4 break-all overflow-x-auto text-blue-600">
          ${this.connectionLink}
        </div>
        
        <div class="flex space-x-3">
          <button
            @click=${this._handleCopyLink}
            class="copy-button flex-1 py-2 px-4 border-0 rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          >
            ${this.showCopyConfirmation ? html`
              <span class="copy-confirmation flex items-center justify-center">
                <svg class="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </span>
            ` : 'Copy Link'}
          </button>
          
          <button
            @click=${this._handleGenerateNewLink}
            class="new-link-button flex-1 py-2 px-4 border-0 rounded shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
          >
            New Link
          </button>
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
          @click=${this._dismissError}
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
   * Returns CSS classes for the input field based on validation state
   */
  private _getInputClasses(): string {
    return this.hasError ? 'border-red-500' : 'border-blue-300';
  }
  
  /**
   * Handles keydown events, specifically for Enter key submission
   */
  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission
      this._handleSubmit(e);
    }
  }
  
  /**
   * Updates friendName property when input changes
   * Clears error state if input is not empty
   */
  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.friendName = input.value;
    if (this.friendName) {
      this.hasError = false;
      this.errorMessage = null;
    }
  }
  
  /**
   * Handles form submission
   * Validates input and generates connection link if valid
   */
  private _handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!this.friendName.trim()) {
      this.hasError = true;
      this.errorMessage = 'Friend name cannot be empty';
      return;
    }
    
    // Generate connection link
    const result = this.connectionService.generateConnectionLink(this.friendName);
    
    if (result.isSuccess()) {
      this.connectionLink = result.getValue();
      this.errorMessage = null;
      this.hasError = false;
      
      // Dispatch event to notify parent components
      this.dispatchEvent(new CustomEvent('connection-created', {
        detail: { 
          connectionLink: this.connectionLink,
          friendName: this.friendName
        },
        bubbles: true,
        composed: true
      }));
    } else {
      this.errorMessage = result.getError().message;
      this.hasError = true;
    }
  }
  
  /**
   * Copies the connection link to clipboard
   */
  private _handleCopyLink() {
    if (this.connectionLink) {
      navigator.clipboard.writeText(this.connectionLink)
        .then(() => {
          this.showCopyConfirmation = true;
          // Reset the confirmation after 2 seconds
          setTimeout(() => {
            this.showCopyConfirmation = false;
          }, 2000);
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
          this.errorMessage = 'Failed to copy link to clipboard. Please select and copy manually.';
        });
    }
  }
  
  /**
   * Resets the form to generate a new link
   */
  private _handleGenerateNewLink() {
    this.connectionLink = null;
    this.friendName = '';
    this.hasError = false;
    this.errorMessage = null;
    this.showCopyConfirmation = false;
  }
  
  /**
   * Dismisses the current error message
   */
  private _dismissError() {
    this.errorMessage = null;
    this.hasError = false;
  }
}