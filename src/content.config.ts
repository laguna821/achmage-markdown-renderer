import {defineCollection, z} from 'astro:content';

const docs = defineCollection({
  schema: z.object({
    title: z.string().optional(),
    slug: z.string().optional(),
    docType: z.enum(['lecture', 'newsletter', 'note', 'handout']).optional(),
    outputs: z.array(z.enum(['reader', 'stage', 'newsletter'])).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    author: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    heroLabel: z.string().optional(),
    toc: z.enum(['auto', 'manual', 'none']).optional(),
  }),
});

export const collections = {docs};
