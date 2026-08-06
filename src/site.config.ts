export const siteConfig = {
  name: 'Josh Spicer',
  initials: 'JS',
  description: 'Notes on software, security, homelabs, travel, and projects.',
  spotify: {
    endpoint: 'https://api.joshspicer.com/api/spotify',
    articleUrl: 'https://joshspicer.com/spotify-now-playing',
    pollIntervalMs: 60_000,
  },
  links: [
    {
      label: 'GitHub',
      href: 'https://github.com/joshspicer',
      icon: 'github',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/joshspicer',
      icon: 'linkedin',
    },
    {
      label: 'Spotify',
      href: 'https://open.spotify.com/user/joshspicer37',
      icon: 'spotify',
    },
  ],
} as const;
