import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
// Update this path to match your project structure
import tailwindStyles from '../../tailwind-output.css?inline';

/**
 * Player registration form component
 * Allows new players to register with a name
 */
@customElement('player-form')
export class PlayerForm extends LitElement {
  @property({ type: String }) playerName = '';
  @property({ type: Boolean }) hasError = false;

  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;

  render() {
    return html`
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
          Welcome to Prisoner's Dilemma
        </h2>
        
        <p class="instructions text-gray-600 dark:text-gray-300 mb-6 text-center">
          Just enter your name to get started!
        </p>

        <form @submit=${this._handleSubmit} class="space-y-6">
          <div>
            <div class="relative">
              <input
                type="text"
                .value=${this.playerName}
                @input=${this._handleInput}
                @keydown=${this._handleKeyDown}
                placeholder="Enter your name"
                class="w-full px-4 py-3 border-2 ${this._getInputClasses()} 
                       rounded-lg shadow-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400
                       text-lg transition-colors duration-200
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500"
                aria-required="true"
              />
              ${this._renderErrorMessage()}
            </div>
          </div>

          <button
            type="submit"
            class="w-full py-3 px-4 border-0 rounded-lg shadow-md text-lg font-medium 
                   text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                   transition-colors duration-200"
          >
            Register
          </button>
        </form>
      </div>
    `;
  }
  
  /**
   * Returns CSS classes for the input field based on validation state
   */
  private _getInputClasses(): string {
    return this.hasError ? 'border-red-500 dark:border-red-400' : 'border-blue-300 dark:border-gray-600';
  }
  
  /**
   * Renders error message when validation fails
   */
  private _renderErrorMessage() {
    return this.hasError ? html`
      <p class="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
        Please enter your name to continue
      </p>
    ` : '';
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
   * Updates playerName property when input changes
   * Clears error state if input is not empty
   */
  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.playerName = input.value;
    if (this.playerName) {
      this.hasError = false;
    }
  }

  /**
   * Handles form submission
   * Validates input and dispatches register event if valid
   */
  private _handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!this.playerName.trim()) {
      this.hasError = true;
      return;
    }

    this.dispatchEvent(new CustomEvent('register', {
      detail: { name: this.playerName },
      bubbles: true,
      composed: true
    }));
  }
}