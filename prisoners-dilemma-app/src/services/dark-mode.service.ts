// dark-mode.service.ts
import { Result } from './connection-result';

/**
 * Error types for theme operations
 */
export enum ThemeErrorType {
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_THEME = 'INVALID_THEME',
}

/**
 * Custom error class for theme operations
 */
export class ThemeError extends Error {
  constructor(public readonly type: ThemeErrorType, message: string) {
    super(message);
    this.name = 'ThemeError';
  }
}

/**
 * Available theme options
 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

/**
 * Service for managing dark mode state
 * Uses localStorage for persistent storage across sessions
 * Follows immutable data patterns and Result pattern for error handling
 */
export class DarkModeService {
  private readonly STORAGE_KEY = 'prisonersDilemma_theme';
  private readonly darkModeClass = 'dark';
  
  /**
   * Initializes the dark mode based on saved preference or system preference
   * @returns A Result indicating success or failure
   */
  public initializeDarkMode(): Result<Theme, ThemeError> {
    try {
      // First, try to get saved preference
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedTheme && this.isValidTheme(savedTheme)) {
        const theme = savedTheme as Theme;
        this.applyTheme(theme);
        return Result.success(theme);
      }
      
      // If no saved preference, check system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDarkMode ? Theme.DARK : Theme.LIGHT;
      
      // Apply and save the theme
      this.applyTheme(theme);
      localStorage.setItem(this.STORAGE_KEY, theme);
      
      return Result.success(theme);
    } catch (error) {
      console.error('Failed to initialize dark mode:', error);
      return Result.failure(
        new ThemeError(
          ThemeErrorType.STORAGE_ERROR,
          'Failed to initialize dark mode. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Gets the current theme
   * @returns A Result with the current theme, or an error
   */
  public getCurrentTheme(): Result<Theme, ThemeError> {
    try {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      
      if (savedTheme && this.isValidTheme(savedTheme)) {
        return Result.success(savedTheme as Theme);
      }
      
      // If no saved theme, check current HTML class
      const isDarkMode = document.documentElement.classList.contains(this.darkModeClass);
      return Result.success(isDarkMode ? Theme.DARK : Theme.LIGHT);
    } catch (error) {
      console.error('Failed to get current theme:', error);
      return Result.failure(
        new ThemeError(
          ThemeErrorType.STORAGE_ERROR,
          'Failed to get current theme. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Sets the theme to the specified value
   * @param theme The theme to apply
   * @returns A Result indicating success or failure
   */
  public setTheme(theme: Theme): Result<boolean, ThemeError> {
    if (!this.isValidTheme(theme)) {
      return Result.failure(
        new ThemeError(
          ThemeErrorType.INVALID_THEME,
          `Invalid theme: ${theme}. Must be 'light' or 'dark'.`
        )
      );
    }
    
    try {
      this.applyTheme(theme);
      localStorage.setItem(this.STORAGE_KEY, theme);
      return Result.success(true);
    } catch (error) {
      console.error('Failed to set theme:', error);
      return Result.failure(
        new ThemeError(
          ThemeErrorType.STORAGE_ERROR,
          'Failed to save theme preference. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Toggles between light and dark themes
   * @returns A Result with the new theme, or an error
   */
  public toggleTheme(): Result<Theme, ThemeError> {
    const currentThemeResult = this.getCurrentTheme();
    
    if (currentThemeResult.isFailure()) {
      return Result.failure(currentThemeResult.getError());
    }
    
    const currentTheme = currentThemeResult.getValue();
    const newTheme = currentTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    
    const setResult = this.setTheme(newTheme);
    
    if (setResult.isFailure()) {
      return Result.failure(setResult.getError());
    }
    
    return Result.success(newTheme);
  }
  
  /**
   * Listens for system theme changes and updates accordingly
   * @returns A function to stop listening for changes
   */
  public listenForSystemThemeChanges(): () => void {
    const listener = (event: MediaQueryListEvent) => {
      const newTheme = event.matches ? Theme.DARK : Theme.LIGHT;
      this.setTheme(newTheme);
    };
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', listener);
    
    // Return cleanup function
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }
  
  /**
   * Applies the theme to the document
   * @param theme The theme to apply
   */
  private applyTheme(theme: Theme): void {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add(this.darkModeClass);
    } else {
      document.documentElement.classList.remove(this.darkModeClass);
    }
  }
  
  /**
   * Validates that a string is a valid theme
   * @param theme The string to validate
   * @returns True if the theme is valid
   */
  private isValidTheme(theme: string): boolean {
    return theme === Theme.LIGHT || theme === Theme.DARK;
  }
}