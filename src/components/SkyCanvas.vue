<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

interface Star {
	x: number;
	y: number;
	radius: number;
	vx: number;
	vy: number;
	glow: string;
}

const canvas = ref<HTMLCanvasElement | null>(null);
const maxStars = 100;
let animationFrame = 0;
let width = 0;
let height = 0;
let context: CanvasRenderingContext2D | null = null;
const stars: Star[] = [];

const random = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min + 1)) + min;

const resizeCanvas = () => {
	if (!canvas.value) return;
	width = canvas.value.width = window.innerWidth;
	height = canvas.value.height = window.innerHeight;
};

const seedStars = () => {
	stars.length = 0;
	for (let i = 0; i < maxStars; i++) {
		stars.push({
			x: Math.random() * width,
			y: Math.random() * height,
			radius: Math.random() * 2 + 1,
			vx: random(-1, 1) / 2,
			vy: random(1, 10) / 10,
			glow: `rgba(${random(0, 255)},${random(0, 255)},${random(0, 255)},${Math.random()})`
		});
	}
};

const drawStars = () => {
	if (!context) return;

	context.clearRect(0, 0, width, height);
	context.fillStyle = 'rgba(0, 0, 0, 0.8)';
	context.fillRect(0, 0, width, height);
	context.save();
	context.fillStyle = '#fff';

	for (const star of stars) {
		context.beginPath();
		context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
		context.shadowColor = star.glow;
		context.shadowBlur = 10;
		context.fill();
	}

	context.restore();
};

const updateStars = () => {
	for (const star of stars) {
		star.x += star.vx;
		star.y += star.vy;
		if (star.y > height) {
			star.y = 0;
			star.x = Math.random() * width;
		}
	}
};

const loop = () => {
	drawStars();
	updateStars();
	animationFrame = requestAnimationFrame(loop);
};

onMounted(() => {
	if (!canvas.value) return;
	context = canvas.value.getContext('2d');
	resizeCanvas();
	seedStars();
	window.addEventListener('resize', resizeCanvas);
	loop();
});

onBeforeUnmount(() => {
	cancelAnimationFrame(animationFrame);
	window.removeEventListener('resize', resizeCanvas);
});
</script>

<template>
	<div class="sky-canvas">
		<canvas ref="canvas" aria-hidden="true" />
		<div class="sky-canvas__content">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.sky-canvas {
	position: relative;
	min-height: 100vh;
	background: #000;
}

.sky-canvas canvas {
	position: fixed;
	inset: 0;
	z-index: 0;
	width: 100vw;
	height: 100vh;
	pointer-events: none;
}

.sky-canvas__content {
	position: relative;
	z-index: 1;
	min-height: 100vh;
}
</style>
