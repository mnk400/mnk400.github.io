// Identity-only metadata. URLs come from `Astro.site` (set in astro.config.mjs)
// so staging deployments don't claim to be the production host.
export const site = {
  title: 'Manik Kumar',
  description: 'My Portfolio and Blog.',
  r2BaseUrl: 'https://media.manik.cc',
  // Origins verified to send `Access-Control-Allow-Origin` on images. Requesting
  // CORS from a host that doesn't breaks the image load outright, so this is an
  // allowlist rather than a default. See `allowPixelReads`.
  pixelReadableOrigins: [
    'https://media.manik.cc',
    'https://upload.wikimedia.org',
  ],
} as const;
