import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { blogPostResponseSchema, createBlogPostInputSchema } from '~/shared/blog';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { blogPosts } from '~/server/db/schema';
import { assertAdminSession } from '~/server/utils/auth';
import { slugifyPostTitle, toBlogPostRecord } from '~/server/utils/blog';

async function resolveUniqueSlug(baseSlug: string) {
	const db = getBlogDb();
	let attempt = baseSlug;
	let suffix = 2;

	for (;;) {
		const existing = await db
			.select({ id: blogPosts.id })
			.from(blogPosts)
			.where(eq(blogPosts.slug, attempt))
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

	const body = await readBody(event);
	const parsed = createBlogPostInputSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: parsed.error.issues[0]?.message ?? 'Invalid blog post payload.'
		});
	}

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const input = parsed.data;
		const uniqueSlug = await resolveUniqueSlug(slugifyPostTitle(input.title));
		const now = new Date();

		const inserted = await db
			.insert(blogPosts)
			.values({
				slug: uniqueSlug,
				title: input.title,
				excerpt: input.excerpt,
				content: input.content,
				author: input.author,
				published: input.published,
				updatedAt: now
			})
			.returning();

		const insertedRow = inserted[0];
		if (!insertedRow) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed creating blog post.'
			});
		}

		return blogPostResponseSchema.parse({
			post: toBlogPostRecord(insertedRow)
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
			statusMessage: 'Failed creating blog post.'
		});
	}
});
