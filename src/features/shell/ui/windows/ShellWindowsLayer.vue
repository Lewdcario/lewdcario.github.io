<script setup lang="ts">
import { shellFeatureFlags } from '~/src/features/shell/constants/shell';
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
</script>

<template>
	<div class="contain">
		<div class="containrow containrow-links">
			<ShellLinksWindow />
			<ShellClockWindow />
		</div>

		<ShellBrowserWindow />
		<ShellCmdWindow />
		<ShellChatWindow />
		<ShellMinesweeperWindow />
		<ShellPaintWindow />
		<ShellGalleryWindow />
		<ShellControlPanelWindow />
		<ShellVlcWindow />
		<ShellNoiseWindow />
		<ShellRecycleWindow />
		<ShellOtaClockWindow v-if="shellFeatureFlags.otaclock" />
		<ShellMainWindow />
	</div>
</template>
