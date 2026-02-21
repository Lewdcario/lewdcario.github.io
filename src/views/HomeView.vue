<script setup lang="ts">
import { provideShellController } from '~/src/features/shell/model/useShellController';
import ShellContextMenu from '~/src/features/shell/ui/ShellContextMenu.vue';
import ShellDesktopIcons from '~/src/features/shell/ui/ShellDesktopIcons.vue';
import ShellPowerScreen from '~/src/features/shell/ui/ShellPowerScreen.vue';
import ShellSplashScreen from '~/src/features/shell/ui/ShellSplashScreen.vue';
import ShellTaskbar from '~/src/features/shell/ui/taskbar/ShellTaskbar.vue';
import ShellWindowsLayer from '~/src/features/shell/ui/windows/ShellWindowsLayer.vue';

const shell = provideShellController();
</script>

<template>
	<div class="xp-shell" :data-theme="shell.activeThemeId" @contextmenu.prevent="shell.openContextMenu">
		<ShellSplashScreen />
		<ShellPowerScreen />
		<ShellDesktopIcons />
		<ShellWindowsLayer />
		<ShellContextMenu />
		<ShellTaskbar />
	</div>
</template>
