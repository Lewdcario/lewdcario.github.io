<script setup lang="ts">
import JumpscareWarning from './JumpscareWarning.vue';
import SocialIcon from './SocialIcon.vue';
</script>

<template>
	<section class="portfolio-header" aria-label="Portfolio introduction">
		<img
			class="portfolio-header__avatar"
			src="/icon.webp"
			alt="Avatar"
			width="160"
			height="160"
		/>
		<JumpscareWarning text="Okami.">
			<template #revealed>
				<p>She/Her</p>
			</template>
		</JumpscareWarning>
		<p>
			Hi, I'm known by my online alias Okami. I am a full-stack software
			engineer.
		</p>
		<p class="portfolio-header__socials">
			<SocialIcon
				social="twitter"
				title="Twitter"
				link="https://twitter.com/okamicario"
			/>
			<SocialIcon
				social="github"
				title="Github"
				link="https://github.com/Lewdcario"
			/>
		</p>
	</section>
</template>

<style scoped>
.portfolio-header {
	display: block;
}

.portfolio-header__avatar {
	display: block;
	width: 10rem;
	height: 10rem;
	margin: 0 auto 0.75rem;
	border: 1px solid var(--color-border-hover, rgba(60, 60, 60, 0.29));
	border-radius: 999px;
	object-fit: cover;
}

.portfolio-header p {
	max-width: 38rem;
	margin: 1rem auto;
}

.portfolio-header__socials {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 2rem;
}
</style>
