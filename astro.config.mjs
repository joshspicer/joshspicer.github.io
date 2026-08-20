import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { proseMedia } from './src/plugins/proseMedia.mjs';
import { responsiveImages } from './src/integrations/responsiveImages.mjs';

const [, repository = ''] = (
  process.env.GITHUB_REPOSITORY ?? '/'
).split('/');
const isUserOrOrganizationSite = repository.endsWith('.github.io');

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL ?? 'https://joshspicer.com',
  base:
    process.env.BASE_PATH ??
    (repository && !isUserOrOrganizationSite ? `/${repository}` : '/'),
  markdown: {
    processor: satteri({
      hastPlugins: [
        proseMedia({ publicDir: new URL('./public/', import.meta.url) }),
      ],
    }),
  },
  integrations: [responsiveImages()],
  vite: {
    server: {
      proxy: {
        '/api/spotify': {
          target: 'https://api.joshspicer.com',
          changeOrigin: true,
        },
      },
    },
  },
});
