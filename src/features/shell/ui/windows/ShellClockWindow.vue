<script setup lang="ts">
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame window-id="clock" title="timedatectl.d" window-class="side-window" body-class="small-window-body">
		<p>
			<img :src="shellIcons.globe" width="12" height="12" alt="clock icon" />
			<span> {{ shell.liveClock }}</span>
		</p>
		<p>
			system status:
			<span id="online">{{ shell.onlineStatus }}</span>
		</p>
	</ShellWindowFrame>
</template>
