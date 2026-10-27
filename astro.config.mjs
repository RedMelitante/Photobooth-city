import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://photoboothcity.com',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  image: { domains: ['cdn.shopify.com'] },
});
