import { z } from 'zod';

export const chatMessageSchema = z.object({
	id: z.number().int().nonnegative(),
	name: z.string().trim().min(1).max(48),
	message: z.string().min(1).max(500),
	createdAt: z.string()
});

export const createChatMessageInputSchema = z.object({
	name: z.string().trim().min(2).max(48),
	message: z.string().trim().min(1).max(500)
});

export const chatMessagesResponseSchema = z.object({
	messages: z.array(chatMessageSchema)
});

export const chatMessageResponseSchema = z.object({
	message: chatMessageSchema
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;
export type ChatMessagesResponse = z.infer<typeof chatMessagesResponseSchema>;
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;
