<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
	createCmdBannerLines,
	runCmdCommand,
	type CmdShellPort,
	type CmdLine,
	type CmdWorkingDirectory
} from '~/src/features/cmd/model/createCmdRuntime';
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();

const inputValue = ref('');
const lines = ref<Array<CmdLine & { id: number }>>([]);
const history = ref<string[]>([]);
const historyCursor = ref(-1);
const workingDirectory = ref<CmdWorkingDirectory>('C:\\');
const inputRef = ref<HTMLInputElement | null>(null);
const outputRef = ref<HTMLElement | null>(null);

let lineIdCounter = 0;

const prompt = computed(() => `${workingDirectory.value}>`);

function appendLines(nextLines: CmdLine[]) {
	for (const line of nextLines) {
		lines.value.push({
			...line,
			id: lineIdCounter
		});
		lineIdCounter += 1;
	}
}

function scrollToBottom() {
	nextTick(() => {
		const outputElement = outputRef.value;
		if (!outputElement) return;
		outputElement.scrollTop = outputElement.scrollHeight;
	});
}

function focusInput() {
	nextTick(() => {
		inputRef.value?.focus();
	});
}

function printBanner() {
	appendLines(createCmdBannerLines());
	scrollToBottom();
}

function clearScreen() {
	lines.value = [];
	lineIdCounter = 0;
}

function submitCommand() {
	const rawValue = inputValue.value;
	const trimmedValue = rawValue.trim();
	const commandPrompt = prompt.value;
	inputValue.value = '';

	if (!trimmedValue) {
		appendLines([{ kind: 'muted', text: `${commandPrompt}` }]);
		scrollToBottom();
		return;
	}

	appendLines([{ kind: 'muted', text: `${commandPrompt} ${rawValue}` }]);
	history.value.push(trimmedValue);
	if (history.value.length > 100) {
		history.value = history.value.slice(-100);
	}
	historyCursor.value = -1;

	const result = runCmdCommand(
		trimmedValue,
		workingDirectory.value,
		shell as unknown as CmdShellPort
	);
	workingDirectory.value = result.nextDirectory;
	if (result.clearScreen) {
		clearScreen();
	}
	appendLines(result.lines);
	scrollToBottom();
}

function browseHistory(direction: 1 | -1) {
	if (history.value.length === 0) return;

	const maxCursor = history.value.length - 1;
	if (direction > 0) {
		historyCursor.value = Math.min(maxCursor, historyCursor.value + 1);
	} else {
		historyCursor.value = Math.max(-1, historyCursor.value - 1);
	}

	if (historyCursor.value === -1) {
		inputValue.value = '';
		return;
	}

	const index = history.value.length - 1 - historyCursor.value;
	inputValue.value = history.value[index] ?? '';
}

watch(
	() => shell.windowState.cmd,
	(state) => {
		if (!state.isOpen || state.isMinimized) return;
		focusInput();
	},
	{ deep: true }
);

watch(
	() => shell.windowPositions.cmd.z,
	() => {
		if (!shell.isWindowVisible('cmd')) return;
		focusInput();
	}
);

onMounted(() => {
	printBanner();
});
</script>

<template>
	<ShellWindowFrame
		window-id="cmd"
		title="cmd.exe"
		:icon="shellIcons.cmd"
		icon-alt="command prompt icon"
		window-class="cmd-window"
		body-class="cmd-window-body"
	>
		<div class="cmd-shell">
			<div
				ref="outputRef"
				class="cmd-output"
				@pointerdown.stop="focusInput"
			>
				<p
					v-for="line in lines"
					:key="line.id"
					class="cmd-line"
					:class="`cmd-line-${line.kind}`"
				>
					{{ line.text }}
				</p>
				<form class="cmd-input-row" @submit.prevent="submitCommand">
					<label class="cmd-prompt" for="cmd-input">{{
						prompt
					}}</label>
					<input
						id="cmd-input"
						ref="inputRef"
						v-model="inputValue"
						class="cmd-input"
						type="text"
						autocomplete="off"
						spellcheck="false"
						@keydown.up.prevent="browseHistory(1)"
						@keydown.down.prevent="browseHistory(-1)"
					/>
				</form>
			</div>
		</div>
	</ShellWindowFrame>
</template>
