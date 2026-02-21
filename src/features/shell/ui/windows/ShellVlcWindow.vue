<script setup lang="ts">
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame
		window-id="vlc"
		title="VLC media player"
		:icon="shellIcons.vlc"
		icon-alt="vlc icon"
		window-class="vlc-window"
		body-class="vlc-window-body"
	>
		<div class="vlc-menubar" role="menubar" aria-label="VLC menu">
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Media')">Media</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Playback')">Playback</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Audio')">Audio</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Video')">Video</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Subtitle')">Subtitle</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Tools')">Tools</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('View')">View</button>
			<button type="button" class="vlc-menu-item" @click="shell.openVlcMenuItem('Help')">Help</button>
		</div>
		<div v-show="shell.vlcSourcePanelOpen" class="vlc-source-panel">
			<form class="vlc-source-form" @submit.prevent="shell.loadVlcPlaylist">
				<input
					id="vlc-playlist-input"
					v-model="shell.vlcPlaylistInput"
					type="text"
					autocomplete="off"
					placeholder="Paste YouTube playlist link or ID"
				/>
				<button type="submit">Open</button>
				<label class="vlc-ui-toggle" for="vlc-hide-youtube-controls">
					<input
						id="vlc-hide-youtube-controls"
						v-model="shell.vlcHideYoutubeControls"
						type="checkbox"
						@change="shell.handleVlcUiToggle"
					/>
					Hide YouTube UI
				</label>
			</form>
			<p v-if="shell.vlcError" class="vlc-error">{{ shell.vlcError }}</p>
		</div>
		<div class="vlc-content">
			<iframe
				:ref="shell.vlcFrameRef"
				class="vlc-frame"
				:src="shell.vlcEmbedUrl"
				title="VLC playlist player"
				loading="lazy"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
				@load="shell.handleVlcFrameLoad"
			></iframe>
		</div>
		<div class="vlc-bottom">
			<div class="vlc-seek-row">
				<span class="vlc-time">{{ shell.vlcCurrentTimeLabel }}</span>
				<input class="vlc-timeline" type="range" min="0" max="100" step="0.1" :value="shell.vlcProgressPercent" @input="shell.seekVlcTimeline" />
				<span class="vlc-time">{{ shell.vlcDurationLabel }}</span>
			</div>
			<div class="vlc-controls" role="toolbar" aria-label="VLC controls">
				<div class="vlc-controls-left">
					<button type="button" class="vlc-control-button" aria-label="Previous track" @click="shell.previousVlcTrack">|&lt;&lt;</button>
					<button type="button" class="vlc-control-button" aria-label="Play" @click="shell.playVlc">&gt;</button>
					<button type="button" class="vlc-control-button" aria-label="Pause" @click="shell.pauseVlc">||</button>
					<button type="button" class="vlc-control-button" aria-label="Stop" @click="shell.stopVlc">[]</button>
					<button type="button" class="vlc-control-button" aria-label="Next track" @click="shell.nextVlcTrack">&gt;&gt;|</button>
					<button type="button" class="vlc-control-button" aria-label="Playlist" @click="shell.pushStatus('Playlist view is not available in this build.')">List</button>
					<button type="button" class="vlc-control-button" aria-label="Loop" @click="shell.pushStatus('Loop toggle is not available in this build.')">Loop</button>
				</div>
				<div class="vlc-controls-right">
					<button type="button" class="vlc-control-button vlc-mute-button" aria-label="Mute" @click="shell.toggleVlcMute">
						{{ shell.vlcMuted ? 'Muted' : 'Mute' }}
					</button>
					<label class="vlc-volume-wrap" for="vlc-volume-slider">
						<input id="vlc-volume-slider" type="range" min="0" max="100" :value="shell.vlcVolume" @input="shell.setVlcVolume" />
						<span class="vlc-volume-value">{{ shell.vlcVolume }}%</span>
					</label>
				</div>
			</div>
		</div>
	</ShellWindowFrame>
</template>
