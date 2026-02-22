import { createError, defineEventHandler, getRouterParam } from 'h3';
import { eq } from 'drizzle-orm';
import { chatBlacklistDeleteResponseSchema } from '~/shared/chat';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { chatBlacklistedWords } from '~/server/db/schema';
import { assertAdminSession } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
	const rawId = getRouterParam(event, 'id') ?? '';
	const parsedId = Number.parseInt(rawId, 10);
	if (!Number.isInteger(parsedId) || parsedId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid blocked word id.'
		});
	}

	assertAdminSession(event);

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const deletedRows = await db
			.delete(chatBlacklistedWords)
			.where(eq(chatBlacklistedWords.id, parsedId))
			.returning({ id: chatBlacklistedWords.id });
		const deletedRow = deletedRows[0];
		if (!deletedRow) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Blocked word not found.'
			});
		}

		return chatBlacklistDeleteResponseSchema.parse({
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
			statusMessage: 'Failed deleting blocked word.'
		});
	}
});
