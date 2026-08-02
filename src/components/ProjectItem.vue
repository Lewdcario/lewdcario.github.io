<script setup lang="ts">
import { computed } from 'vue';
import type { PortfolioProject } from '~/src/data/projects';

const props = defineProps<PortfolioProject>();

const compactProjectIcons = new Set([
	'neburose',
	'constellations',
	'did-awareness',
	'neburose-home',
	'kudosleague'
]);

const projectImageClass = computed(() =>
	compactProjectIcons.has(props.alt) ? 'project-card__image--compact' : ''
);
</script>

<template>
	<article class="project-card">
		<a
			class="project-card__link"
			rel="noreferrer"
			:href="link"
			target="_blank"
			:aria-label="title"
		>
			<img
				class="project-card__image"
				:class="projectImageClass"
				:alt="title"
				:src="image"
			/>
			<div class="project-card__body">
				<h3 class="project-card__title">
					{{ title }}
				</h3>
				<p>
					<small>
						{{ timeframe }}
					</small>
				</p>
				<h5 class="project-card__description">
					{{ description }}
				</h5>
			</div>
		</a>
	</article>
</template>

<style scoped>
.project-card {
	max-width: 20rem;
	margin: 0 auto 0.5rem;
	border: 0;
	background: rgba(255, 255, 255, 0.82);
	background: transparent;
	color: inherit;
}

.project-card__link {
	display: block;
	color: inherit;
	text-decoration: none;
}

.project-card__image {
	display: block;
	width: 100%;
	height: auto;
	margin: 0 auto;
	object-fit: contain;
}

.project-card__image--compact {
	width: 25%;
	max-width: 5.25rem;
}

.project-card__body {
	text-align: center;
}

.project-card__title {
	margin: 0.75rem 0 0.35rem;
	font-size: 1.35rem;
}

.project-card__description {
	margin: 0;
	font-size: 1.1rem;
	font-weight: 500;
}
</style>
