import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  base: '/', 
  resolve: {
    alias: {
      vue: '@vue/compat',
	  // @ts-ignore
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue'],
  },
  plugins: [vue(), vueJsx()],
  build: {
    outDir: 'dist',
  },
})