import { defineConfig } from 'astro/config';

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
