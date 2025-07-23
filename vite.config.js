import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves from /repository-name/ 
  // Update this to match your repository name
  base: process.env.NODE_ENV === 'production' ? '/pixel-art-collab/' : '/',
  
  build: {
    // Generate source maps for debugging
    sourcemap: true,
    
    // Optimize bundle
    minify: 'terser',
    
    // Output directory
    outDir: 'dist',
    
    // Clean output directory before build
    emptyOutDir: true,
    
    rollupOptions: {
      output: {
        // Organize build files
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  
  server: {
    // Development server settings
    port: 5173,
    open: true
  },
  
  preview: {
    // Preview server settings
    port: 4173,
    open: true
  }
})