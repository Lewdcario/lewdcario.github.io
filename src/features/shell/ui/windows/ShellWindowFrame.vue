<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import type { WindowId } from '~/src/features/shell/model/types';

interface Props {
	windowId: WindowId;
	title: string;
	icon?: string;
	iconAlt?: string;
	windowClass?: string;
	bodyClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
	icon: '',
	iconAlt: 'window icon',
	windowClass: '',
	bodyClass: ''
});

const shell = useShellControllerContext();
</script>

<template>
	<Transition name="xp-window">
		<div
			v-if="shell.isWindowVisible(props.windowId)"
			class="window draggable-window"
			:data-window-id="props.windowId"
			:class="[
				props.windowClass,
				{ 'window-maximized': shell.isWindowMaximized(props.windowId) }
			]"
			:style="shell.windowStyle(props.windowId)"
			@pointerdown="shell.focusWindow(props.windowId)"
		>
			<div
				class="title-bar drag-handle"
				@pointerdown.stop="
					shell.startWindowDrag(props.windowId, $event)
				"
			>
				<div class="title-bar-text">
					<img
						v-if="props.icon"
						:src="props.icon"
						width="12"
						height="12"
						:alt="props.iconAlt"
					/>
					<slot name="title">{{ props.title }}</slot>
				</div>
				<div class="title-bar-controls">
					<button
						aria-label="Minimize"
						@click.stop="shell.minimizeWindow(props.windowId)"
					></button>
					<button
						:aria-label="
							shell.isWindowMaximized(props.windowId)
								? 'Restore'
								: 'Maximize'
						"
						@click.stop="shell.toggleMaximizeWindow(props.windowId)"
					></button>
					<button
						aria-label="Close"
						@click.stop="shell.closeWindow(props.windowId)"
					></button>
				</div>
			</div>
			<div class="window-body" :class="props.bodyClass">
				<slot />
			</div>
			<template v-if="shell.canResizeWindow(props.windowId)">
				<div
					v-for="direction in shell.resizeDirections"
					:key="`${props.windowId}-${direction}`"
					class="window-resize-handle"
					:class="`handle-${direction}`"
					@pointerdown="
						shell.startWindowResize(
							props.windowId,
							direction,
							$event
						)
					"
				></div>
			</template>
		</div>
	</Transition>
</template>
