import { defineConfig } from 'vitest/config';

/* Unit-test config for the JS core. Kept separate from vite.config.js (which
 * serves the demo pages) so the two never entangle. Vitest auto-prefers this
 * file over vite.config.js.
 *
 * The model reducers in src/lib/model.js are pure (no DOM) so a chunk of the
 * suite runs in `node`; the boardApi + DnD + renderer tests need a DOM, so we
 * switch to jsdom globally — it's cheap enough at this scale. */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js', 'test/**/*.spec.js'],
    globals: false,
  },
});
