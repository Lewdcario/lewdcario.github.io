<script setup lang="ts">
import { provideShellController } from '~/src/features/shell/model/useShellController';
import ShellContextMenu from '~/src/features/shell/ui/ShellContextMenu.vue';
import ShellDesktopIcons from '~/src/features/shell/ui/ShellDesktopIcons.vue';
import ShellMissingNoCrashScreen from '~/src/features/shell/ui/ShellMissingNoCrashScreen.vue';
import ShellPowerScreen from '~/src/features/shell/ui/ShellPowerScreen.vue';
import ShellSplashScreen from '~/src/features/shell/ui/ShellSplashScreen.vue';
import ShellTaskbar from '~/src/features/shell/ui/taskbar/ShellTaskbar.vue';
import ShellWindowsLayer from '~/src/features/shell/ui/windows/ShellWindowsLayer.vue';

const shell = provideShellController();
</script>

<template>
	<div
		class="xp-shell"
		:class="{ 'missingno-desktop-glitch': shell.missingnoCrashPhase === 'desktop' }"
		:data-theme="shell.activeThemeId"
		@contextmenu.prevent="shell.openContextMenu"
	>
		<ShellSplashScreen />
		<ShellPowerScreen />
		<div
			v-if="shell.missingnoCrashPhase === 'desktop'"
			class="missingno-desktop-glitch-mask"
			aria-hidden="true"
		/>
		<ShellMissingNoCrashScreen />
		<ShellDesktopIcons />
		<ShellWindowsLayer />
		<ShellContextMenu />
		<ShellTaskbar />
	</div>
</template>
