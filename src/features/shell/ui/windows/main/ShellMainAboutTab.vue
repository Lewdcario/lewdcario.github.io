<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<article role="tabpanel" :hidden="shell.activeTab !== 'about'">
		<fieldset>
			<legend>Profile</legend>
			<p>
				okami / she-her / full-stack engineer.
				<br />this portfolio shell is a full rewrite with a windows xp navigation feel.
			</p>
		</fieldset>

		<fieldset>
			<legend>Current Focus</legend>
			<ul class="tree-view">
				<li>Building products and interfaces with strong identity.</li>
				<li>Maintaining community and platform projects.</li>
				<li>Shipping interfaces with personality, not template UI.</li>
			</ul>
		</fieldset>

		<fieldset class="blinkie-gallery">
			<legend>Blinkies</legend>
			<p v-if="shell.blinkieLoading" class="blinkie-status">Loading blinkies...</p>
			<p v-else-if="shell.blinkieError" class="blinkie-status blinkie-status-error">{{ shell.blinkieError }}</p>
			<p v-else-if="shell.blinkieBadges.length === 0" class="blinkie-status">No badge set found for this theme folder.</p>
			<div class="blinkie-badge-strip">
				<img
					v-for="(badgeSrc, index) in shell.blinkieBadges"
					:key="badgeSrc"
					:src="badgeSrc"
					:alt="`Badge ${index + 1}`"
					class="blinkie-badge"
					loading="lazy"
					decoding="async"
					width="88"
					height="31"
				/>
			</div>
		</fieldset>

		<fieldset class="blinkie-gallery">
			<legend>Stamps</legend>
			<p v-if="!shell.blinkieLoading && !shell.blinkieError && shell.blinkieStamps.length === 0" class="blinkie-status">
				No stamp set found for this theme folder.
			</p>
			<div class="blinkie-stamp-grid">
				<img
					v-for="(stampSrc, index) in shell.blinkieStamps"
					:key="stampSrc"
					:src="stampSrc"
					:alt="`Stamp ${index + 1}`"
					class="blinkie-stamp"
					loading="lazy"
					decoding="async"
					width="99"
					height="56"
				/>
			</div>
		</fieldset>
	</article>
</template>
