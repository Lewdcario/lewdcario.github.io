<script setup lang="ts">
import { desktopIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<div class="desktop-icons">
		<a
			v-for="icon in desktopIcons"
			:key="icon.label"
			:href="icon.href ?? '#'"
			class="desktop-icon"
			:data-icon-id="icon.id"
			:style="shell.iconStyle(icon)"
			draggable="false"
			@dragstart.prevent
			@pointerdown.prevent="shell.startIconDrag(icon, $event)"
			@click="shell.handleDesktopIconClick(icon, $event)"
		>
			<img
				:src="icon.icon"
				:alt="icon.label"
				width="32"
				height="32"
				draggable="false"
				@dragstart.prevent
			/>
			<p>{{ icon.label }}</p>
		</a>
	</div>
</template>
