<script setup lang="ts">
import { recycleBinShortcuts, shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame
		window-id="recycle"
		title="Recycle Bin"
		:icon="shellIcons.recycle"
		icon-alt="recycle bin icon"
		window-class="recycle-window"
		body-class="links-window-body recycle-window-body"
	>
		<span class="group-title">Archived Shortcuts</span>
		<div class="recycle-shortcuts-grid">
			<a
				v-for="shortcut in recycleBinShortcuts"
				:key="shortcut.id"
				:href="shortcut.href ?? '#'"
				class="recycle-shortcut"
				@click="shell.handleRecycleShortcutClick(shortcut, $event)"
			>
				<img :src="shortcut.icon" :alt="shortcut.label" width="32" height="32" />
				<span>{{ shortcut.label }}</span>
			</a>
		</div>
	</ShellWindowFrame>
</template>
