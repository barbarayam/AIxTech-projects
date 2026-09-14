// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';

export default defineConfig({
  integrations: [
    // Must come before Starlight so ```mermaid fences are transformed before Expressive Code highlights them.
    mermaid({
      theme: 'default',
      // Follows Starlight's light/dark toggle via the html[data-theme] attribute.
      autoTheme: true,
      enableLog: false,
    }),
    starlight({
      title: 'Weather Starter',
      description: 'Full-stack Singapore weather dashboard: Express, React, SQLite, data.gov.sg.',
      // Each group lists its folder; page order comes from `sidebar.order` frontmatter.
      sidebar: [
        { label: 'Getting Started', items: [{ autogenerate: { directory: 'getting-started' } }] },
        { label: 'Architecture', items: [{ autogenerate: { directory: 'architecture' } }] },
        { label: 'Backend', items: [{ autogenerate: { directory: 'backend' } }] },
        { label: 'Frontend', items: [{ autogenerate: { directory: 'frontend' } }] },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
      ],
    }),
  ],
});
