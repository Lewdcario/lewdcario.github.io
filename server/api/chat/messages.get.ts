import { createError, defineEventHandler, getQuery } from 'h3';
import { asc } from 'drizzle-orm';
import { chatMessagesResponseSchema } from '~/shared/chat';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { chatMessages } from '~/server/db/schema';
import { toChatMessageRecord } from '~/server/utils/chat';

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const parsedLimit = Number(query.limit ?? 100);
	const limit = Number.isFinite(parsedLimit)
		? Math.min(200, Math.max(1, Math.floor(parsedLimit)))
		: 100;

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const rows = await db
			.select()
			.from(chatMessages)
			.orderBy(asc(chatMessages.createdAt))
			.limit(limit);

		return chatMessagesResponseSchema.parse({
			messages: rows.map((row) => toChatMessageRecord(row))
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
			statusMessage: 'Failed loading chat messages.'
		});
	}
});
