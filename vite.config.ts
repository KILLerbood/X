import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Production: a strict Content-Security-Policy. The live build only talks to Apps Script. */
function csp(): Plugin {
  return {
    name: 'crmx-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const policy = [
        "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
        "connect-src 'self' https://script.google.com https://script.googleusercontent.com", "base-uri 'self'", "form-action 'self'", "object-src 'none'"
      ].join('; ');
      return html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="' + policy + '" />');
    }
  };
}

export default defineConfig(({ mode }) => {
  const mockDefaults: Record<string, string> = mode === 'mock' ? { VITE_MOCK: '1', VITE_ROUTER: 'hash' } : {};
  const env = { ...mockDefaults, ...loadEnv(mode, process.cwd(), '') };
  for (const [k, v] of Object.entries(mockDefaults)) if (!(k in process.env)) process.env[k] = env[k] ?? v;
  return {
    plugins: [react(), csp()],
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], query: ['@tanstack/react-query', 'zod'] } } }
    },
  };
});
