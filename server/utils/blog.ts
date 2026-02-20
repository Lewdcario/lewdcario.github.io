import type { InferSelectModel } from 'drizzle-orm';
import { blogPosts } from '~/server/db/schema';
import type { BlogPost } from '~/shared/blog';

export function slugifyPostTitle(title: string) {
	const normalized = title
		.toLowerCase()
		.trim()
		.replace(/['"`]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (normalized) return normalized;
	return `post-${Date.now().toString(36)}`;
}

export function toBlogPostRecord(row: InferSelectModel<typeof blogPosts>): BlogPost {
	const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
	const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);

	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		excerpt: row.excerpt,
		content: row.content,
		author: row.author,
		published: row.published,
		createdAt: createdAt.toISOString(),
		updatedAt: updatedAt.toISOString()
	};
}
