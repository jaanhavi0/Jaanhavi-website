import path from 'path';
import { defineConfig, } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
 

  return {
    base: './', // ✅ Important for Vercel to resolve assets correctly
    plugins: [react()],
    define: {
      
    },
    resolve: {
      alias: {
        '@styles': path.resolve(__dirname, './src/styles'),
      },
    },
    build: {
  chunkSizeWarningLimit: 1600,
}

  };
});
