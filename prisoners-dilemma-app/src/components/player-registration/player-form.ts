import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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

  // IMPORTANT: Shadow DOM setting for Lit components
  // Completely disable Shadow DOM to ensure events propagate correctly
  override createRenderRoot() {
    console.log('PlayerForm: Disabling Shadow DOM to ensure event propagation');
    return this;  // Disables Shadow DOM to ensure events propagate correctly
  }

  constructor() {
    super();
    console.log('PlayerForm component created');
    console.log('Component shadowRoot:', this.shadowRoot);
    
    // Test dispatching an event directly
    setTimeout(() => {
      console.log('Testing event dispatching from PlayerForm');
      const testEvent = new CustomEvent('test-event', {
        detail: { test: 'data' },
        bubbles: true,
        composed: true
      });
      console.log('Dispatching test event');
      this.dispatchEvent(testEvent);
    }, 1000);
  }

  render() {
    return html`
      <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-2">
          Welcome to Prisoner's Dilemma
        </h2>
        
        <p class="instructions text-gray-600 mb-6 text-center">
          Just enter your name to get started!
        </p>

        <form @submit=${this._handleSubmit} class="space-y-6">
          <div>
            <div class="relative">
              <input
                type="text"
                id="playerNameInput"
                .value=${this.playerName}
                @input=${this._handleInput}
                @keydown=${this._handleKeyDown}
                placeholder="Enter your name"
                class="w-full px-4 py-3 border-2 ${this._getInputClasses()} 
                       rounded-lg shadow-sm focus:outline-none focus:border-blue-500
                       text-lg transition-colors duration-200"
                aria-required="true"
              />
              ${this._renderErrorMessage()}
            </div>
          </div>

          <button
            type="submit"
            id="registerButton"
            class="w-full py-3 px-4 border-0 rounded-lg shadow-md text-lg font-medium 
                   text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                   focus:ring-blue-500 transition-colors duration-200"
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
    return this.hasError ? 'border-red-500' : 'border-blue-300';
  }
  
  /**
   * Renders error message when validation fails
   */
  private _renderErrorMessage() {
    return this.hasError ? html`
      <p class="mt-2 text-sm text-red-600 font-medium">
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
   * Uses multiple dispatching methods to ensure the event is captured
   */
  private _handleSubmit(e: Event) {
    e.preventDefault();
    console.log('Form submitted, playerName =', this.playerName);
    
    if (!this.playerName.trim()) {
      this.hasError = true;
      return;
    }

    console.log('Dispatching register event with data:', { name: this.playerName });
    
    // Create the event with proper bubbling and composition
    const registerEvent = new CustomEvent('register', {
      detail: { name: this.playerName },
      bubbles: true,
      composed: true
    });
    
    // Multiple dispatch methods to ensure event is captured
    
    // 1. Standard component event dispatch
    console.log('Dispatching register event from component');
    this.dispatchEvent(registerEvent);
    
    // 2. Dispatch directly from form element for better propagation
    const form = this.querySelector('form');
    if (form) {
      console.log('Dispatching register event from form element');
      form.dispatchEvent(new CustomEvent('register', {
        detail: { name: this.playerName },
        bubbles: true,
        composed: true
      }));
    }
    
    // 3. Dispatch at document level
    console.log('Dispatching register event at document level');
    document.dispatchEvent(new CustomEvent('register', {
      detail: { name: this.playerName },
      bubbles: true,
      composed: true
    }));
    
    // 4. Fallback - dispatch event at window level
    console.log('Dispatching fallback event at window level');
    window.dispatchEvent(new CustomEvent('register-fallback', {
      detail: { name: this.playerName }
    }));
    
    // 5. Create and dispatch a native DOM event as another fallback
    console.log('Creating and dispatching native DOM event');
    try {
      const nativeEvent = document.createEvent('Event');
      nativeEvent.initEvent('register-native', true, true);
      (nativeEvent as any).detail = { name: this.playerName };
      this.dispatchEvent(nativeEvent);
      document.dispatchEvent(nativeEvent);
    } catch (error) {
      console.error('Error dispatching native event:', error);
    }
    
    console.log('All register events dispatched');
  }
}