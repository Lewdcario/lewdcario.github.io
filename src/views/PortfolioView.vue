<script setup lang="ts">
import FooterSection from '../components/FooterSection.vue';
import HeaderSection from '../components/HeaderSection.vue';
import ProjectItemList from '../components/ProjectItemList.vue';
import SkyCanvas from '../components/SkyCanvas.vue';
</script>

<template>
	<SkyCanvas>
		<main class="portfolio-page">
			<div class="portfolio-page__content">
				<section class="portfolio-page__row">
					<HeaderSection />
				</section>
				<section
					class="portfolio-page__row"
					aria-labelledby="portfolio-projects-title"
				>
					<h1 id="portfolio-projects-title">Projects</h1>
				</section>
				<section class="portfolio-page__row">
					<ProjectItemList />
				</section>
				<section class="portfolio-page__row">
					<FooterSection />
				</section>
			</div>
		</main>
	</SkyCanvas>
</template>

<style scoped>
.portfolio-page {
	--vt-c-white: #ffffff;
	--vt-c-white-soft: #f8f8f8;
	--vt-c-white-mute: #f2f2f2;
	--vt-c-black: #2c2d39;
	--vt-c-black-soft: #222222;
	--vt-c-black-mute: #282828;
	--vt-c-indigo: #587ea3;
	--vt-c-divider-light-1: rgba(60, 60, 60, 0.29);
	--vt-c-divider-light-2: rgba(60, 60, 60, 0.12);
	--vt-c-divider-dark-1: rgba(84, 84, 84, 0.65);
	--vt-c-divider-dark-2: rgba(84, 84, 84, 0.48);
	--vt-c-text-light-1: var(--vt-c-indigo);
	--vt-c-text-light-2: rgba(60, 60, 60, 0.66);
	--vt-c-text-dark-1: var(--vt-c-white);
	--vt-c-text-dark-2: rgba(255, 255, 255, 0.854);
	--color-background: var(--vt-c-white);
	--color-background-soft: var(--vt-c-white-soft);
	--color-background-mute: var(--vt-c-white-mute);
	--color-border: var(--vt-c-divider-light-2);
	--color-border-hover: var(--vt-c-divider-light-1);
	--color-heading: var(--vt-c-text-light-1);
	--color-text: var(--vt-c-text-light-1);

	min-height: 100vh;
	padding: 2rem 1rem;
	background: transparent;
	color: var(--color-text);
	font-family:
		Inter,
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		Roboto,
		Oxygen,
		Ubuntu,
		Cantarell,
		'Fira Sans',
		'Droid Sans',
		'Helvetica Neue',
		sans-serif;
	font-size: 15px;
	line-height: 1.6;
	text-align: center;
	text-rendering: optimizeLegibility;
	transition:
		color 0.5s,
		background-color 0.5s;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.portfolio-page__content {
	width: min(100%, 74rem);
	margin: 0 auto;
}

.portfolio-page__row {
	margin-bottom: 3rem;
}

.portfolio-page h1 {
	margin: 0;
	color: var(--color-heading);
	font-size: 2rem;
	line-height: 1.2;
}

.portfolio-page a {
	color: inherit;
	text-decoration: none;
}

.portfolio-page ul {
	padding: 0;
	list-style: none;
}

.portfolio-page :deep(textarea) {
	color: var(--color-text) !important;
	border-style: none;
	background-color: transparent !important;
	white-space: normal;
	text-align: justify;
	-moz-text-align-last: center;
	text-align-last: center;
}

.portfolio-page::-webkit-scrollbar {
	display: none;
}

@media (prefers-color-scheme: dark) {
	.portfolio-page {
		--color-background: var(--vt-c-black);
		--color-background-soft: var(--vt-c-black-soft);
		--color-background-mute: var(--vt-c-black-mute);
		--color-border: var(--vt-c-divider-dark-2);
		--color-border-hover: var(--vt-c-divider-dark-1);
		--color-heading: var(--vt-c-text-dark-1);
		--color-text: var(--vt-c-text-dark-2);
	}
}
</style>
