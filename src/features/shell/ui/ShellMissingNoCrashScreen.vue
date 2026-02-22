<script setup lang="ts">
import { computed } from 'vue';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();

const progressLabel = computed(() => `${shell.missingnoCrashProgress}% complete`);
</script>

<template>
	<div
		v-if="shell.missingnoCrashVisible"
		class="missingno-crash-screen"
		role="alert"
		aria-live="assertive"
	>
		<div class="missingno-crash-content">
			<div class="missingno-crash-copy">
				<p class="missingno-emoticon">:(</p>
				<p class="missingno-lead">
					Your PC ran into a problem and needs to restart. We're just collecting some
					error info, and then we'll restart for you.
				</p>
				<p class="missingno-progress">{{ progressLabel }}</p>
				<p class="missingno-footnote">
					For more information about this issue and possible fixes, visit
					https://www.windows.com/stopcode
				</p>
				<p class="missingno-stopcode">Stop code: MISSINGNO_GLITCH_FAULT</p>
			</div>
		</div>
	</div>
</template>
