<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellStartMenu from './ShellStartMenu.vue';

const shell = useShellControllerContext();
</script>

<template>
	<div class="taskbar">
		<ShellStartMenu />

		<div class="taskbar-divider"></div>

		<div id="taskbar-apps" class="open-apps">
			<div
				v-for="taskbarWindow in shell.taskbarWindows"
				:key="taskbarWindow.id"
				class="taskbar-app"
				:data-taskbar-window-id="taskbarWindow.id"
				:class="{
					active: shell.isTaskbarWindowActive(taskbarWindow.id),
					minimized: taskbarWindow.isMinimized,
					closed: !taskbarWindow.isOpen
				}"
				@click="shell.toggleWindowFromTaskbar(taskbarWindow.id)"
			>
				<img :src="taskbarWindow.icon" width="16" height="16" :alt="`${taskbarWindow.label} icon`" />
				<span>{{ taskbarWindow.label }}</span>
			</div>
		</div>

		<div class="tray">
			<div id="hit-counter" class="tray-counter">{{ shell.visitorDisplay }}</div>
			<div class="tray-divider"></div>
			<div id="taskbar-time" class="taskbar-time">{{ shell.taskbarClock }}</div>
		</div>
	</div>
</template>
