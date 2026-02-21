import type { InferSelectModel } from 'drizzle-orm';
import { chatMessages } from '~/server/db/schema';
import type { ChatMessage } from '~/shared/chat';

export function toChatMessageRecord(
	row: InferSelectModel<typeof chatMessages>
): ChatMessage {
	const createdAt =
		row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);

	return {
		id: row.id,
		name: row.name,
		message: row.message,
		createdAt: createdAt.toISOString()
	};
}
