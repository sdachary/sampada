import { defineConfig } from 'vitest/config';

// wrangler serves imported .html files as text via the rules entry in
// wrangler.toml; vitest has no loader for .html, so pre-transform imports
// to a plain string export. Mirrors the worker behavior in tests.
export default defineConfig({
  plugins: [
    {
      name: 'html-as-text',
      transform(code, id) {
        if (id.endsWith('.html')) return `export default ${JSON.stringify(code)};`;
        return null;
      },
    },
  ],
});
