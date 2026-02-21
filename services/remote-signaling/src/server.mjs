import crypto from 'node:crypto';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const SIGNAL_PORT = Number.parseInt(process.env.SIGNAL_PORT ?? '8787', 10);
const SIGNAL_HOST = process.env.SIGNAL_HOST ?? '0.0.0.0';

const clients = new Map();
const rooms = new Map();

function sendToClient(clientId, payload) {
	const client = clients.get(clientId);
	if (!client || client.ws.readyState !== 1) return;
	client.ws.send(JSON.stringify(payload));
}

function sendToMany(clientIds, payload) {
	for (const clientId of clientIds) {
		sendToClient(clientId, payload);
	}
}

function ensureRoom(roomId) {
	if (rooms.has(roomId)) {
		return rooms.get(roomId);
	}
	const room = {
		hostId: null,
		viewers: new Set()
	};
	rooms.set(roomId, room);
	return room;
}

function safeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function handleJoin(clientId, message) {
	const client = clients.get(clientId);
	if (!client) return;
	const roomId = safeString(message.roomId);
	const role =
		message.role === 'host'
			? 'host'
			: message.role === 'viewer'
				? 'viewer'
				: '';

	if (!roomId || !role) {
		sendToClient(clientId, {
			type: 'error',
			message: 'roomId and role are required.'
		});
		return;
	}

	if (client.roomId) {
		leaveRoom(clientId);
	}

	const room = ensureRoom(roomId);
	client.roomId = roomId;
	client.role = role;

	if (role === 'host') {
		if (room.hostId && room.hostId !== clientId) {
			sendToClient(room.hostId, {
				type: 'error',
				message: 'Host replaced by a newer session.'
			});
			leaveRoom(room.hostId);
		}
		room.hostId = clientId;
		sendToClient(clientId, {
			type: 'joined',
			roomId,
			clientId,
			role,
			viewerIds: [...room.viewers]
		});
		sendToMany([...room.viewers], {
			type: 'host-online',
			roomId,
			hostId: clientId
		});
		return;
	}

	room.viewers.add(clientId);
	sendToClient(clientId, {
		type: 'joined',
		roomId,
		clientId,
		role,
		hostId: room.hostId
	});

	if (room.hostId) {
		sendToClient(room.hostId, {
			type: 'viewer-joined',
			roomId,
			viewerId: clientId
		});
	}
}

function handleRelay(clientId, message, expectedType) {
	const source = clients.get(clientId);
	if (!source || !source.roomId) {
		sendToClient(clientId, {
			type: 'error',
			message: 'Join a room first.'
		});
		return;
	}
	const targetId = safeString(message.targetId);
	if (!targetId) {
		sendToClient(clientId, {
			type: 'error',
			message: 'targetId is required.'
		});
		return;
	}
	const target = clients.get(targetId);
	if (!target || target.roomId !== source.roomId) {
		sendToClient(clientId, {
			type: 'error',
			message: 'Target is unavailable.'
		});
		return;
	}

	const payload = {
		...message,
		type: expectedType,
		fromId: clientId
	};
	delete payload.targetId;
	sendToClient(targetId, payload);
}

function leaveRoom(clientId) {
	const client = clients.get(clientId);
	if (!client || !client.roomId) return;

	const room = rooms.get(client.roomId);
	if (!room) {
		client.roomId = null;
		client.role = null;
		return;
	}

	if (client.role === 'host' && room.hostId === clientId) {
		room.hostId = null;
		sendToMany([...room.viewers], {
			type: 'host-offline',
			roomId: client.roomId
		});
	} else if (client.role === 'viewer') {
		room.viewers.delete(clientId);
		if (room.hostId) {
			sendToClient(room.hostId, {
				type: 'viewer-left',
				roomId: client.roomId,
				viewerId: clientId
			});
		}
	}

	if (!room.hostId && room.viewers.size === 0) {
		rooms.delete(client.roomId);
	}

	client.roomId = null;
	client.role = null;
}

function handleMessage(clientId, raw) {
	let message;
	try {
		message = JSON.parse(raw.toString());
	} catch {
		sendToClient(clientId, {
			type: 'error',
			message: 'Invalid JSON payload.'
		});
		return;
	}

	const type = safeString(message.type);
	switch (type) {
		case 'join':
			handleJoin(clientId, message);
			break;
		case 'offer':
		case 'answer':
		case 'ice-candidate':
		case 'input':
			handleRelay(clientId, message, type);
			break;
		case 'leave':
			leaveRoom(clientId);
			break;
		default:
			sendToClient(clientId, {
				type: 'error',
				message: `Unsupported message type: ${type}`
			});
			break;
	}
}

const server = http.createServer((req, res) => {
	if (req.url?.startsWith('/health')) {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(
			JSON.stringify({
				ok: true,
				rooms: rooms.size,
				clients: clients.size
			})
		);
		return;
	}
	res.writeHead(404, { 'content-type': 'application/json' });
	res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
	const clientId = crypto.randomUUID();
	clients.set(clientId, {
		ws,
		role: null,
		roomId: null
	});

	sendToClient(clientId, {
		type: 'hello',
		clientId
	});

	ws.on('message', (raw) => {
		handleMessage(clientId, raw);
	});

	ws.on('close', () => {
		leaveRoom(clientId);
		clients.delete(clientId);
	});
});

server.on('upgrade', (req, socket, head) => {
	if (req.url !== '/ws') {
		socket.destroy();
		return;
	}
	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit('connection', ws, req);
	});
});

server.listen(SIGNAL_PORT, SIGNAL_HOST, () => {
	console.log(
		`remote-signaling listening on ws://${SIGNAL_HOST}:${SIGNAL_PORT}/ws`
	);
});
