import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import {
	chatBlacklistWordResponseSchema,
	createChatBlacklistWordInputSchema
} from '~/shared/chat';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { chatBlacklistedWords } from '~/server/db/schema';
import { assertAdminSession } from '~/server/utils/auth';
import { toChatBlacklistedWordRecord } from '~/server/utils/chat';

function normalizeBlockedWord(input: string) {
	return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default defineEventHandler(async (event) => {
	assertAdminSession(event);

	const body = await readBody(event);
	const parsed = createChatBlacklistWordInputSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage:
				parsed.error.issues[0]?.message ?? 'Invalid chat word payload.'
		});
	}

	const normalizedWord = normalizeBlockedWord(parsed.data.word);
	if (!normalizedWord) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Blocked word cannot be empty.'
		});
	}

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const insertedRows = await db
			.insert(chatBlacklistedWords)
			.values({
				word: normalizedWord
			})
			.onConflictDoNothing({
				target: chatBlacklistedWords.word
			})
			.returning();

		let row = insertedRows[0];
		if (!row) {
			const existingRows = await db
				.select()
				.from(chatBlacklistedWords)
				.where(eq(chatBlacklistedWords.word, normalizedWord))
				.limit(1);
			row = existingRows[0];
		}

		if (!row) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed saving blocked word.'
			});
		}

		return chatBlacklistWordResponseSchema.parse({
			word: toChatBlacklistedWordRecord(row)
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
			statusMessage: 'Failed saving blocked word.'
		});
	}
});
