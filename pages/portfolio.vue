<script setup lang="ts">
import { useHead } from '#imports';
import PortfolioView from '~/src/views/PortfolioView.vue';

const description =
	"Okami's engineering portfolio, including Constellations, Kudos League, and community platform work.";

defineOptions({
	name: 'PortfolioPage'
});

useHead({
	htmlAttrs: {
		lang: 'en'
	},
	link: [
		{
			rel: 'canonical',
			href: 'https://okami.codes/portfolio'
		}
	],
	meta: [
		{ name: 'description', content: description },
		{ property: 'og:url', content: 'https://okami.codes/portfolio' },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: "Okami's Portfolio" },
		{ property: 'og:description', content: description },
		{ property: 'og:image', content: 'https://okami.codes/banner.webp' },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ property: 'twitter:domain', content: 'okami.codes' },
		{ property: 'twitter:url', content: 'https://okami.codes/portfolio' },
		{ name: 'twitter:title', content: "Okami's Portfolio" },
		{ name: 'twitter:description', content: description },
		{ name: 'twitter:image', content: 'https://okami.codes/banner.webp' }
	],
	title: "Okami's Portfolio"
});
</script>

<template>
	<PortfolioView />
</template>
