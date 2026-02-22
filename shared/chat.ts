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

export const chatMessageDeleteResponseSchema = z.object({
	deletedId: z.number().int().nonnegative()
});

export const chatBlacklistedWordSchema = z.object({
	id: z.number().int().nonnegative(),
	word: z.string().trim().min(1).max(64),
	createdAt: z.string()
});

export const createChatBlacklistWordInputSchema = z.object({
	word: z.string().trim().min(1).max(64)
});

export const chatBlacklistResponseSchema = z.object({
	words: z.array(chatBlacklistedWordSchema)
});

export const chatBlacklistWordResponseSchema = z.object({
	word: chatBlacklistedWordSchema
});

export const chatBlacklistDeleteResponseSchema = z.object({
	deletedId: z.number().int().nonnegative()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CreateChatMessageInput = z.infer<
	typeof createChatMessageInputSchema
>;
export type ChatMessagesResponse = z.infer<typeof chatMessagesResponseSchema>;
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;
export type ChatMessageDeleteResponse = z.infer<
	typeof chatMessageDeleteResponseSchema
>;
export type ChatBlacklistedWord = z.infer<typeof chatBlacklistedWordSchema>;
export type CreateChatBlacklistWordInput = z.infer<
	typeof createChatBlacklistWordInputSchema
>;
export type ChatBlacklistResponse = z.infer<typeof chatBlacklistResponseSchema>;
export type ChatBlacklistWordResponse = z.infer<
	typeof chatBlacklistWordResponseSchema
>;
export type ChatBlacklistDeleteResponse = z.infer<
	typeof chatBlacklistDeleteResponseSchema
>;
