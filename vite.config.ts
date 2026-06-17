import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

console.log("----------------------------------------");
console.log("VITE BUILD ENVIRONMENT DEBUG:");
console.log("Current working directory:", process.cwd());
console.log("Files in root:", fs.readdirSync('.'));
if (fs.existsSync('src')) {
  console.log("Files in src:", fs.readdirSync('src'));
} else {
  console.log("src folder DOES NOT EXIST!");
}
console.log("----------------------------------------");

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
