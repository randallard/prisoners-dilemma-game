// dark-mode-toggle.ts
import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import tailwindStyles from '../tailwind-output.css?inline';
import { DarkModeService, Theme } from '../services/dark-mode.service';

/**
 * Dark mode toggle component
 * Allows users to switch between light and dark themes
 */
@customElement('dark-mode-toggle')
export class DarkModeToggle extends LitElement {
  @state() private currentTheme: Theme = Theme.LIGHT;
  @state() private hasError: boolean = false;
  
  // This will be injected in tests but created normally in connectedCallback
  public darkModeService?: DarkModeService;
  
  // Store cleanup function for system theme listener
  private systemThemeListenerCleanup?: () => void;
  
  // Use unsafeCSS to include the Tailwind styles
  static styles = css`${unsafeCSS(tailwindStyles)}`;
  
  connectedCallback() {
    super.connectedCallback();
    
    // Only create service if not already provided (in tests)
    if (!this.darkModeService) {
      this.darkModeService = new DarkModeService();
    }
    
    // Initialize dark mode
    const initResult = this.darkModeService.initializeDarkMode();
    
    if (initResult.isSuccess()) {
      this.currentTheme = initResult.getValue();
      this.hasError = false;
    } else {
      console.error('Failed to initialize dark mode:', initResult.getError().message);
      this.hasError = true;
    }
    
    // Listen for system theme changes
    this.systemThemeListenerCleanup = this.darkModeService.listenForSystemThemeChanges();
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up system theme listener
    if (this.systemThemeListenerCleanup) {
      this.systemThemeListenerCleanup();
    }
  }
  
  render() {
    return html`
      <button
        @click=${this._handleToggle}
        class="dark-mode-toggle relative inline-flex h-6 w-11 items-center rounded-full transition-colors
               ${this.currentTheme === Theme.DARK 
                 ? 'bg-blue-600 hover:bg-blue-700' 
                 : 'bg-gray-300 hover:bg-gray-400'}"
        aria-label="Toggle dark mode"
        title="${this.currentTheme === Theme.DARK ? 'Switch to light mode' : 'Switch to dark mode'}"
        ?disabled=${this.hasError}
      >
        <span
          class="theme-indicator ${this.currentTheme === Theme.DARK ? 'translate-x-6' : 'translate-x-1'} 
                 inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
        >
          ${this._renderIcon()}
        </span>
      </button>
    `;
  }
  
  /**
   * Renders the appropriate icon for the current theme
   */
  private _renderIcon() {
    if (this.currentTheme === Theme.DARK) {
      // Moon icon for dark mode
      return html`
        <svg class="h-3 w-3 ml-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
      `;
    } else {
      // Sun icon for light mode
      return html`
        <svg class="h-3 w-3 ml-0.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
        </svg>
      `;
    }
  }
  
  /**
   * Handles clicking the toggle button
   */
  private _handleToggle() {
    if (this.hasError || !this.darkModeService) {
      return;
    }
    
    const toggleResult = this.darkModeService.toggleTheme();
    
    if (toggleResult.isSuccess()) {
      this.currentTheme = toggleResult.getValue();
      this.hasError = false;
      
      // Dispatch an event to notify other components
      this.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme: this.currentTheme },
        bubbles: true,
        composed: true
      }));
    } else {
      console.error('Failed to toggle theme:', toggleResult.getError().message);
      this.hasError = true;
    }
  }
}