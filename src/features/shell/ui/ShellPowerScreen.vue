<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<div v-if="shell.powerState !== 'idle'" class="power-screen" :class="`power-screen-${shell.powerState}`">
		<div class="power-content">
			<div class="power-brand" aria-hidden="true">
				<div class="power-flag">
					<span class="pane pane-red"></span>
					<span class="pane pane-green"></span>
					<span class="pane pane-blue"></span>
					<span class="pane pane-yellow"></span>
				</div>
				<div class="power-wordmark">
					<span class="power-word-windows">Windows</span>
					<span class="power-word-xp">XP</span>
				</div>
			</div>
			<p class="power-primary">{{ shell.powerPrimaryText }}</p>
		</div>
		<div class="power-footer"></div>
	</div>
</template>
