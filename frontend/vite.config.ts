import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()   ,tailwindcss()],

  server:{
    allowedHosts:true,
    port:80,
    host:"0.0.0.0"
  },
  build:{
    outDir:'../backend/public',
    
  },
  
})
