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

export function useRemoteViewerController() {
	const runtimeConfig = useRuntimeConfig();

	const roomId = ref(runtimeConfig.public.remoteDefaultRoom || 'okami-room');
	const signalingUrl = ref(runtimeConfig.public.remoteSignalWs || '');
	const connectionState = ref<RemoteConnectionState>('idle');
	const connectionMessage = ref('Not connected');
	const hostPresent = ref(false);
	const inputEnabled = ref(true);
	const logs = ref<string[]>([]);
	const remoteVideoRef = ref<HTMLVideoElement | null>(null);
	const inputSurfaceRef = ref<HTMLElement | null>(null);

	let socket: WebSocket | null = null;
	let peer: RTCPeerConnection | null = null;
	let hostId: string | null = null;
	let viewerId: string | null = null;
	let pointerMoveThrottleAt = 0;

	const canConnect = computed(() => connectionState.value !== 'connecting');
	const canDisconnect = computed(() => socket !== null || peer !== null);

	function appendLog(message: string) {
		logs.value = [createLogLine(message), ...logs.value].slice(0, 40);
	}

	function setConnectionState(state: RemoteConnectionState, message: string) {
		connectionState.value = state;
		connectionMessage.value = message;
	}

	function sendSignal(message: RemoteSignalMessage) {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify(message));
	}

	function clearVideoElement() {
		const video = remoteVideoRef.value;
		if (video) {
			video.srcObject = null;
		}
	}

	function cleanupPeer(clearVideo = true) {
		if (peer) {
			peer.ontrack = null;
			peer.onicecandidate = null;
			peer.onconnectionstatechange = null;
			peer.close();
			peer = null;
		}
		if (clearVideo) {
			clearVideoElement();
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

	function ensurePeerConnection() {
		if (peer) return peer;

		peer = new RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
		});

		peer.ontrack = (event) => {
			const stream = event.streams[0];
			if (!stream || !remoteVideoRef.value) return;
			remoteVideoRef.value.srcObject = stream;
			appendLog('Remote media stream attached.');
		};

		peer.onicecandidate = (event) => {
			if (!event.candidate || !hostId) return;
			sendSignal({
				type: 'ice-candidate',
				targetId: hostId,
				candidate: event.candidate.toJSON()
			});
		};

		peer.onconnectionstatechange = () => {
			if (!peer) return;
			if (peer.connectionState === 'connected') {
				setConnectionState('connected', 'Streaming connected');
				appendLog('Peer connection established.');
				return;
			}
			if (
				peer.connectionState === 'disconnected' ||
				peer.connectionState === 'failed' ||
				peer.connectionState === 'closed'
			) {
				setConnectionState('disconnected', 'Stream disconnected');
				appendLog(`Peer state: ${peer.connectionState}`);
			}
		};

		return peer;
	}

	async function handleOffer(message: RemoteSignalMessage) {
		const description = normalizeSessionDescription(message.sdp);
		if (!description) {
			appendLog('Received invalid offer payload.');
			return;
		}

		hostId = message.fromId ?? hostId;
		hostPresent.value = Boolean(hostId);

		const connection = ensurePeerConnection();
		await connection.setRemoteDescription(description);
		const answer = await connection.createAnswer();
		await connection.setLocalDescription(answer);

		if (!hostId || !connection.localDescription) {
			appendLog('Unable to send answer because host was unavailable.');
			return;
		}

		sendSignal({
			type: 'answer',
			targetId: hostId,
			sdp: connection.localDescription.toJSON()
		});
		appendLog('Answer sent to host.');
	}

	async function handleIceCandidate(message: RemoteSignalMessage) {
		if (!peer || !message.candidate) return;
		try {
			await peer.addIceCandidate(message.candidate);
		} catch {
			appendLog('Failed to add ICE candidate.');
		}
	}

	function handleSocketMessage(rawEvent: MessageEvent<string>) {
		let message: RemoteSignalMessage;
		try {
			message = JSON.parse(rawEvent.data) as RemoteSignalMessage;
		} catch {
			appendLog('Received invalid signaling payload.');
			return;
		}

		switch (message.type) {
			case 'joined':
				viewerId = message.clientId ?? null;
				hostId = message.hostId ?? null;
				hostPresent.value = Boolean(hostId);
				setConnectionState(
					'connected',
					hostPresent.value
						? 'Waiting for host offer...'
						: 'Waiting for host...'
				);
				appendLog(
					`Joined room ${message.roomId ?? roomId.value} as viewer.`
				);
				break;
			case 'host-online':
				hostId = message.hostId ?? null;
				hostPresent.value = Boolean(hostId);
				appendLog('Host is online. Waiting for stream offer...');
				break;
			case 'host-offline':
				hostId = null;
				hostPresent.value = false;
				cleanupPeer(false);
				setConnectionState('connected', 'Host disconnected');
				appendLog('Host went offline.');
				break;
			case 'offer':
				void handleOffer(message);
				break;
			case 'ice-candidate':
				void handleIceCandidate(message);
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

	function connectViewer() {
		if (socket) {
			disconnectViewer();
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
				role: 'viewer'
			});
			appendLog('Signaling socket connected.');
		};

		socket.onmessage = (event) => {
			handleSocketMessage(event as MessageEvent<string>);
		};

		socket.onerror = () => {
			setConnectionState('error', 'Signaling connection error');
			appendLog('Signaling socket error.');
		};

		socket.onclose = () => {
			cleanupPeer(false);
			hostPresent.value = false;
			hostId = null;
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

	function disconnectViewer() {
		cleanupPeer(true);
		cleanupSocket();
		hostId = null;
		viewerId = null;
		hostPresent.value = false;
		setConnectionState('idle', 'Not connected');
		appendLog('Viewer disconnected.');
	}

	function normalizePointerPosition(event: PointerEvent | WheelEvent) {
		const surface = inputSurfaceRef.value;
		if (!surface) return null;
		const rect = surface.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;
		const x = Math.min(
			1,
			Math.max(0, (event.clientX - rect.left) / rect.width)
		);
		const y = Math.min(
			1,
			Math.max(0, (event.clientY - rect.top) / rect.height)
		);
		return { x, y };
	}

	function sendInputEvent(event: Record<string, unknown>) {
		if (
			!inputEnabled.value ||
			!socket ||
			socket.readyState !== WebSocket.OPEN ||
			!hostId ||
			!viewerId
		) {
			return;
		}
		sendSignal({
			type: 'input',
			targetId: hostId,
			event
		});
	}

	function handlePointerDown(event: PointerEvent) {
		const position = normalizePointerPosition(event);
		if (!position) return;
		(event.currentTarget as HTMLElement | null)?.focus();
		sendInputEvent({
			kind: 'pointer',
			phase: 'down',
			x: position.x,
			y: position.y,
			button: event.button,
			buttons: event.buttons
		});
	}

	function handlePointerMove(event: PointerEvent) {
		const now = Date.now();
		if (now - pointerMoveThrottleAt < 32) return;
		pointerMoveThrottleAt = now;
		const position = normalizePointerPosition(event);
		if (!position) return;
		sendInputEvent({
			kind: 'pointer',
			phase: 'move',
			x: position.x,
			y: position.y,
			buttons: event.buttons
		});
	}

	function handlePointerUp(event: PointerEvent) {
		const position = normalizePointerPosition(event);
		if (!position) return;
		sendInputEvent({
			kind: 'pointer',
			phase: 'up',
			x: position.x,
			y: position.y,
			button: event.button,
			buttons: event.buttons
		});
	}

	function handleWheel(event: WheelEvent) {
		const position = normalizePointerPosition(event);
		if (!position) return;
		sendInputEvent({
			kind: 'wheel',
			x: position.x,
			y: position.y,
			deltaX: event.deltaX,
			deltaY: event.deltaY
		});
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!inputEnabled.value) return;
		event.preventDefault();
		sendInputEvent({
			kind: 'key',
			phase: 'down',
			key: event.key,
			code: event.code,
			repeat: event.repeat,
			altKey: event.altKey,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
			shiftKey: event.shiftKey
		});
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (!inputEnabled.value) return;
		event.preventDefault();
		sendInputEvent({
			kind: 'key',
			phase: 'up',
			key: event.key,
			code: event.code,
			altKey: event.altKey,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
			shiftKey: event.shiftKey
		});
	}

	onMounted(() => {
		if (!signalingUrl.value.trim()) {
			signalingUrl.value = inferSignalWebSocketUrl();
		}
	});

	onBeforeUnmount(() => {
		disconnectViewer();
	});

	return {
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
	};
}
