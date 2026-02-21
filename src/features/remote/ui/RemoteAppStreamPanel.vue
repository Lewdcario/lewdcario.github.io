<script setup lang="ts">
import { useRemoteViewerController } from '~/src/features/remote/model/useRemoteViewerController';

const {
	roomId,
	signalingUrl,
	connectionState,
	connectionMessage,
	hostPresent,
	inputEnabled,
	logs,
	remoteVideoRef,
	inputSurfaceRef,
	canConnect,
	canDisconnect,
	connectViewer,
	disconnectViewer,
	handlePointerDown,
	handlePointerMove,
	handlePointerUp,
	handleWheel,
	handleKeyDown,
	handleKeyUp
} = useRemoteViewerController();
</script>

<template>
	<div class="remote-stream-panel">
		<section class="remote-stream-toolbar">
			<label>
				Signal WS
				<input v-model="signalingUrl" type="text" spellcheck="false" />
			</label>
			<label>
				Room
				<input v-model="roomId" type="text" spellcheck="false" />
			</label>
			<div class="remote-stream-actions">
				<button :disabled="!canConnect" @click="connectViewer">
					Connect
				</button>
				<button :disabled="!canDisconnect" @click="disconnectViewer">
					Disconnect
				</button>
			</div>
		</section>

		<section class="remote-stream-status" :data-state="connectionState">
			<strong>Status:</strong>
			<span>{{ connectionMessage }}</span>
			<span class="remote-stream-host" :class="{ online: hostPresent }">
				Host {{ hostPresent ? 'online' : 'offline' }}
			</span>
			<label class="remote-stream-input-toggle">
				<input v-model="inputEnabled" type="checkbox" />
				Forward keyboard and mouse
			</label>
		</section>

		<section
			ref="inputSurfaceRef"
			class="remote-stream-video-wrap"
			tabindex="0"
			@keydown="handleKeyDown"
			@keyup="handleKeyUp"
			@pointerdown="handlePointerDown"
			@pointermove="handlePointerMove"
			@pointerup="handlePointerUp"
			@wheel.prevent="handleWheel"
		>
			<video ref="remoteVideoRef" autoplay playsinline></video>
			<div v-if="!hostPresent" class="remote-stream-overlay">
				<p>No host is connected for this room yet.</p>
				<p>
					Open <code>/remote-host</code> on the source machine and
					start sharing.
				</p>
			</div>
		</section>

		<section class="remote-stream-log">
			<strong>Session Log</strong>
			<ul>
				<li v-for="entry in logs" :key="entry">{{ entry }}</li>
			</ul>
		</section>
	</div>
</template>

<style scoped>
.remote-stream-panel {
	display: grid;
	grid-template-rows: auto auto minmax(220px, 1fr) auto;
	gap: 8px;
	height: 100%;
	padding: 8px;
	background: #ece9d8;
}

.remote-stream-toolbar {
	display: grid;
	grid-template-columns: minmax(180px, 1fr) 180px auto;
	gap: 8px;
	align-items: end;
}

.remote-stream-toolbar label {
	display: grid;
	gap: 4px;
	font-size: 11px;
	font-weight: 700;
	color: #1a2f5e;
}

.remote-stream-toolbar input {
	width: 100%;
	height: 24px;
	border: 1px solid #7a8cae;
	padding: 0 6px;
	font:
		13px 'Tahoma',
		'MS Sans Serif',
		sans-serif;
}

.remote-stream-actions {
	display: flex;
	gap: 6px;
}

.remote-stream-actions button {
	min-width: 90px;
}

.remote-stream-status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	padding: 6px 8px;
	font-size: 11px;
	background: #d7e4f8;
	border: 1px solid #7f9db9;
}

.remote-stream-host {
	padding: 2px 6px;
	border: 1px solid #9e342a;
	background: #f8d7d3;
	color: #7a1c15;
}

.remote-stream-host.online {
	border-color: #2d6a1f;
	background: #d7f4d1;
	color: #1f5414;
}

.remote-stream-input-toggle {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.remote-stream-video-wrap {
	position: relative;
	min-height: 220px;
	background: #11161f;
	border: 1px solid #4f658b;
	outline: none;
}

.remote-stream-video-wrap video {
	width: 100%;
	height: 100%;
	display: block;
	object-fit: contain;
	background: #0d0d0d;
}

.remote-stream-overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-content: center;
	gap: 6px;
	text-align: center;
	background: rgba(9, 14, 22, 0.78);
	color: #f3f7ff;
	font-size: 12px;
}

.remote-stream-overlay code {
	font:
		12px 'Consolas',
		'Courier New',
		monospace;
	background: rgba(255, 255, 255, 0.12);
	padding: 2px 4px;
	border-radius: 2px;
}

.remote-stream-log {
	display: grid;
	gap: 6px;
	border: 1px solid #7f9db9;
	background: #f8fbff;
	padding: 6px;
	max-height: 120px;
}

.remote-stream-log ul {
	margin: 0;
	padding: 0;
	list-style: none;
	max-height: 80px;
	overflow: auto;
	font:
		11px 'Consolas',
		'Courier New',
		monospace;
}

.remote-stream-log li + li {
	margin-top: 2px;
}

@media (max-width: 940px) {
	.remote-stream-toolbar {
		grid-template-columns: 1fr;
	}

	.remote-stream-input-toggle {
		margin-left: 0;
	}
}
</style>
