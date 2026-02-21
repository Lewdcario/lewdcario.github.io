<script setup lang="ts">
import { useRemoteHostController } from '~/src/features/remote/model/useRemoteHostController';

const {
	roomId,
	signalingUrl,
	connectionState,
	connectionMessage,
	sharingActive,
	connectedViewerCount,
	recentInputs,
	logs,
	previewVideoRef,
	canConnect,
	canDisconnect,
	canStartSharing,
	canStopSharing,
	connectHost,
	disconnectHost,
	startSharing,
	stopSharing
} = useRemoteHostController();
</script>

<template>
	<main class="remote-host-root">
		<section class="remote-host-card">
			<header class="remote-host-header">
				<h1>Remote Host Agent</h1>
				<p>Share this machine to connected viewers.</p>
			</header>

			<section class="remote-host-toolbar">
				<label>
					Signal WS
					<input
						v-model="signalingUrl"
						type="text"
						spellcheck="false"
					/>
				</label>
				<label>
					Room
					<input v-model="roomId" type="text" spellcheck="false" />
				</label>
				<div class="remote-host-actions">
					<button :disabled="!canConnect" @click="connectHost">
						Connect
					</button>
					<button :disabled="!canDisconnect" @click="disconnectHost">
						Disconnect
					</button>
				</div>
			</section>

			<section class="remote-host-status" :data-state="connectionState">
				<strong>Status:</strong>
				<span>{{ connectionMessage }}</span>
				<span class="remote-host-pill">
					Viewers {{ connectedViewerCount }}
				</span>
				<div class="remote-host-share-buttons">
					<button :disabled="!canStartSharing" @click="startSharing">
						Start sharing
					</button>
					<button :disabled="!canStopSharing" @click="stopSharing">
						Stop sharing
					</button>
				</div>
			</section>

			<section class="remote-host-preview">
				<video ref="previewVideoRef" autoplay playsinline muted></video>
				<div v-if="!sharingActive" class="remote-host-preview-overlay">
					Select <strong>Start sharing</strong> to capture a display
					or app window.
				</div>
			</section>

			<section class="remote-host-grid">
				<article>
					<h2>Input Backchannel</h2>
					<ul class="remote-host-log-list">
						<li v-for="entry in recentInputs" :key="entry">
							{{ entry }}
						</li>
					</ul>
				</article>
				<article>
					<h2>Session Log</h2>
					<ul class="remote-host-log-list">
						<li v-for="entry in logs" :key="entry">{{ entry }}</li>
					</ul>
				</article>
			</section>
		</section>
	</main>
</template>

<style scoped>
.remote-host-root {
	min-height: 100vh;
	padding: 24px;
	background: radial-gradient(
		circle at 20% 20%,
		#4c83d8 0%,
		#2051a3 50%,
		#173c78 100%
	);
	font-family: 'Tahoma', 'MS Sans Serif', sans-serif;
	color: #121212;
}

.remote-host-card {
	max-width: 1080px;
	margin: 0 auto;
	background: #ece9d8;
	border: 1px solid #365687;
	box-shadow:
		0 0 0 1px #ffffff inset,
		0 10px 24px rgba(4, 12, 24, 0.35);
	padding: 12px;
	display: grid;
	gap: 10px;
}

.remote-host-header h1 {
	margin: 0;
	font-size: 28px;
}

.remote-host-header p {
	margin: 4px 0 0;
	color: #2a3d5e;
}

.remote-host-toolbar {
	display: grid;
	grid-template-columns: minmax(220px, 1fr) 220px auto;
	gap: 8px;
}

.remote-host-toolbar label {
	display: grid;
	gap: 4px;
	font-size: 11px;
	font-weight: 700;
}

.remote-host-toolbar input {
	height: 28px;
	border: 1px solid #7f9db9;
	padding: 0 8px;
	font:
		13px 'Tahoma',
		'MS Sans Serif',
		sans-serif;
}

.remote-host-actions {
	display: flex;
	gap: 8px;
	align-items: end;
}

.remote-host-actions button,
.remote-host-share-buttons button {
	min-width: 110px;
	height: 30px;
}

.remote-host-status {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	padding: 8px;
	border: 1px solid #7f9db9;
	background: #dce8fb;
}

.remote-host-pill {
	padding: 2px 8px;
	background: #f7fbff;
	border: 1px solid #7f9db9;
}

.remote-host-share-buttons {
	margin-left: auto;
	display: flex;
	gap: 8px;
}

.remote-host-preview {
	position: relative;
	min-height: 320px;
	border: 1px solid #5b739a;
	background: #121923;
}

.remote-host-preview video {
	width: 100%;
	height: 100%;
	display: block;
	object-fit: contain;
	background: #0d0d0d;
}

.remote-host-preview-overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-content: center;
	text-align: center;
	font-size: 14px;
	color: #e7f0ff;
	background: rgba(8, 15, 25, 0.7);
}

.remote-host-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}

.remote-host-grid article {
	border: 1px solid #7f9db9;
	background: #f8fbff;
	padding: 8px;
	display: grid;
	gap: 6px;
}

.remote-host-grid h2 {
	margin: 0;
	font-size: 14px;
}

.remote-host-log-list {
	margin: 0;
	padding: 0;
	list-style: none;
	max-height: 140px;
	overflow: auto;
	font:
		11px 'Consolas',
		'Courier New',
		monospace;
}

.remote-host-log-list li + li {
	margin-top: 2px;
}

@media (max-width: 900px) {
	.remote-host-root {
		padding: 10px;
	}

	.remote-host-toolbar {
		grid-template-columns: 1fr;
	}

	.remote-host-share-buttons {
		margin-left: 0;
	}

	.remote-host-grid {
		grid-template-columns: 1fr;
	}
}
</style>
