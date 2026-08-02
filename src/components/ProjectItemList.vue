<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import projects, { type PortfolioProject } from '../data/projects';
import ProjectItem from './ProjectItem.vue';

const props = withDefaults(
	defineProps<{
		items?: PortfolioProject[];
	}>(),
	{
		items: () => projects
	}
);

const visibleItems = computed(() => props.items);
const listRoot = ref<HTMLElement | null>(null);

const updateZoom = () => {
	if (!listRoot.value) return;

	const center = window.innerHeight / 2;
	const items = Array.from(
		listRoot.value.querySelectorAll<HTMLElement>('.portfolio-project-item')
	);

	items.forEach((item) => {
		const rect = item.getBoundingClientRect();
		const isCenter = rect.top < center && rect.bottom > center;

		item.classList.toggle('zoom', isCenter);
	});
};

onMounted(() => {
	updateZoom();
	window.addEventListener('scroll', updateZoom, { passive: true });
	window.addEventListener('resize', updateZoom, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('scroll', updateZoom);
	window.removeEventListener('resize', updateZoom);
});
</script>

<template>
	<div ref="listRoot" class="project-list">
		<ul>
			<li
				v-for="item in visibleItems"
				:key="item.title"
				class="portfolio-project-item"
			>
				<ProjectItem
					:alt="item.alt"
					:title="item.title"
					:description="item.description"
					:image="item.image"
					:link="item.link"
					:timeframe="item.timeframe"
				/>
			</li>
		</ul>
	</div>
</template>

<style scoped>
.project-list {
	margin: 0 auto;
}

.project-list ul {
	margin: 0;
	padding: 0;
	list-style: none;
}

.portfolio-project-item {
	width: min(100%, 24rem);
	margin: 0 auto 2.5rem;
	padding: 1rem 0;
	transition: all 0.2s;
	transform: scale(1);
}

.portfolio-project-item:hover,
.portfolio-project-item.zoom {
	transform: scale(1.1);
}
</style>
