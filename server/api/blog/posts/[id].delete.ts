import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getRouterParam } from 'h3';
import { blogPostDeleteResponseSchema } from '~/shared/blog';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { blogPosts } from '~/server/db/schema';
import { assertAdminSession } from '~/server/utils/auth';

function parsePostId(rawId: string | undefined) {
	const parsed = Number.parseInt(rawId ?? '', 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid blog post id.'
		});
	}

	return parsed;
}

export default defineEventHandler(async (event) => {
	assertAdminSession(event);
	const postId = parsePostId(getRouterParam(event, 'id'));

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const deletedRows = await db
			.delete(blogPosts)
			.where(eq(blogPosts.id, postId))
			.returning({ id: blogPosts.id });

		const deletedRow = deletedRows[0];
		if (!deletedRow) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Blog post not found.'
			});
		}

		return blogPostDeleteResponseSchema.parse({
			deletedId: deletedRow.id
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
			statusMessage: 'Failed deleting blog post.'
		});
	}
});
