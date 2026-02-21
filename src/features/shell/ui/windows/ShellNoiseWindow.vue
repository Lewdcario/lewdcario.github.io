<script setup lang="ts">
import { noisePresets, shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame
		window-id="noise"
		title="White Noise Generator"
		:icon="shellIcons.noise"
		icon-alt="noise icon"
		window-class="noise-window"
		body-class="noise-window-body"
	>
		<div class="noise-menubar" role="menubar" aria-label="Noise player menu">
			<button type="button" class="noise-menu-item" @click="shell.pushStatus('File menu not implemented.')">File</button>
			<button type="button" class="noise-menu-item" @click="shell.pushStatus('Playback menu not implemented.')">Playback</button>
			<button type="button" class="noise-menu-item" @click="shell.pushStatus('Effects menu not implemented.')">Effects</button>
			<button type="button" class="noise-menu-item" @click="shell.pushStatus('Help menu not implemented.')">Help</button>
		</div>
		<div class="noise-player-shell">
			<div class="noise-lcd">
				<p class="noise-lcd-title">NoiseBox 2002</p>
				<p class="noise-lcd-preset">{{ shell.selectedNoisePreset.label }}</p>
				<p class="noise-lcd-status">{{ shell.noiseIsPlaying ? 'PLAYING' : 'STOPPED' }} • VOL {{ shell.noiseVolume }}%</p>
			</div>
			<div class="noise-control-row" role="toolbar" aria-label="Noise controls">
				<button type="button" class="noise-button" @click="shell.cycleNoisePreset(-1)">|&lt;</button>
				<button type="button" class="noise-button" @click="shell.toggleNoiseGenerator">
					{{ shell.noiseIsPlaying ? 'Stop' : 'Play' }}
				</button>
				<button type="button" class="noise-button" @click="shell.stopNoiseGenerator()">[]</button>
				<button type="button" class="noise-button" @click="shell.cycleNoisePreset(1)">&gt;|</button>
			</div>
			<label class="noise-volume-row" for="noise-volume-slider">
				<span>Intensity</span>
				<input id="noise-volume-slider" type="range" min="0" max="100" :value="shell.noiseVolume" @input="shell.setNoiseVolume" />
				<span>{{ shell.noiseVolume }}%</span>
			</label>
			<div class="noise-preset-list" role="radiogroup" aria-label="Noise presets">
				<button
					v-for="preset in noisePresets"
					:key="preset.id"
					type="button"
					class="noise-preset-item"
					:class="{ active: shell.noisePresetId === preset.id }"
					@click="shell.selectNoisePreset(preset.id)"
				>
					<span class="noise-preset-name">{{ preset.label }}</span>
					<span class="noise-preset-description">{{ preset.description }}</span>
				</button>
			</div>
			<p v-if="shell.noiseError" class="noise-status-error">{{ shell.noiseError }}</p>
		</div>
	</ShellWindowFrame>
</template>
