import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
	inferSignalWebSocketUrl,
	normalizeSessionDescription,
	type RemoteConnectionState,
	type RemoteSignalMessage
} from '~/src/features/remote/model/signal';

function createLogLine(message: string) {
	const stamp = new Date().toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	return `[${stamp}] ${message}`;
}

export function useRemoteHostController() {
	const runtimeConfig = useRuntimeConfig();
	const roomId = ref(runtimeConfig.public.remoteDefaultRoom || 'okami-room');
	const signalingUrl = ref(runtimeConfig.public.remoteSignalWs || '');
	const connectionState = ref<RemoteConnectionState>('idle');
	const connectionMessage = ref('Not connected');
	const sharingActive = ref(false);
	const connectedViewerCount = ref(0);
	const recentInputs = ref<string[]>([]);
	const logs = ref<string[]>([]);
	const previewVideoRef = ref<HTMLVideoElement | null>(null);

	let socket: WebSocket | null = null;
	let localStream: MediaStream | null = null;
	const viewers = new Set<string>();
	const peers = new Map<string, RTCPeerConnection>();

	const canConnect = computed(() => connectionState.value !== 'connecting');
	const canDisconnect = computed(() => connectionState.value !== 'idle');
	const canStartSharing = computed(
		() => connectionState.value === 'connected' && !sharingActive.value
	);
	const canStopSharing = computed(() => sharingActive.value);

	function appendLog(message: string) {
		logs.value = [createLogLine(message), ...logs.value].slice(0, 60);
	}

	function appendInput(message: string) {
		recentInputs.value = [
			createLogLine(message),
			...recentInputs.value
		].slice(0, 12);
	}

	function updateViewerCount() {
		connectedViewerCount.value = peers.size;
	}

	function setConnectionState(state: RemoteConnectionState, message: string) {
		connectionState.value = state;
		connectionMessage.value = message;
	}

	function sendSignal(message: RemoteSignalMessage) {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify(message));
	}

	function attachPreviewStream(stream: MediaStream | null) {
		if (previewVideoRef.value) {
			previewVideoRef.value.srcObject = stream;
		}
	}

	function cleanupPeer(viewerId: string) {
		const peer = peers.get(viewerId);
		if (!peer) return;
		peer.onicecandidate = null;
		peer.onconnectionstatechange = null;
		peer.close();
		peers.delete(viewerId);
		updateViewerCount();
	}

	function cleanupAllPeers() {
		for (const viewerId of peers.keys()) {
			cleanupPeer(viewerId);
		}
	}

	function cleanupSocket() {
		if (!socket) return;
		socket.onopen = null;
		socket.onclose = null;
		socket.onmessage = null;
		socket.onerror = null;
		socket.close();
		socket = null;
	}

	function stopLocalStream() {
		if (!localStream) return;
		for (const track of localStream.getTracks()) {
			track.stop();
		}
		localStream = null;
		sharingActive.value = false;
		attachPreviewStream(null);
	}

	async function createPeerForViewer(viewerId: string) {
		if (!localStream) return;
		cleanupPeer(viewerId);

		const peer = new RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
		});
		peers.set(viewerId, peer);

		for (const track of localStream.getTracks()) {
			peer.addTrack(track, localStream);
		}

		peer.onicecandidate = (event) => {
			if (!event.candidate) return;
			sendSignal({
				type: 'ice-candidate',
				targetId: viewerId,
				candidate: event.candidate.toJSON()
			});
		};

		peer.onconnectionstatechange = () => {
			if (
				peer.connectionState === 'failed' ||
				peer.connectionState === 'closed' ||
				peer.connectionState === 'disconnected'
			) {
				appendLog(`Viewer ${viewerId} ${peer.connectionState}.`);
				cleanupPeer(viewerId);
			}
			updateViewerCount();
		};

		const offer = await peer.createOffer();
		await peer.setLocalDescription(offer);
		if (peer.localDescription) {
			sendSignal({
				type: 'offer',
				targetId: viewerId,
				sdp: peer.localDescription.toJSON()
			});
			appendLog(`Offer sent to viewer ${viewerId}.`);
		}
		updateViewerCount();
	}

	async function handleAnswer(message: RemoteSignalMessage) {
		const viewerId = message.fromId;
		if (!viewerId) return;
		const peer = peers.get(viewerId);
		if (!peer) return;
		const description = normalizeSessionDescription(message.sdp);
		if (!description) return;
		await peer.setRemoteDescription(description);
	}

	async function handleIceCandidate(message: RemoteSignalMessage) {
		const viewerId = message.fromId;
		if (!viewerId || !message.candidate) return;
		const peer = peers.get(viewerId);
		if (!peer) return;
		try {
			await peer.addIceCandidate(message.candidate);
		} catch {
			appendLog(`Failed to add ICE candidate for ${viewerId}.`);
		}
	}

	function handleInput(message: RemoteSignalMessage) {
		const sourceId = message.fromId || 'viewer';
		const event = message.event ?? {};
		const kind = typeof event.kind === 'string' ? event.kind : 'event';
		appendInput(`${sourceId}: ${kind}`);
	}

	async function handleSocketMessage(rawEvent: MessageEvent<string>) {
		let message: RemoteSignalMessage;
		try {
			message = JSON.parse(rawEvent.data) as RemoteSignalMessage;
		} catch {
			appendLog('Received invalid signaling payload.');
			return;
		}

		switch (message.type) {
			case 'joined': {
				viewers.clear();
				for (const viewerId of message.viewerIds ?? []) {
					viewers.add(viewerId);
				}
				setConnectionState(
					'connected',
					'Host connected to signaling server'
				);
				appendLog(
					`Joined room ${message.roomId ?? roomId.value} as host.`
				);
				if (sharingActive.value) {
					for (const viewerId of viewers) {
						await createPeerForViewer(viewerId);
					}
				}
				break;
			}
			case 'viewer-joined': {
				const viewerId = message.viewerId ?? message.clientId;
				if (!viewerId) return;
				viewers.add(viewerId);
				appendLog(`Viewer connected: ${viewerId}`);
				if (sharingActive.value) {
					await createPeerForViewer(viewerId);
				}
				break;
			}
			case 'viewer-left': {
				const viewerId = message.viewerId ?? message.clientId;
				if (!viewerId) return;
				viewers.delete(viewerId);
				cleanupPeer(viewerId);
				appendLog(`Viewer disconnected: ${viewerId}`);
				break;
			}
			case 'answer':
				await handleAnswer(message);
				break;
			case 'ice-candidate':
				await handleIceCandidate(message);
				break;
			case 'input':
				handleInput(message);
				break;
			case 'error':
				setConnectionState(
					'error',
					message.message || 'Signaling error'
				);
				appendLog(`Server error: ${message.message || 'unknown'}`);
				break;
			default:
				break;
		}
	}

	function connectHost() {
		if (socket) {
			disconnectHost();
		}
		if (!roomId.value.trim()) {
			setConnectionState('error', 'Room ID is required');
			return;
		}
		if (!signalingUrl.value.trim()) {
			signalingUrl.value = inferSignalWebSocketUrl();
		}

		setConnectionState('connecting', 'Connecting to signaling server...');
		socket = new WebSocket(signalingUrl.value.trim());

		socket.onopen = () => {
			sendSignal({
				type: 'join',
				roomId: roomId.value.trim(),
				role: 'host'
			});
			appendLog('Signaling socket connected.');
		};

		socket.onmessage = (event) => {
			void handleSocketMessage(event as MessageEvent<string>);
		};

		socket.onerror = () => {
			setConnectionState('error', 'Signaling connection error');
			appendLog('Signaling socket error.');
		};

		socket.onclose = () => {
			stopSharing();
			cleanupAllPeers();
			viewers.clear();
			if (connectionState.value !== 'idle') {
				setConnectionState(
					'disconnected',
					'Disconnected from signaling server'
				);
			}
			appendLog('Signaling socket closed.');
			socket = null;
		};
	}

	function disconnectHost() {
		stopSharing();
		cleanupAllPeers();
		viewers.clear();
		cleanupSocket();
		setConnectionState('idle', 'Not connected');
		appendLog('Host disconnected.');
	}

	async function startSharing() {
		if (sharingActive.value) return;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			appendLog('Connect to signaling before starting screen share.');
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					frameRate: { ideal: 24, max: 30 }
				},
				audio: false
			});
			localStream = stream;
			attachPreviewStream(stream);
			sharingActive.value = true;
			appendLog('Screen capture started.');

			const [videoTrack] = stream.getVideoTracks();
			if (videoTrack) {
				videoTrack.onended = () => {
					stopSharing();
					appendLog('Screen capture ended by browser.');
				};
			}

			for (const viewerId of viewers) {
				await createPeerForViewer(viewerId);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Unable to capture screen';
			appendLog(message);
		}
	}

	function stopSharing() {
		stopLocalStream();
		cleanupAllPeers();
		updateViewerCount();
	}

	onMounted(() => {
		if (!signalingUrl.value.trim()) {
			signalingUrl.value = inferSignalWebSocketUrl();
		}
	});

	onBeforeUnmount(() => {
		disconnectHost();
	});

	return {
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
	};
}
