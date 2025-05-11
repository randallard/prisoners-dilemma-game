import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'test/components/**/*.test.ts',
  nodeResolve: true,
  concurrency: 1,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  plugins: [
    vitePlugin({
      configFile: './vite.config.ts',
    }),
  ],
  testFramework: {
    config: {
      timeout: 3000,
    },
  },
};