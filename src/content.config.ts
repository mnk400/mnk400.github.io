import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // date is optional in frontmatter — when absent, the route derives it
    // from the filename (YYYY-MM-DD-slug.md), matching Jekyll's behavior.
    date: z.coerce.date().optional(),
    edit: z.coerce.date().optional(),
    image: z.string().optional(),
    useMath: z.boolean().optional(),
    scripts: z.array(z.string()).optional(),
  }),
});

export const collections = { posts };
