<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

type PaintTool = 'pencil' | 'eraser';

const shell = useShellControllerContext();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const tool = ref<PaintTool>('pencil');
const brushSize = ref(3);
const color = ref('#000000');
const cursorX = ref(0);
const cursorY = ref(0);

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 640;

const palette = [
	'#000000',
	'#7f7f7f',
	'#880015',
	'#ed1c24',
	'#ff7f27',
	'#fff200',
	'#22b14c',
	'#00a2e8',
	'#3f48cc',
	'#a349a4',
	'#ffffff',
	'#c3c3c3',
	'#b97a57',
	'#ffaec9',
	'#ffc90e',
	'#efe4b0',
	'#b5e61d',
	'#99d9ea',
	'#7092be',
	'#c8bfe7'
] as const;

const statusText = computed(
	() => `${tool.value === 'pencil' ? 'Pencil' : 'Eraser'} | ${brushSize.value}px | ${cursorX.value}, ${cursorY.value}`
);

function getContext() {
	const canvas = canvasRef.value;
	if (!canvas) return null;
	return canvas.getContext('2d');
}

function resetCanvas() {
	const context = getContext();
	if (!context) return;
	context.save();
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	context.restore();
}

function toCanvasPoint(event: PointerEvent) {
	const canvas = canvasRef.value;
	if (!canvas) return null;
	const rect = canvas.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return null;
	const x = ((event.clientX - rect.left) * CANVAS_WIDTH) / rect.width;
	const y = ((event.clientY - rect.top) * CANVAS_HEIGHT) / rect.height;
	return {
		x: Math.max(0, Math.min(CANVAS_WIDTH, x)),
		y: Math.max(0, Math.min(CANVAS_HEIGHT, y))
	};
}

function drawStroke(fromX: number, fromY: number, toX: number, toY: number) {
	const context = getContext();
	if (!context) return;
	context.save();
	context.strokeStyle = tool.value === 'eraser' ? '#ffffff' : color.value;
	context.lineWidth = brushSize.value;
	context.lineCap = 'round';
	context.lineJoin = 'round';
	context.beginPath();
	context.moveTo(fromX, fromY);
	context.lineTo(toX, toY);
	context.stroke();
	context.restore();
}

let lastX = 0;
let lastY = 0;

function handleCanvasPointerDown(event: PointerEvent) {
	if (event.button !== 0) return;
	const point = toCanvasPoint(event);
	if (!point) return;
	isDrawing.value = true;
	lastX = point.x;
	lastY = point.y;
	cursorX.value = Math.round(point.x);
	cursorY.value = Math.round(point.y);
	drawStroke(point.x, point.y, point.x, point.y);
	(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
}

function handleCanvasPointerMove(event: PointerEvent) {
	const point = toCanvasPoint(event);
	if (!point) return;
	cursorX.value = Math.round(point.x);
	cursorY.value = Math.round(point.y);
	if (!isDrawing.value) return;
	drawStroke(lastX, lastY, point.x, point.y);
	lastX = point.x;
	lastY = point.y;
}

function stopDrawing() {
	isDrawing.value = false;
}

function newImage() {
	resetCanvas();
	shell.pushStatus('Paint canvas reset.');
}

function clearSelection() {
	resetCanvas();
	shell.pushStatus('Paint canvas cleared.');
}

function saveImage() {
	const canvas = canvasRef.value;
	if (!canvas) return;
	const link = document.createElement('a');
	link.href = canvas.toDataURL('image/png');
	link.download = `paint-lite-${Date.now()}.png`;
	link.click();
	shell.pushStatus('Paint image downloaded.');
}

function handleGlobalPointerUp() {
	stopDrawing();
}

onMounted(() => {
	resetCanvas();
	window.addEventListener('pointerup', handleGlobalPointerUp);
});

onBeforeUnmount(() => {
	window.removeEventListener('pointerup', handleGlobalPointerUp);
});
</script>

<template>
	<ShellWindowFrame
		window-id="paint"
		title="Paint"
		:icon="shellIcons.paint"
		icon-alt="paint icon"
		window-class="paint-window"
		body-class="paint-window-body"
	>
		<div class="paint-shell">
			<nav class="paint-menu-bar" aria-label="Paint menu">
				<button type="button" @click="shell.pushStatus('File menu is not available in this build.')">File</button>
				<button type="button" @click="shell.pushStatus('Edit menu is not available in this build.')">Edit</button>
				<button type="button" @click="shell.pushStatus('View menu is not available in this build.')">View</button>
				<button type="button" @click="shell.pushStatus('Image menu is not available in this build.')">Image</button>
				<button type="button" @click="shell.pushStatus('Colors menu is not available in this build.')">Colors</button>
				<button type="button" @click="shell.pushStatus('Help menu is not available in this build.')">Help</button>
			</nav>

			<div class="paint-toolbar">
				<div class="paint-tools">
					<button
						type="button"
						class="paint-tool-button"
						:class="{ active: tool === 'pencil' }"
						@click="tool = 'pencil'"
					>
						Pencil
					</button>
					<button
						type="button"
						class="paint-tool-button"
						:class="{ active: tool === 'eraser' }"
						@click="tool = 'eraser'"
					>
						Eraser
					</button>
					<button type="button" class="paint-tool-button" @click="newImage">New</button>
					<button type="button" class="paint-tool-button" @click="clearSelection">Clear</button>
					<button type="button" class="paint-tool-button" @click="saveImage">Save</button>
				</div>
				<label class="paint-brush-size">
					Brush
					<input v-model.number="brushSize" type="range" min="1" max="24" step="1" />
					<strong>{{ brushSize }}px</strong>
				</label>
			</div>

			<div class="paint-canvas-wrap">
				<canvas
					ref="canvasRef"
					class="paint-canvas"
					:width="CANVAS_WIDTH"
					:height="CANVAS_HEIGHT"
					@pointerdown="handleCanvasPointerDown"
					@pointermove="handleCanvasPointerMove"
					@pointerup="stopDrawing"
					@pointercancel="stopDrawing"
					@pointerleave="stopDrawing"
				></canvas>
			</div>

			<div class="paint-palette-row">
				<div class="paint-palette-swatches">
					<button
						v-for="swatch in palette"
						:key="swatch"
						type="button"
						class="paint-swatch"
						:class="{ active: color === swatch && tool === 'pencil' }"
						:style="{ background: swatch }"
						@click="tool = 'pencil'; color = swatch"
					></button>
				</div>
				<div class="paint-current-color" :style="{ background: tool === 'eraser' ? '#ffffff' : color }"></div>
			</div>

			<footer class="paint-status-bar">{{ statusText }}</footer>
		</div>
	</ShellWindowFrame>
</template>
