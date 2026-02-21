<script setup lang="ts">
import RemoteAppStreamPanel from '~/src/features/remote/ui/RemoteAppStreamPanel.vue';
import { shellIcons } from '~/src/features/shell/constants/shell';
import ShellWindowFrame from './ShellWindowFrame.vue';
</script>

<template>
	<ShellWindowFrame
		window-id="remote"
		title="Remote App Stream"
		:icon="shellIcons.remote"
		icon-alt="remote stream icon"
		window-class="remote-window"
		body-class="remote-window-body"
	>
		<RemoteAppStreamPanel />
	</ShellWindowFrame>
</template>
