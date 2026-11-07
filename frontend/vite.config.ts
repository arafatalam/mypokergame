import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    server: {
        host: 'localhost',
        port: 7000,
        strictPort: true,

        // Forward backend requests to Laravel during development.
        proxy: {
            '/sanctum': 'http://localhost:8000',
            '/api': 'http://localhost:8000',
        },
    },
})
