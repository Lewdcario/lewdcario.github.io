<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { shellIcons } from '~/src/features/shell/constants/shell';
import ShellWindowFrame from './ShellWindowFrame.vue';

interface MinesCell {
	mine: boolean;
	revealed: boolean;
	flagged: boolean;
	exploded: boolean;
	adjacent: number;
}

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 9;
const TOTAL_MINES = 10;
const BOMB_ICON_SRC = '/xp-icons/pack/mines-bomb.png';

const board = ref<MinesCell[][]>([]);
const gameState = ref<'ready' | 'playing' | 'won' | 'lost'>('ready');
const elapsedSeconds = ref(0);
let timerHandle: number | null = null;

const flaggedCount = computed(() =>
	board.value.reduce(
		(total, row) => total + row.reduce((sum, cell) => sum + (cell.flagged ? 1 : 0), 0),
		0
	)
);

const minesLeftCounter = computed(() => formatCounter(TOTAL_MINES - flaggedCount.value));
const timeCounter = computed(() => formatCounter(elapsedSeconds.value));
const faceLabel = computed(() => {
	if (gameState.value === 'won') return 'B)';
	if (gameState.value === 'lost') return 'X(';
	return ':)';
});

function formatCounter(value: number) {
	const normalized = Math.max(-99, Math.min(999, value));
	const sign = normalized < 0 ? '-' : '';
	const absolute = Math.abs(normalized).toString().padStart(3 - sign.length, '0');
	return `${sign}${absolute}`;
}

function stopTimer() {
	if (timerHandle !== null) {
		window.clearInterval(timerHandle);
		timerHandle = null;
	}
}

function startTimer() {
	if (timerHandle !== null) return;
	timerHandle = window.setInterval(() => {
		if (gameState.value !== 'playing') return;
		elapsedSeconds.value = Math.min(999, elapsedSeconds.value + 1);
	}, 1000);
}

function neighbors(x: number, y: number) {
	const coordinates: Array<[number, number]> = [];
	for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
		for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
			if (offsetX === 0 && offsetY === 0) continue;
			const nextX = x + offsetX;
			const nextY = y + offsetY;
			if (nextX < 0 || nextX >= BOARD_WIDTH || nextY < 0 || nextY >= BOARD_HEIGHT) continue;
			coordinates.push([nextX, nextY]);
		}
	}
	return coordinates;
}

function initializeBoard() {
	const nextBoard: MinesCell[][] = Array.from({ length: BOARD_HEIGHT }, () =>
		Array.from({ length: BOARD_WIDTH }, () => ({
			mine: false,
			revealed: false,
			flagged: false,
			exploded: false,
			adjacent: 0
		}))
	);

	let placed = 0;
	while (placed < TOTAL_MINES) {
		const x = Math.floor(Math.random() * BOARD_WIDTH);
		const y = Math.floor(Math.random() * BOARD_HEIGHT);
		const cell = nextBoard[y]?.[x];
		if (!cell || cell.mine) continue;
		cell.mine = true;
		placed += 1;
	}

	for (let y = 0; y < BOARD_HEIGHT; y += 1) {
		for (let x = 0; x < BOARD_WIDTH; x += 1) {
			const cell = nextBoard[y]?.[x];
			if (!cell || cell.mine) continue;
			cell.adjacent = neighbors(x, y).reduce((total, [neighborX, neighborY]) => {
				const neighbor = nextBoard[neighborY]?.[neighborX];
				return total + (neighbor?.mine ? 1 : 0);
			}, 0);
		}
	}

	board.value = nextBoard;
}

function resetGame() {
	stopTimer();
	elapsedSeconds.value = 0;
	gameState.value = 'ready';
	initializeBoard();
}

function revealAllMines(triggerX: number, triggerY: number) {
	for (let y = 0; y < BOARD_HEIGHT; y += 1) {
		for (let x = 0; x < BOARD_WIDTH; x += 1) {
			const cell = board.value[y]?.[x];
			if (!cell) continue;
			if (cell.mine) {
				cell.revealed = true;
			}
			if (x === triggerX && y === triggerY) {
				cell.exploded = true;
			}
		}
	}
}

function floodReveal(startX: number, startY: number) {
	const stack: Array<[number, number]> = [[startX, startY]];

	while (stack.length > 0) {
		const [x, y] = stack.pop() ?? [];
		const cell = board.value[y]?.[x];
		if (!cell || cell.revealed || cell.flagged) continue;
		cell.revealed = true;
		if (cell.mine || cell.adjacent > 0) continue;

		for (const [neighborX, neighborY] of neighbors(x, y)) {
			const neighbor = board.value[neighborY]?.[neighborX];
			if (!neighbor || neighbor.revealed || neighbor.flagged || neighbor.mine) continue;
			stack.push([neighborX, neighborY]);
		}
	}
}

function hasWon() {
	const revealedSafe = board.value.reduce(
		(total, row) => total + row.reduce((sum, cell) => sum + (!cell.mine && cell.revealed ? 1 : 0), 0),
		0
	);
	return revealedSafe === BOARD_WIDTH * BOARD_HEIGHT - TOTAL_MINES;
}

function revealCell(x: number, y: number) {
	if (gameState.value === 'lost' || gameState.value === 'won') return;

	const cell = board.value[y]?.[x];
	if (!cell || cell.revealed || cell.flagged) return;

	if (gameState.value === 'ready') {
		gameState.value = 'playing';
		startTimer();
	}

	if (cell.mine) {
		gameState.value = 'lost';
		revealAllMines(x, y);
		stopTimer();
		return;
	}

	floodReveal(x, y);
	if (hasWon()) {
		gameState.value = 'won';
		stopTimer();
	}
}

function toggleFlag(x: number, y: number) {
	if (gameState.value === 'lost' || gameState.value === 'won') return;
	const cell = board.value[y]?.[x];
	if (!cell || cell.revealed) return;
	cell.flagged = !cell.flagged;
}

function cellText(cell: MinesCell) {
	if (cell.flagged && !cell.revealed) return 'F';
	if (!cell.revealed) return '';
	if (cell.mine) return '';
	return cell.adjacent > 0 ? String(cell.adjacent) : '';
}

function cellClasses(cell: MinesCell) {
	return {
		revealed: cell.revealed,
		flagged: cell.flagged && !cell.revealed,
		mine: cell.mine && cell.revealed,
		exploded: cell.exploded,
		[`n${cell.adjacent}`]: cell.revealed && cell.adjacent > 0 && !cell.mine
	};
}

resetGame();

onBeforeUnmount(() => {
	stopTimer();
});
</script>

<template>
	<ShellWindowFrame
		window-id="mines"
		title="Minesweeper"
		:icon="shellIcons.mines"
		icon-alt="minesweeper icon"
		window-class="mines-window"
		body-class="mines-window-body"
	>
		<div class="mines-shell">
			<div class="mines-top-panel">
				<div class="mines-counter">{{ minesLeftCounter }}</div>
				<button class="mines-face" type="button" @click="resetGame">
					{{ faceLabel }}
				</button>
				<div class="mines-counter">{{ timeCounter }}</div>
			</div>

			<div
				class="mines-grid"
				:style="{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 24px)` }"
			>
				<template v-for="(row, y) in board" :key="`row-${y}`">
					<button
						v-for="(cell, x) in row"
						:key="`${x}-${y}`"
						type="button"
						class="mines-cell"
						:class="cellClasses(cell)"
						@contextmenu.prevent="toggleFlag(x, y)"
						@click="revealCell(x, y)"
					>
						<img
							v-if="cell.mine && cell.revealed"
							class="mines-bomb-icon"
							:src="BOMB_ICON_SRC"
							alt=""
							aria-hidden="true"
						/>
						<span v-else>{{ cellText(cell) }}</span>
					</button>
				</template>
			</div>
		</div>
	</ShellWindowFrame>
</template>
