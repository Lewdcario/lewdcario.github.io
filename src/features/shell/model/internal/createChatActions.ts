import { $fetch } from 'ofetch';
import {
	createChatMessageInputSchema,
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
		pushStatus,
		readApiErrorMessage
	} = deps;

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
		return parsed.toLocaleTimeString([], {
			hour: 'numeric',
			minute: '2-digit'
		});
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
			chatMessages.value = [...chatMessages.value, payload.message].slice(-200);
			pushStatus(`chat: ${payload.message.name} sent a message.`);
		} catch (error) {
			chatError.value = readApiErrorMessage(error, 'Failed sending chat message.');
		} finally {
			chatSending.value = false;
		}
	}

	return {
		loadChatMessages,
		normalizedChatName,
		formatChatTimestamp,
		sendChatMessage
	};
}
