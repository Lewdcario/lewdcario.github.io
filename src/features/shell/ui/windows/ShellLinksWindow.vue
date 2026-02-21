<script setup lang="ts">
import { linkGroups } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame window-id="links" title="Links" window-class="side-window" body-class="links-window-body">
		<template v-for="group in linkGroups" :key="group.title">
			<span class="group-title">{{ group.title }}</span>
			<br />
			<template v-for="link in group.links" :key="link.href">
				<span class="link-prefix">[-]</span>
				<a :href="link.href" @click.prevent="shell.openInBrowser(link.href, link.label)">
					{{ link.label }}
				</a>
				<br />
			</template>
		</template>
	</ShellWindowFrame>
</template>
