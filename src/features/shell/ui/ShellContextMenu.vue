<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<div
		v-if="shell.contextMenuVisible"
		:ref="(element) => (shell.contextMenuRef = element as HTMLElement | null)"
		class="xp-context-menu"
		:style="{ left: `${shell.contextMenuX}px`, top: `${shell.contextMenuY}px` }"
		@contextmenu.stop.prevent
	>
		<div class="xp-context-menu-title">{{ shell.contextMenuTitle }}</div>
		<div class="xp-context-menu-list">
			<template v-for="item in shell.contextMenuItems" :key="item.id">
				<div v-if="item.separator" class="xp-context-menu-separator"></div>
				<button
					v-else
					type="button"
					class="xp-context-menu-item"
					:disabled="item.disabled"
					@click.stop="shell.invokeContextMenuItem(item)"
				>
					{{ item.label }}
				</button>
			</template>
		</div>
	</div>
</template>
