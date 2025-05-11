// dark-mode-toggle.test.ts
import { html, fixture, expect } from '@open-wc/testing';
import { DarkModeToggle } from '../../src/components/dark-mode-toggle';
import { DarkModeService, Theme, ThemeError, ThemeErrorType } from '../../src/services/dark-mode.service';
import { Result } from '../../src/services/connection-result';

// Mock the DarkModeService
class MockDarkModeService extends DarkModeService {
  private mockTheme: Theme = Theme.LIGHT;
  private mockError: ThemeError | null = null;
  
  setMockTheme(theme: Theme): void {
    this.mockTheme = theme;
  }
  
  setMockError(error: ThemeError | null): void {
    this.mockError = error;
  }
  
  initializeDarkMode(): Result<Theme, ThemeError> {
    if (this.mockError) {
      return Result.failure(this.mockError);
    }
    return Result.success(this.mockTheme);
  }
  
  toggleTheme(): Result<Theme, ThemeError> {
    if (this.mockError) {
      return Result.failure(this.mockError);
    }
    // Toggle the theme
    this.mockTheme = this.mockTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    return Result.success(this.mockTheme);
  }
  
  listenForSystemThemeChanges(): () => void {
    return () => {};
  }
}

// Check if the custom element is already defined
const customElementName = 'test-dark-mode-toggle';
if (!customElements.get(customElementName)) {
  customElements.define(customElementName, class extends DarkModeToggle {});
}

describe('DarkModeToggle', () => {
  let mockService: MockDarkModeService;
  let el: DarkModeToggle;
  
  beforeEach(async () => {
    mockService = new MockDarkModeService();
    
    // Create element using the registered custom element
    el = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
    
    // Set the mock service before connectedCallback
    el.darkModeService = mockService;
    
    // Manually trigger connectedCallback to initialize with our mock
    el.connectedCallback();
    
    // Trigger update
    await el.updateComplete;
  });
  
  afterEach(() => {
    // Reset mock service state
    mockService.setMockTheme(Theme.LIGHT);
    mockService.setMockError(null);
  });
  
  describe('initialization', () => {
    it('should initialize with light theme', async () => {
      expect(el.shadowRoot).to.exist;
      const button = el.shadowRoot!.querySelector('button');
      expect(button).to.exist;
      expect(button?.classList.contains('bg-gray-300')).to.be.true;
      
      // Check sun icon is visible
      const sunIcon = el.shadowRoot!.querySelector('svg path[d*="M10 2a1 1 0 011"]');
      expect(sunIcon).to.exist;
    });
    
    it('should initialize with dark theme', async () => {
      // Arrange
      mockService.setMockTheme(Theme.DARK);
      
      // Act - create a new element with dark theme
      const darkEl = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
      darkEl.darkModeService = mockService;
      darkEl.connectedCallback();
      await darkEl.updateComplete;
      
      // Assert
      const button = darkEl.shadowRoot!.querySelector('button');
      expect(button).to.exist;
      expect(button?.classList.contains('bg-blue-600')).to.be.true;
      
      // Check moon icon is visible
      const moonIcon = darkEl.shadowRoot!.querySelector('svg path[d*="M17.293"]');
      expect(moonIcon).to.exist;
    });
    
    it('should handle initialization errors', async () => {
      // Arrange
      mockService.setMockError(
        new ThemeError(ThemeErrorType.STORAGE_ERROR, 'Init error')
      );
      
      // Act
      const errorEl = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
      errorEl.darkModeService = mockService;
      errorEl.connectedCallback();
      await errorEl.updateComplete;
      
      // Assert
      const button = errorEl.shadowRoot!.querySelector('button');
      expect(button).to.exist;
      expect(button?.disabled).to.be.true;
    });
  });
  
  describe('toggle functionality', () => {
    it('should toggle from light to dark', async () => {
      // Setup
      const button = el.shadowRoot!.querySelector('button')!;
      let themeChangedEvent: CustomEvent | null = null;
      el.addEventListener('theme-changed', (e: Event) => {
        themeChangedEvent = e as CustomEvent;
      });
      
      // Act
      button.click();
      await el.updateComplete;
      
      // Assert
      expect(button.classList.contains('bg-blue-600')).to.be.true;
      const moonIcon = el.shadowRoot!.querySelector('svg path[d*="M17.293"]');
      expect(moonIcon).to.exist;
      expect(themeChangedEvent).to.exist;
      expect(themeChangedEvent?.detail.theme).to.equal(Theme.DARK);
    });
    
    it('should toggle from dark to light', async () => {
      // Setup
      mockService.setMockTheme(Theme.DARK);
      const darkEl = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
      darkEl.darkModeService = mockService;
      darkEl.connectedCallback();
      await darkEl.updateComplete;
      
      const button = darkEl.shadowRoot!.querySelector('button')!;
      
      // Act
      button.click();
      await darkEl.updateComplete;
      
      // Assert
      expect(button.classList.contains('bg-gray-300')).to.be.true;
      const sunIcon = darkEl.shadowRoot!.querySelector('svg path[d*="M10 2a1 1 0 011"]');
      expect(sunIcon).to.exist;
    });
    
    it('should handle toggle errors', async () => {
      // Setup
      const button = el.shadowRoot!.querySelector('button')!;
      mockService.setMockError(
        new ThemeError(ThemeErrorType.STORAGE_ERROR, 'Toggle error')
      );
      
      // Act
      button.click();
      await el.updateComplete;
      
      // Assert
      expect(button.disabled).to.be.true;
    });
    
    it('should not toggle when disabled', async () => {
      // Setup
      mockService.setMockError(
        new ThemeError(ThemeErrorType.STORAGE_ERROR, 'Error')
      );
      const errorEl = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
      errorEl.darkModeService = mockService;
      errorEl.connectedCallback();
      await errorEl.updateComplete;
      
      const button = errorEl.shadowRoot!.querySelector('button')!;
      let themeChangedEvent: CustomEvent | null = null;
      errorEl.addEventListener('theme-changed', (e: Event) => {
        themeChangedEvent = e as CustomEvent;
      });
      
      // Act
      button.click();
      await errorEl.updateComplete;
      
      // Assert
      expect(themeChangedEvent).to.be.null;
    });
  });
  
  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      const button = el.shadowRoot!.querySelector('button');
      expect(button?.getAttribute('aria-label')).to.equal('Toggle dark mode');
    });
    
    it('should have proper title for light mode', () => {
      const button = el.shadowRoot!.querySelector('button');
      expect(button?.getAttribute('title')).to.equal('Switch to dark mode');
    });
    
    it('should have proper title for dark mode', async () => {
      // Setup
      mockService.setMockTheme(Theme.DARK);
      const darkEl = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
      darkEl.darkModeService = mockService;
      darkEl.connectedCallback();
      await darkEl.updateComplete;
      
      // Assert
      const button = darkEl.shadowRoot!.querySelector('button');
      expect(button?.getAttribute('title')).to.equal('Switch to light mode');
    });
  });
  
  describe('cleanup', () => {
    it('should clean up system theme listener on disconnect', async () => {
      // Arrange
      let cleanupCalled = false;
      const mockServiceWithCleanup = new MockDarkModeService();
      mockServiceWithCleanup.listenForSystemThemeChanges = () => {
        return () => { cleanupCalled = true; };
      };
      
      // Create new element with mock
      const cleanupEl = await fixture<DarkModeToggle>(html`<test-dark-mode-toggle></test-dark-mode-toggle>`);
      cleanupEl.darkModeService = mockServiceWithCleanup;
      cleanupEl.connectedCallback();
      await cleanupEl.updateComplete;
      
      // Act
      cleanupEl.disconnectedCallback();
      
      // Assert
      expect(cleanupCalled).to.be.true;
    });
  });
});