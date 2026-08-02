<script setup lang="ts">
import { computed, type Component } from 'vue';
import facebookLogo from './icons/FacebookIcon.vue';
import githubLogo from './icons/GithubIcon.vue';
import linkedinLogo from './icons/LinkedInIcon.vue';
import twitchLogo from './icons/TwitchIcon.vue';
import twitterLogo from './icons/TwitterIcon.vue';
import youtubeLogo from './icons/YoutubeIcon.vue';

const props = defineProps<{
	social: string;
	title: string;
	link: string;
}>();

const logos: Record<string, Component> = {
	twitch: twitchLogo,
	twitter: twitterLogo,
	facebook: facebookLogo,
	youtube: youtubeLogo,
	github: githubLogo,
	linkedin: linkedinLogo
};

const logo = computed(() => logos[props.social.toLowerCase()]);
</script>

<template>
	<span class="social-icon">
		<a
			:href="link"
			target="_blank"
			rel="noreferrer"
			class="social-icon__link"
			:aria-label="title"
		>
			<component :is="logo" v-if="logo" class="social-icon__glyph" />
		</a>
	</span>
</template>

<style scoped>
.social-icon {
	display: inline-block;
	color: var(--color-text, #587ea3);
	text-align: center;
}

.social-icon__link {
	display: inline-block;
	margin: 1.5rem 3rem 0.5rem;
	color: currentColor;
	transition: transform 0.2s ease;
}

.social-icon__link:hover {
	transform: scale(1.1);
}

.social-icon__glyph {
	width: 2rem;
	height: 2rem;
}
</style>
