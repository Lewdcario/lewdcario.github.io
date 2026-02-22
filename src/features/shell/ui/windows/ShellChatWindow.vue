<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
const feedRef = ref<HTMLElement | null>(null);
const messageInputRef = ref<HTMLInputElement | null>(null);
const ONLINE_WINDOW_MS = 12 * 60 * 1000;

const normalizedName = computed(() => shell.normalizedChatName());
const recentMessages = computed(() => shell.chatMessages.slice(-120));
const contactPresence = computed(() => {
	const now = Date.now();
	const byName = new Map<string, number>();

	for (const entry of shell.chatMessages) {
		const parsed = new Date(entry.createdAt).getTime();
		if (!Number.isFinite(parsed)) continue;
		const current = byName.get(entry.name) ?? 0;
		if (parsed > current) {
			byName.set(entry.name, parsed);
		}
	}

	const me = normalizedName.value.trim();
	if (me) {
		byName.set(me, Math.max(byName.get(me) ?? 0, now));
	}

	const ordered = [...byName.entries()]
		.map(([name, lastSeen]) => ({
			name,
			lastSeen,
			online: name === me || now - lastSeen <= ONLINE_WINDOW_MS
		}))
		.sort((left, right) => right.lastSeen - left.lastSeen);

	return {
		online: ordered.filter((entry) => entry.online),
		offline: ordered.filter((entry) => !entry.online)
	};
});
const canSend = computed(
	() =>
		!shell.chatSending &&
		normalizedName.value.trim().length >= 2 &&
		shell.chatDraft.trim().length > 0
);
const canAddBlockedWord = computed(
	() =>
		shell.signedInAsAdmin &&
		!shell.chatBlacklistSaving &&
		shell.chatBlacklistDraft.trim().length > 0
);

function focusMessageInput() {
	nextTick(() => {
		messageInputRef.value?.focus();
	});
}

function scrollToBottom() {
	nextTick(() => {
		const feed = feedRef.value;
		if (!feed) return;
		feed.scrollTop = feed.scrollHeight;
	});
}

async function submitMessage() {
	if (!canSend.value) return;
	await shell.sendChatMessage();
	focusMessageInput();
	scrollToBottom();
}

function selectContact(name: string) {
	shell.chatName = name;
	focusMessageInput();
}

function refreshMessages() {
	void shell.loadChatMessages();
	if (shell.signedInAsAdmin && shell.chatModerationOpen) {
		void shell.loadChatBlacklist({ quiet: true });
	}
}

function toggleModerationPanel() {
	shell.toggleChatModerationPanel();
}

async function submitBlockedWord() {
	if (!canAddBlockedWord.value) return;
	await shell.addChatBlacklistWord();
}

async function deleteBlockedWord(wordId: number) {
	await shell.removeChatBlacklistWord(wordId);
}

async function deleteMessage(messageId: number) {
	await shell.deleteChatMessage(messageId);
}

watch(
	() => shell.chatMessages.length,
	() => {
		scrollToBottom();
	}
);

watch(
	() => shell.windowState.chat,
	(state) => {
		if (!state.isOpen || state.isMinimized) return;
		focusMessageInput();
		scrollToBottom();
	},
	{ deep: true }
);

watch(
	() => shell.chatModerationOpen,
	(isOpen) => {
		if (!isOpen || !shell.signedInAsAdmin) return;
		void shell.loadChatBlacklist({ quiet: true });
	}
);
</script>

<template>
	<ShellWindowFrame
		window-id="chat"
		title="MSN Messenger - Chat Room"
		:icon="shellIcons.chat"
		icon-alt="chat icon"
		window-class="chat-window"
		body-class="chat-window-body"
	>
		<div class="msn-shell">
			<div class="msn-menu-bar">
				<button type="button">File</button>
				<button type="button">Actions</button>
				<button type="button">Tools</button>
				<button type="button">Help</button>
			</div>
			<div class="msn-shell-body">
				<aside class="msn-buddy-pane">
					<header class="msn-status-card">
						<div class="msn-status-orb" aria-hidden="true"></div>
						<div class="msn-status-text">
							<p>My Status:</p>
							<strong>{{ normalizedName }} (Online)</strong>
						</div>
						<img
							class="msn-status-logo"
							src="/xp-icons/pack/msn-messenger-logo.png"
							alt="MSN logo"
						/>
					</header>

					<button type="button" class="msn-mail-banner">
						<span aria-hidden="true">✉</span>
						<span>No new e-mail messages</span>
					</button>

					<section class="msn-contact-groups">
						<div class="msn-contact-group">
							<h3>
								Online ({{ contactPresence.online.length }})
							</h3>
							<button
								v-for="contact in contactPresence.online"
								:key="`online-${contact.name}`"
								type="button"
								class="msn-contact-row online"
								@click="selectContact(contact.name)"
							>
								<span
									class="msn-presence-dot"
									aria-hidden="true"
								></span>
								<span>{{ contact.name }}</span>
							</button>
						</div>
						<div class="msn-contact-group">
							<h3>
								Not Online ({{
									contactPresence.offline.length
								}})
							</h3>
							<button
								v-for="contact in contactPresence.offline"
								:key="`offline-${contact.name}`"
								type="button"
								class="msn-contact-row offline"
								@click="selectContact(contact.name)"
							>
								<span
									class="msn-presence-dot"
									aria-hidden="true"
								></span>
								<span>{{ contact.name }}</span>
							</button>
						</div>
					</section>

					<footer class="msn-quick-actions">
						<button type="button" class="msn-quick-actions-title">
							I want to...
						</button>
						<button type="button" @click="focusMessageInput">
							Add a Contact
						</button>
						<button type="button" @click="focusMessageInput">
							Send an Instant Message
						</button>
						<button type="button" @click="refreshMessages">
							Go to Chat Rooms
						</button>
					</footer>
				</aside>

				<section class="msn-room-pane">
					<header class="msn-room-header">
						<strong># chat</strong>
						<div class="msn-room-header-actions">
							<button
								type="button"
								:disabled="shell.chatLoading"
								@click="refreshMessages"
							>
								{{
									shell.chatLoading ? 'Loading...' : 'Refresh'
								}}
							</button>
							<button
								v-if="shell.signedInAsAdmin"
								type="button"
								class="msn-moderation-toggle"
								:class="{ active: shell.chatModerationOpen }"
								:title="
									shell.chatModerationOpen
										? 'Close moderation'
										: 'Open moderation'
								"
								:aria-pressed="shell.chatModerationOpen"
								@click="toggleModerationPanel"
							>
								⚙
							</button>
						</div>
					</header>

					<p v-if="shell.chatError" class="msn-chat-error">
						{{ shell.chatError }}
					</p>

					<section
						v-if="shell.signedInAsAdmin && shell.chatModerationOpen"
						class="msn-moderation-panel"
					>
						<header>
							<strong>Word Filter</strong>
						</header>
						<p
							v-if="shell.chatModerationError"
							class="msn-chat-error"
						>
							{{ shell.chatModerationError }}
						</p>
						<form
							class="msn-moderation-form"
							@submit.prevent="submitBlockedWord"
						>
							<input
								v-model="shell.chatBlacklistDraft"
								type="text"
								maxlength="64"
								autocomplete="off"
								spellcheck="false"
								placeholder="Add blocked word..."
							/>
							<button
								type="submit"
								:disabled="!canAddBlockedWord"
							>
								{{
									shell.chatBlacklistSaving
										? 'Saving...'
										: 'Add'
								}}
							</button>
						</form>
						<ul class="msn-moderation-list">
							<li
								v-for="word in shell.chatBlacklistWords"
								:key="word.id"
							>
								<span>{{ word.word }}</span>
								<button
									type="button"
									:disabled="
										shell.chatDeletingBlacklistWordId !==
										null
									"
									@click="deleteBlockedWord(word.id)"
								>
									{{
										shell.chatDeletingBlacklistWordId ===
										word.id
											? 'Removing...'
											: 'Remove'
									}}
								</button>
							</li>
							<li
								v-if="
									!shell.chatModerationLoading &&
									shell.chatBlacklistWords.length === 0
								"
								class="msn-moderation-empty"
							>
								No blocked words configured.
							</li>
						</ul>
					</section>

					<div ref="feedRef" class="msn-room-feed">
						<p
							v-if="
								!shell.chatLoading &&
								shell.chatMessages.length === 0
							"
							class="msn-chat-empty"
						>
							No messages yet. Say hi.
						</p>
						<article
							v-for="entry in recentMessages"
							:key="entry.id"
							class="msn-room-entry"
							:class="{ mine: entry.name === normalizedName }"
						>
							<header class="msn-room-entry-header">
								<strong>{{ entry.name }}</strong>
								<div class="msn-room-entry-meta">
									<span>{{
										shell.formatChatTimestamp(
											entry.createdAt
										)
									}}</span>
									<button
										v-if="shell.signedInAsAdmin"
										type="button"
										class="msn-room-entry-delete"
										:disabled="
											shell.chatDeletingMessageId !== null
										"
										@click="deleteMessage(entry.id)"
									>
										{{
											shell.chatDeletingMessageId ===
											entry.id
												? 'Deleting...'
												: 'Delete'
										}}
									</button>
								</div>
							</header>
							<p>{{ entry.message }}</p>
						</article>
					</div>

					<form class="msn-compose" @submit.prevent="submitMessage">
						<label for="msn-chat-name">Name</label>
						<input
							id="msn-chat-name"
							v-model="shell.chatName"
							type="text"
							maxlength="48"
							placeholder="Pick a name..."
						/>
						<label for="msn-chat-message">Message</label>
						<input
							id="msn-chat-message"
							ref="messageInputRef"
							v-model="shell.chatDraft"
							type="text"
							maxlength="500"
							autocomplete="off"
							spellcheck="false"
							placeholder="Type a message..."
						/>
						<button
							type="submit"
							:disabled="!canSend || shell.chatLoading"
						>
							{{ shell.chatSending ? 'Sending...' : 'Send' }}
						</button>
					</form>
				</section>
			</div>
		</div>
	</ShellWindowFrame>
</template>
