import { and, eq, ne } from 'drizzle-orm';
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { blogPostResponseSchema, updateBlogPostInputSchema } from '~/shared/blog';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { blogPosts } from '~/server/db/schema';
import { assertAdminSession } from '~/server/utils/auth';
import { slugifyPostTitle, toBlogPostRecord } from '~/server/utils/blog';

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

async function resolveUniqueSlug(baseSlug: string, postId: number) {
	const db = getBlogDb();
	let attempt = baseSlug;
	let suffix = 2;

	for (;;) {
		const existing = await db
			.select({ id: blogPosts.id })
			.from(blogPosts)
			.where(and(eq(blogPosts.slug, attempt), ne(blogPosts.id, postId)))
			.limit(1);
		if (existing.length === 0) {
			return attempt;
		}
		attempt = `${baseSlug}-${suffix}`;
		suffix += 1;
	}
}

export default defineEventHandler(async (event) => {
	assertAdminSession(event);
	const postId = parsePostId(getRouterParam(event, 'id'));

	const body = await readBody(event);
	const parsed = updateBlogPostInputSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: parsed.error.issues[0]?.message ?? 'Invalid blog post payload.'
		});
	}

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const existingRows = await db
			.select()
			.from(blogPosts)
			.where(eq(blogPosts.id, postId))
			.limit(1);
		const existingRow = existingRows[0];
		if (!existingRow) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Blog post not found.'
			});
		}

		const input = parsed.data;
		const baseSlug = slugifyPostTitle(input.title);
		const slug = await resolveUniqueSlug(baseSlug, postId);
		const now = new Date();
		const updatedRows = await db
			.update(blogPosts)
			.set({
				slug,
				title: input.title,
				excerpt: input.excerpt,
				content: input.content,
				author: input.author,
				published: input.published,
				updatedAt: now
			})
			.where(eq(blogPosts.id, postId))
			.returning();

		const updatedRow = updatedRows[0];
		if (!updatedRow) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed updating blog post.'
			});
		}

		return blogPostResponseSchema.parse({
			post: toBlogPostRecord(updatedRow)
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
			statusMessage: 'Failed updating blog post.'
		});
	}
});
