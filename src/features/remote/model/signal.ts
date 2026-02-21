export type RemoteConnectionState =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'error';

export type RemoteSignalRole = 'host' | 'viewer';

export interface RemoteSignalMessage {
	type: string;
	roomId?: string;
	role?: RemoteSignalRole;
	clientId?: string;
	hostId?: string;
	fromId?: string;
	targetId?: string;
	viewerId?: string;
	viewerIds?: string[];
	sdp?: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
	message?: string;
	event?: Record<string, unknown>;
}

export function inferSignalWebSocketUrl() {
	if (typeof window === 'undefined') {
		return 'ws://localhost:8787/ws';
	}
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${window.location.host}/signal/ws`;
}

export function normalizeSessionDescription(raw?: RTCSessionDescriptionInit) {
	if (!raw || typeof raw !== 'object') return null;
	if (
		raw.type !== 'offer' &&
		raw.type !== 'answer' &&
		raw.type !== 'pranswer' &&
		raw.type !== 'rollback'
	) {
		return null;
	}
	if (typeof raw.sdp !== 'string') return null;
	return { type: raw.type, sdp: raw.sdp } satisfies RTCSessionDescriptionInit;
}
