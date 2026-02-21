<script setup lang="ts">
import ShellBrowserWindow from './ShellBrowserWindow.vue';
import ShellChatWindow from './ShellChatWindow.vue';
import ShellCmdWindow from './ShellCmdWindow.vue';
import ShellClockWindow from './ShellClockWindow.vue';
import ShellLinksWindow from './ShellLinksWindow.vue';
import ShellMainWindow from './ShellMainWindow.vue';
import ShellNoiseWindow from './ShellNoiseWindow.vue';
import ShellOtaClockWindow from './ShellOtaClockWindow.vue';
import ShellRecycleWindow from './ShellRecycleWindow.vue';
import ShellRemoteWindow from './ShellRemoteWindow.vue';
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
		<ShellVlcWindow />
		<ShellNoiseWindow />
		<ShellRemoteWindow />
		<ShellRecycleWindow />
		<ShellOtaClockWindow />
		<ShellMainWindow />
	</div>
</template>
