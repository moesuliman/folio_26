import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { PROJECT_TAGS } from './lib/project-tags';

const projectTag = z.enum(PROJECT_TAGS as unknown as [string, ...string[]]);

const projects = defineCollection({
	loader: glob({
		pattern: '**/index.mdx',
		base: './src/content/projects',
		generateId: ({ entry }) => {
			const parts = entry.replace(/\\/g, '/').split('/');
			return parts.at(-2) ?? entry;
		},
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			category: z.enum(['product', 'brand', 'art']),
			year: z.number(),
			client: z.string().optional(),
			role: z.string().optional(),
			tags: z.array(projectTag).min(1),
			cover: image(),
			coverBg: z.enum(['black', 'white']).default('black'),
			summary: z.string(),
			featured: z.boolean().default(false),
			hidden: z.boolean().default(false),
			order: z.number().default(0),
			videoUrl: z.string().url().optional(),
		}),
});

const blog = defineCollection({
	loader: glob({
		pattern: '**/index.mdx',
		base: './src/content/blog',
		generateId: ({ entry }) => {
			const parts = entry.replace(/\\/g, '/').split('/');
			return parts.at(-2) ?? entry.replace(/\.mdx$/, '');
		},
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			cover: image().optional(),
			summary: z.string(),
		}),
});

export const collections = { projects, blog };
