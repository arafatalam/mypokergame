import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    server: {
        host: 'localhost',
        port: 8000,
        strictPort: true,

        // Forward backend requests to Laravel during development.
        proxy: {
            '/sanctum': 'http://localhost:8001',
            '/api': 'http://localhost:8001',
        },
    },
});
