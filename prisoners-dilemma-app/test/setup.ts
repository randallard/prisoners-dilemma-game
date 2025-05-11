// Global test setup for happy-dom environment
import { beforeEach, afterEach } from 'vitest';

// Happy-dom should provide these globals, but we'll ensure they're available
beforeEach(() => {
  // Ensure global window object has expected properties
  if (typeof window !== 'undefined') {
    // Happy-dom should handle localStorage, but we can add custom setup here if needed
  }
});

afterEach(() => {
    // Clean up after each test
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.clear();
    }
  });