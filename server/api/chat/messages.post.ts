import { createError, defineEventHandler, readBody } from 'h3';
import { chatMessageResponseSchema, createChatMessageInputSchema } from '~/shared/chat';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { chatMessages } from '~/server/db/schema';
import { toChatMessageRecord } from '~/server/utils/chat';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const parsed = createChatMessageInputSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: parsed.error.issues[0]?.message ?? 'Invalid chat payload.'
		});
	}

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const input = parsed.data;
		const inserted = await db
			.insert(chatMessages)
			.values({
				name: input.name,
				message: input.message
			})
			.returning();

		const insertedRow = inserted[0];
		if (!insertedRow) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed sending chat message.'
			});
		}

		return chatMessageResponseSchema.parse({
			message: toChatMessageRecord(insertedRow)
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
			statusMessage: 'Failed sending chat message.'
		});
	}
});
