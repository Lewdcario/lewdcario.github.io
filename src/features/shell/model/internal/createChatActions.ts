import { $fetch } from 'ofetch';
import {
	createChatBlacklistWordInputSchema,
	createChatMessageInputSchema,
	type ChatBlacklistedWord,
	type ChatMessage
} from '~/shared/chat';

export function createChatActions(deps: any) {
	const {
		chatMessages,
		chatLoading,
		chatError,
		chatName,
		chatDraft,
		chatSending,
		chatBlacklistWords,
		chatModerationOpen,
		chatModerationLoading,
		chatModerationError,
		chatBlacklistDraft,
		chatBlacklistSaving,
		chatDeletingMessageId,
		chatDeletingBlacklistWordId,
		sessionRole,
		pushStatus,
		readApiErrorMessage
	} = deps;

	function sortBlockedWords(words: ChatBlacklistedWord[]) {
		return [...words].sort((left, right) =>
			left.word.localeCompare(right.word)
		);
	}

	async function loadChatMessages(options?: { quiet?: boolean }) {
		const quiet = options?.quiet ?? false;
		if (chatLoading.value && !quiet) return;

		if (!quiet) {
			chatLoading.value = true;
			chatError.value = '';
		}

		try {
			const payload = await $fetch<{ messages: ChatMessage[] }>(
				'/api/chat/messages',
				{
					query: { limit: 120 }
				}
			);
			chatMessages.value = payload.messages;
		} catch (error) {
			if (!quiet) {
				chatError.value = readApiErrorMessage(
					error,
					'Unable to load chat messages.'
				);
			}
		} finally {
			if (!quiet) {
				chatLoading.value = false;
			}
		}
	}

	function normalizedChatName() {
		const trimmed = chatName.value.trim();
		if (!trimmed) return 'Guest';
		return trimmed;
	}

	function formatChatTimestamp(value: string) {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		const date = parsed.toLocaleDateString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: '2-digit'
		});
		const time = parsed.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		});

		return `${date} ${time}`;
	}

	async function loadChatBlacklist(options?: { quiet?: boolean }) {
		if (sessionRole.value !== 'admin') {
			chatBlacklistWords.value = [];
			if (!(options?.quiet ?? false)) {
				chatModerationError.value = '';
			}
			return;
		}

		const quiet = options?.quiet ?? false;
		if (chatModerationLoading.value && !quiet) return;

		if (!quiet) {
			chatModerationLoading.value = true;
			chatModerationError.value = '';
		}

		try {
			const payload = await $fetch<{ words: ChatBlacklistedWord[] }>(
				'/api/chat/blacklist'
			);
			chatBlacklistWords.value = sortBlockedWords(payload.words);
		} catch (error) {
			if (!quiet) {
				chatModerationError.value = readApiErrorMessage(
					error,
					'Unable to load chat word filter.'
				);
			}
		} finally {
			if (!quiet) {
				chatModerationLoading.value = false;
			}
		}
	}

	function toggleChatModerationPanel() {
		if (sessionRole.value !== 'admin') return;
		chatModerationError.value = '';
		chatModerationLoading.value = false;
		chatModerationOpen.value = !chatModerationOpen.value;
		if (chatModerationOpen.value) {
			void loadChatBlacklist();
		}
	}

	async function sendChatMessage() {
		if (chatSending.value) return;

		chatError.value = '';
		const parseResult = createChatMessageInputSchema.safeParse({
			name: normalizedChatName(),
			message: chatDraft.value
		});

		if (!parseResult.success) {
			chatError.value =
				parseResult.error.issues[0]?.message ?? 'Invalid chat message.';
			return;
		}

		chatSending.value = true;
		try {
			const payload = await $fetch<{ message: ChatMessage }>(
				'/api/chat/messages',
				{
					method: 'POST',
					body: parseResult.data
				}
			);
			chatName.value = parseResult.data.name;
			chatDraft.value = '';
			chatMessages.value = [...chatMessages.value, payload.message].slice(
				-200
			);
			pushStatus(`chat: ${payload.message.name} sent a message.`);
		} catch (error) {
			chatError.value = readApiErrorMessage(
				error,
				'Failed sending chat message.'
			);
		} finally {
			chatSending.value = false;
		}
	}

	async function addChatBlacklistWord() {
		if (sessionRole.value !== 'admin' || chatBlacklistSaving.value) return;

		chatModerationError.value = '';
		const parseResult = createChatBlacklistWordInputSchema.safeParse({
			word: chatBlacklistDraft.value
		});
		if (!parseResult.success) {
			chatModerationError.value =
				parseResult.error.issues[0]?.message ?? 'Invalid blocked word.';
			return;
		}

		chatBlacklistSaving.value = true;
		try {
			const payload = await $fetch<{ word: ChatBlacklistedWord }>(
				'/api/chat/blacklist',
				{
					method: 'POST',
					body: parseResult.data
				}
			);
			const nextWords = chatBlacklistWords.value.filter(
				(entry) =>
					entry.id !== payload.word.id &&
					entry.word !== payload.word.word
			);
			nextWords.push(payload.word);
			chatBlacklistWords.value = sortBlockedWords(nextWords);
			chatBlacklistDraft.value = '';
			pushStatus(`chat filter: blocked "${payload.word.word}".`);
		} catch (error) {
			chatModerationError.value = readApiErrorMessage(
				error,
				'Failed saving blocked word.'
			);
		} finally {
			chatBlacklistSaving.value = false;
		}
	}

	async function removeChatBlacklistWord(wordId: number) {
		if (
			sessionRole.value !== 'admin' ||
			chatDeletingBlacklistWordId.value !== null
		) {
			return;
		}

		chatModerationError.value = '';
		chatDeletingBlacklistWordId.value = wordId;
		try {
			await $fetch<{ deletedId: number }>(
				`/api/chat/blacklist/${wordId}`,
				{
					method: 'DELETE'
				}
			);
			chatBlacklistWords.value = chatBlacklistWords.value.filter(
				(entry) => entry.id !== wordId
			);
			pushStatus('chat filter: blocked word removed.');
		} catch (error) {
			chatModerationError.value = readApiErrorMessage(
				error,
				'Failed deleting blocked word.'
			);
		} finally {
			chatDeletingBlacklistWordId.value = null;
		}
	}

	async function deleteChatMessage(messageId: number) {
		if (
			sessionRole.value !== 'admin' ||
			chatDeletingMessageId.value !== null
		)
			return;

		chatError.value = '';
		chatDeletingMessageId.value = messageId;
		try {
			await $fetch<{ deletedId: number }>(
				`/api/chat/messages/${messageId}`,
				{
					method: 'DELETE'
				}
			);
			chatMessages.value = chatMessages.value.filter(
				(entry) => entry.id !== messageId
			);
			pushStatus('chat moderation: message deleted.');
		} catch (error) {
			chatError.value = readApiErrorMessage(
				error,
				'Failed deleting chat message.'
			);
		} finally {
			chatDeletingMessageId.value = null;
		}
	}

	return {
		loadChatMessages,
		loadChatBlacklist,
		normalizedChatName,
		formatChatTimestamp,
		sendChatMessage,
		toggleChatModerationPanel,
		addChatBlacklistWord,
		removeChatBlacklistWord,
		deleteChatMessage
	};
}
