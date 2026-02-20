import { createError, defineEventHandler } from 'h3';
import { desc, eq } from 'drizzle-orm';
import { blogPostsResponseSchema } from '~/shared/blog';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { blogPosts } from '~/server/db/schema';
import { getAuthSessionRole } from '~/server/utils/auth';
import { toBlogPostRecord } from '~/server/utils/blog';

export default defineEventHandler(async (event) => {
	const role = getAuthSessionRole(event);

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const rows =
			role === 'admin'
				? await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt))
				: await db
					.select()
					.from(blogPosts)
					.where(eq(blogPosts.published, true))
					.orderBy(desc(blogPosts.createdAt));

		return blogPostsResponseSchema.parse({
			role,
			posts: rows.map((row) => toBlogPostRecord(row))
		});
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'statusCode' in error &&
			typeof (error as { statusCode?: unknown }).statusCode === 'number'
		) {
			throw error;
		}

		throw createError({
			statusCode: 500,
			statusMessage: 'Failed loading blog posts from database.'
		});
	}
});
