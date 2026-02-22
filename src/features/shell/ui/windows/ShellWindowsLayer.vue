<script setup lang="ts">
import { computed } from 'vue';
import { shellFeatureFlags } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellBrowserWindow from './ShellBrowserWindow.vue';
import ShellChatWindow from './ShellChatWindow.vue';
import ShellCmdWindow from './ShellCmdWindow.vue';
import ShellClockWindow from './ShellClockWindow.vue';
import ShellControlPanelWindow from './ShellControlPanelWindow.vue';
import ShellLinksWindow from './ShellLinksWindow.vue';
import ShellMainWindow from './ShellMainWindow.vue';
import ShellMinesweeperWindow from './ShellMinesweeperWindow.vue';
import ShellNoiseWindow from './ShellNoiseWindow.vue';
import ShellOtaClockWindow from './ShellOtaClockWindow.vue';
import ShellPaintWindow from './ShellPaintWindow.vue';
import ShellGalleryWindow from './ShellGalleryWindow.vue';
import ShellRecycleWindow from './ShellRecycleWindow.vue';
import ShellVlcWindow from './ShellVlcWindow.vue';

const shell = useShellControllerContext();
const requestUrl = useRequestURL();

const showGalleryTwitterLink = computed(() => {
	if (!import.meta.dev) return false;
	const hostname = requestUrl.hostname.toLowerCase();
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '::1' ||
		hostname.endsWith('.local')
	);
});
</script>

<template>
	<div class="contain">
		<div class="containrow containrow-links">
			<ShellLinksWindow v-if="shell.windowState.links.isOpen" />
			<ShellClockWindow v-if="shell.windowState.clock.isOpen" />
		</div>

		<ShellBrowserWindow v-if="shell.windowState.browser.isOpen" />
		<ShellCmdWindow v-if="shell.windowState.cmd.isOpen" />
		<ShellChatWindow v-if="shell.windowState.chat.isOpen" />
		<ShellMinesweeperWindow v-if="shell.windowState.mines.isOpen" />
		<ShellPaintWindow v-if="shell.windowState.paint.isOpen" />
			<ShellGalleryWindow
				v-if="shell.windowState.gallery.isOpen"
				:show-twitter-link="showGalleryTwitterLink"
			/>
		<ShellControlPanelWindow v-if="shell.windowState.control.isOpen" />
		<ShellVlcWindow v-if="shell.windowState.vlc.isOpen" />
		<ShellNoiseWindow v-if="shell.windowState.noise.isOpen" />
		<ShellRecycleWindow v-if="shell.windowState.recycle.isOpen" />
		<ShellOtaClockWindow
			v-if="shellFeatureFlags.otaclock && shell.windowState.otaclock.isOpen"
		/>
		<ShellMainWindow v-if="shell.windowState.main.isOpen" />
	</div>
</template>
