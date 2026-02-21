<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();

function listItemNumber(index: string | number) {
	return Number(index) + 1;
}
</script>

<template>
	<article role="tabpanel" :hidden="shell.activeTab !== 'about'">
		<fieldset>
			<legend>Profile</legend>
			<p>
				okami / she-her / full-stack engineer.
				<br />personal website
			</p>
		</fieldset>

		<fieldset>
			<legend>Current Focus</legend>
			<ul class="tree-view">
				<li>Developing this website!</li>
				<li>Working on a dissociation symptoms tracker app!</li>
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
					:alt="`Badge ${listItemNumber(index)}`"
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
					:alt="`Stamp ${listItemNumber(index)}`"
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
