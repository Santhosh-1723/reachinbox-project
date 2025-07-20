import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/search': 'http://localhost:3000',
      '/emails': 'http://localhost:3000',
      // Add other endpoints if needed
    }
  }
});
