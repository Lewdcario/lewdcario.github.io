<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
	text: string;
}>();

const hidden = ref(true);
const warningVisible = ref(false);
const hoverEnabled = ref(true);
let revealTimer: ReturnType<typeof setTimeout> | undefined;

const startHover = () => {
	if (!hoverEnabled.value) return;
	warningVisible.value = true;
	revealTimer = setTimeout(() => {
		if (warningVisible.value) {
			hidden.value = false;
			warningVisible.value = false;
			hoverEnabled.value = false;
		}
	}, 2000);
};

const resetHover = () => {
	if (!hoverEnabled.value) return;
	if (revealTimer) {
		clearTimeout(revealTimer);
	}
	warningVisible.value = false;
	hidden.value = true;
};
</script>

<template>
	<div class="jumpscare-warning">
		<textarea
			readonly
			rows="1"
			cols="7"
			:value="text"
			@mouseover="startHover"
			@mouseleave="resetHover"
			@focus="startHover"
			@blur="resetHover"
		/>
		<slot v-if="!hidden" name="revealed" />
		<div
			v-show="warningVisible"
			class="warning-text opacity-75"
			role="status"
		>
			Pronoun Jumpscare Warning!
		</div>
	</div>
</template>

<style scoped>
.jumpscare-warning {
	position: relative;
}

.jumpscare-warning textarea {
	width: 7ch;
	height: 1.25em;
	overflow: hidden;
	font-size: 4rem;
	resize: none;
}

.warning-text {
	position: absolute;
	top: -1.5rem;
	left: 50%;
	transform: translateX(-50%);
	width: max-content;
	max-width: 80vw;
	padding: 0.4rem 0.65rem;
	border: 1px solid rgba(180, 35, 50, 0.6);
	background: rgba(180, 35, 50, 0.75);
	color: #fff;
	font-size: 0.9rem;
	font-weight: 700;
	transition: opacity 0.3s ease;
}

.opacity-75 {
	opacity: 0.75;
}
</style>
