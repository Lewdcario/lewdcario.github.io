<script setup lang="ts">
import { desktopIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();

type GlitchStrip = {
	variant: number;
	style: Record<string, string>;
};

function hashSeed(value: string) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function lcg(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 0xffffffff;
	};
}

function randomInt(next: () => number, min: number, max: number) {
	return Math.floor(next() * (max - min + 1)) + min;
}

function randomSigned(next: () => number, maxAbs: number) {
	const sign = next() < 0.5 ? -1 : 1;
	return sign * randomInt(next, 1, maxAbs);
}

function buildIconGlitchStrips(iconId: string): GlitchStrip[] {
	const next = lcg(hashSeed(`missingno-glitch-${iconId}`));
	const strips: GlitchStrip[] = [];
	const totalHeight = 32;
	let offsetY = 0;

	while (offsetY < totalHeight) {
		const remaining = totalHeight - offsetY;
		const height = Math.min(remaining, randomInt(next, 3, 7));
		const variant = randomInt(next, 1, 6);
		const strip: GlitchStrip = {
			variant,
			style: {
				'--strip-top': `${offsetY}px`,
				'--strip-height': `${height}px`,
				'--strip-bg-pos-y': `-${offsetY}px`,
				'--glitch-x-1': `${randomSigned(next, 6)}px`,
				'--glitch-x-2': `${randomSigned(next, 8)}px`,
				'--glitch-hue-1': `${randomSigned(next, 36)}deg`,
				'--glitch-hue-2': `${randomSigned(next, 32)}deg`,
				'--strip-duration': `${randomInt(next, 520, 980)}ms`,
				'--strip-delay': `${randomInt(next, 0, 240)}ms`,
				'--strip-opacity': `${(0.44 + next() * 0.36).toFixed(2)}`
			}
		};
		strips.push(strip);
		offsetY += height;
	}

	return strips;
}

const glitchStripsByIcon = Object.fromEntries(
	desktopIcons.map((icon) => [icon.id, buildIconGlitchStrips(icon.id)])
) as Record<string, GlitchStrip[]>;
</script>

<template>
	<div
		class="desktop-icons"
		:class="{ 'desktop-icons--glitching': shell.missingnoCrashPhase === 'desktop' }"
	>
		<a
			v-for="icon in desktopIcons"
			:key="icon.label"
			:href="icon.href ?? '#'"
			class="desktop-icon"
			:class="{ 'desktop-icon--glitching': shell.missingnoCrashPhase === 'desktop' }"
			:data-icon-id="icon.id"
			:style="{
				...shell.iconStyle(icon),
				'--desktop-icon-image': `url(${icon.icon})`
			}"
			draggable="false"
			@dragstart.prevent
			@pointerdown.prevent="shell.startIconDrag(icon, $event)"
			@click="shell.handleDesktopIconClick(icon, $event)"
		>
			<img
				:src="icon.icon"
				:alt="icon.label"
				width="32"
				height="32"
				draggable="false"
				@dragstart.prevent
			/>
			<span class="desktop-icon-glitch-strips" aria-hidden="true">
				<span
					v-for="(strip, index) in glitchStripsByIcon[icon.id] ?? []"
					:key="`${icon.id}-strip-${index}`"
					class="desktop-icon-strip"
					:class="`desktop-icon-strip--v${strip.variant}`"
					:style="strip.style"
				/>
			</span>
			<p>{{ icon.label }}</p>
		</a>
	</div>
</template>
