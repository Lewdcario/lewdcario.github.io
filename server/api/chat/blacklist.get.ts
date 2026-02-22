import { createError, defineEventHandler } from 'h3';
import { asc } from 'drizzle-orm';
import { chatBlacklistResponseSchema } from '~/shared/chat';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { chatBlacklistedWords } from '~/server/db/schema';
import { assertAdminSession } from '~/server/utils/auth';
import { toChatBlacklistedWordRecord } from '~/server/utils/chat';

export default defineEventHandler(async (event) => {
	assertAdminSession(event);

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const rows = await db
			.select()
			.from(chatBlacklistedWords)
			.orderBy(asc(chatBlacklistedWords.word));

		return chatBlacklistResponseSchema.parse({
			words: rows.map((row) => toChatBlacklistedWordRecord(row))
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
			statusMessage: 'Failed loading chat word filter.'
		});
	}
});
