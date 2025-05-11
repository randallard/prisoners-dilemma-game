import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DarkModeService, Theme, ThemeError, ThemeErrorType } from '../../../src/services/dark-mode.service';

describe('DarkModeService', () => {
  let darkModeService: DarkModeService;
  let mockLocalStorage: { [key: string]: string };
  let mockClassList: Set<string>;
  let mockMatchMedia: { matches: boolean; addEventListener: vi.Mock; removeEventListener: vi.Mock };

  beforeEach(() => {
    darkModeService = new DarkModeService();
    mockLocalStorage = {};
    mockClassList = new Set<string>();
    mockMatchMedia = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    // Mock document.documentElement.classList
    Object.defineProperty(global.document, 'documentElement', {
      value: {
        classList: {
          add: vi.fn((className: string) => mockClassList.add(className)),
          remove: vi.fn((className: string) => mockClassList.delete(className)),
          contains: vi.fn((className: string) => mockClassList.has(className)),
        },
      },
      writable: true,
    });

    // Mock window.matchMedia
    Object.defineProperty(global.window, 'matchMedia', {
      value: vi.fn(() => mockMatchMedia),
      writable: true,
    });
  });

  describe('initializeDarkMode', () => {
    test('should initialize with saved theme', () => {
      // Arrange
      mockLocalStorage['prisonersDilemma_theme'] = Theme.DARK;

      // Act
      const result = darkModeService.initializeDarkMode();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.DARK);
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    test('should initialize with system preference when no saved theme', () => {
      // Arrange
      mockMatchMedia.matches = true; // Prefers dark mode

      // Act
      const result = darkModeService.initializeDarkMode();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.DARK);
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('prisonersDilemma_theme', Theme.DARK);
    });

    test('should default to light theme when no system preference', () => {
      // Arrange
      mockMatchMedia.matches = false; // Prefers light mode

      // Act
      const result = darkModeService.initializeDarkMode();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.LIGHT);
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    test('should handle localStorage errors gracefully', () => {
      // Arrange
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Act
      const result = darkModeService.initializeDarkMode();

      // Assert
      expect(result.isFailure()).toBe(true);
      expect(result.getError().type).toBe(ThemeErrorType.STORAGE_ERROR);
    });
  });

  describe('getCurrentTheme', () => {
    test('should return saved theme from localStorage', () => {
      // Arrange
      mockLocalStorage['prisonersDilemma_theme'] = Theme.DARK;

      // Act
      const result = darkModeService.getCurrentTheme();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.DARK);
    });

    test('should detect theme from document class', () => {
      // Arrange
      mockClassList.add('dark');

      // Act
      const result = darkModeService.getCurrentTheme();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.DARK);
    });

    test('should default to light theme when no indicators', () => {
      // Act
      const result = darkModeService.getCurrentTheme();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.LIGHT);
    });
  });

  describe('setTheme', () => {
    test('should set dark theme successfully', () => {
      // Act
      const result = darkModeService.setTheme(Theme.DARK);

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('prisonersDilemma_theme', Theme.DARK);
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    test('should set light theme successfully', () => {
      // Act
      const result = darkModeService.setTheme(Theme.LIGHT);

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('prisonersDilemma_theme', Theme.LIGHT);
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    test('should reject invalid theme values', () => {
      // Act
      const result = darkModeService.setTheme('invalid' as Theme);

      // Assert
      expect(result.isFailure()).toBe(true);
      expect(result.getError().type).toBe(ThemeErrorType.INVALID_THEME);
    });

    test('should handle localStorage errors', () => {
      // Arrange
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Act
      const result = darkModeService.setTheme(Theme.DARK);

      // Assert
      expect(result.isFailure()).toBe(true);
      expect(result.getError().type).toBe(ThemeErrorType.STORAGE_ERROR);
    });
  });

  describe('toggleTheme', () => {
    test('should toggle from light to dark', () => {
      // Arrange
      mockLocalStorage['prisonersDilemma_theme'] = Theme.LIGHT;

      // Act
      const result = darkModeService.toggleTheme();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.DARK);
      expect(localStorage.setItem).toHaveBeenCalledWith('prisonersDilemma_theme', Theme.DARK);
    });

    test('should toggle from dark to light', () => {
      // Arrange
      mockLocalStorage['prisonersDilemma_theme'] = Theme.DARK;

      // Act
      const result = darkModeService.toggleTheme();

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(Theme.LIGHT);
      expect(localStorage.setItem).toHaveBeenCalledWith('prisonersDilemma_theme', Theme.LIGHT);
    });

    test('should handle getCurrentTheme errors', () => {
      // Arrange
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Act
      const result = darkModeService.toggleTheme();

      // Assert
      expect(result.isFailure()).toBe(true);
      expect(result.getError().type).toBe(ThemeErrorType.STORAGE_ERROR);
    });
  });

  describe('listenForSystemThemeChanges', () => {
    test('should set up listener and return cleanup function', () => {
      // Act
      const cleanup = darkModeService.listenForSystemThemeChanges();

      // Assert
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    test('should update theme when system preference changes', () => {
      // Arrange
      let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
      mockMatchMedia.addEventListener.mockImplementation((event, listener) => {
        if (event === 'change') {
          changeListener = listener;
        }
      });

      // Act
      darkModeService.listenForSystemThemeChanges();
      const mockEvent = { matches: true } as MediaQueryListEvent;
      changeListener?.(mockEvent);

      // Assert
      expect(localStorage.setItem).toHaveBeenCalledWith('prisonersDilemma_theme', Theme.DARK);
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    test('should remove listener when cleanup is called', () => {
      // Arrange
      let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
      mockMatchMedia.addEventListener.mockImplementation((event, listener) => {
        if (event === 'change') {
          changeListener = listener;
        }
      });

      // Act
      const cleanup = darkModeService.listenForSystemThemeChanges();
      cleanup();

      // Assert
      expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', changeListener);
    });
  });
});