<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import artworks, { type ArtworkItem } from '~/src/data/artworks';
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const props = withDefaults(
	defineProps<{
		showTwitterLink?: boolean;
	}>(),
	{
		showTwitterLink: false
	}
);

const shell = useShellControllerContext();
const mode = ref<'icons' | 'viewer'>('icons');
const securityShieldVisible = ref(false);
const securityShieldPersistent = ref(false);
const galleryGridRef = ref<HTMLElement | null>(null);
const filmstripRef = ref<HTMLElement | null>(null);
const iconImagesLoaded = ref<Record<string, boolean>>({});
const brokenArtworkIds = ref<Record<string, boolean>>({});
const artworkSourceOverrides = ref<
	Record<string, Partial<Record<'thumbnail' | 'image', string>>>
>({});

const iconBatchSize = 56;
const iconLoadThresholdPx = 520;
const fallbackImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'] as const;

function postedAtMs(value: string) {
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function artworkYearLabel(artwork: ArtworkItem) {
	if (artwork.year && artwork.year.trim() && artwork.year !== 'Archive') {
		return artwork.year;
	}
	const parsed = new Date(artwork.postedAt);
	return Number.isNaN(parsed.getTime())
		? 'Unknown'
		: String(parsed.getUTCFullYear());
}

const sortedArtworks = computed(() =>
	[...artworks]
		.filter((entry) => !brokenArtworkIds.value[entry.id])
		.sort((left, right) => {
		const delta = postedAtMs(right.postedAt) - postedAtMs(left.postedAt);
		if (delta !== 0) return delta;
		return left.title.localeCompare(right.title);
	})
);

const selectedArtworkId = ref(sortedArtworks.value[0]?.id ?? '');
const iconTilesLoadedCount = ref(Math.min(iconBatchSize, sortedArtworks.value.length));

const selectedArtworkIndex = computed(() =>
	sortedArtworks.value.findIndex((entry) => entry.id === selectedArtworkId.value)
);

const selectedArtwork = computed(
	() =>
		sortedArtworks.value.find((entry) => entry.id === selectedArtworkId.value) ??
		sortedArtworks.value[0] ??
		null
);

const loadedIconArtworks = computed(() =>
	sortedArtworks.value.slice(0, iconTilesLoadedCount.value)
);

const filmstripWindowRadius = 8;
const filmstripWindowSize = filmstripWindowRadius * 2 + 1;

const filmstripStartIndex = computed(() => {
	const total = sortedArtworks.value.length;
	if (total <= filmstripWindowSize) return 0;
	const selected = Math.max(0, selectedArtworkIndex.value);
	const half = Math.floor(filmstripWindowSize / 2);
	const maxStart = Math.max(0, total - filmstripWindowSize);
	return Math.min(maxStart, Math.max(0, selected - half));
});

const filmstripArtworks = computed(() => {
	const start = filmstripStartIndex.value;
	return sortedArtworks.value.slice(start, start + filmstripWindowSize);
});

const iconYearGroups = computed(() => {
	const groups: Array<{ year: string; items: ArtworkItem[] }> = [];
	for (const artwork of loadedIconArtworks.value) {
		const year = artworkYearLabel(artwork);
		const last = groups[groups.length - 1];
		if (!last || last.year !== year) {
			groups.push({ year, items: [artwork] });
			continue;
		}
		last.items.push(artwork);
	}
	return groups;
});

let shieldTimer: number | null = null;

function baseArtworkSource(artwork: ArtworkItem, field: 'thumbnail' | 'image') {
	return field === 'thumbnail' ? artwork.thumbnail : artwork.image;
}

function artworkSource(artwork: ArtworkItem, field: 'thumbnail' | 'image') {
	return artworkSourceOverrides.value[artwork.id]?.[field] ?? baseArtworkSource(artwork, field);
}

function buildImageSourceCandidates(pathValue: string) {
	const match = pathValue.match(/^(.*?)(\.[a-z0-9]+)$/i);
	if (!match) return [pathValue];
	const basePath = match[1];
	const originalExt = match[2].toLowerCase();
	const candidates = [pathValue];
	for (const ext of [originalExt, ...fallbackImageExtensions]) {
		const candidate = `${basePath}${ext}`;
		if (!candidates.includes(candidate)) {
			candidates.push(candidate);
		}
	}
	return candidates;
}

function nextImageSourceCandidate(candidates: string[], currentValue: string) {
	const index = candidates.indexOf(currentValue);
	if (index >= 0) {
		return candidates[index + 1] ?? null;
	}
	return candidates.find((candidate) => candidate !== currentValue) ?? null;
}

function markArtworkUnavailable(artwork: ArtworkItem) {
	if (brokenArtworkIds.value[artwork.id]) return;
	brokenArtworkIds.value[artwork.id] = true;
	if (artworkSourceOverrides.value[artwork.id]) {
		delete artworkSourceOverrides.value[artwork.id];
	}
	shell.pushStatus(`${artwork.title} was skipped because the image file could not be loaded.`);
}

function handleArtworkSourceError(artwork: ArtworkItem, field: 'thumbnail' | 'image') {
	if (brokenArtworkIds.value[artwork.id]) return;
	const baseSource = baseArtworkSource(artwork, field);
	const currentSource = artworkSource(artwork, field);
	const candidates = buildImageSourceCandidates(baseSource);
	const nextSource = nextImageSourceCandidate(candidates, currentSource);
	if (nextSource) {
		artworkSourceOverrides.value[artwork.id] = {
			...(artworkSourceOverrides.value[artwork.id] ?? {}),
			[field]: nextSource
		};
		return;
	}
	markArtworkUnavailable(artwork);
}

function selectArtwork(artworkId: string) {
	selectedArtworkId.value = artworkId;
}

function openArtwork(artworkId: string) {
	selectArtwork(artworkId);
	mode.value = 'viewer';
	const target = sortedArtworks.value.find((entry) => entry.id === artworkId);
	if (target) {
		shell.pushStatus(`Viewing ${target.title}.`);
	}
}

function openSelectedArtwork() {
	if (!selectedArtwork.value) return;
	mode.value = 'viewer';
	shell.pushStatus(`Viewing ${selectedArtwork.value.title}.`);
}

function backToIcons() {
	mode.value = 'icons';
	shell.pushStatus('Returned to My Art icon view.');
	void nextTick(() => {
		updateIconLoadWindow();
	});
}

function stepArtwork(offset: number) {
	if (sortedArtworks.value.length === 0) return;
	const currentIndex = selectedArtworkIndex.value >= 0 ? selectedArtworkIndex.value : 0;
	const nextIndex =
		(currentIndex + offset + sortedArtworks.value.length) %
		sortedArtworks.value.length;
	const target = sortedArtworks.value[nextIndex];
	if (!target) return;
	selectedArtworkId.value = target.id;
	shell.pushStatus(`Viewing ${target.title}.`);
}

function scrollFilmstripToSelected() {
	const container = filmstripRef.value;
	if (!container) return;
	const selectedButton = container.querySelector<HTMLButtonElement>(
		'.gallery-filmstrip-item.active'
	);
	if (!selectedButton) return;
	selectedButton.scrollIntoView({
		block: 'nearest',
		inline: 'center',
		behavior: 'auto'
	});
}

function formatPostedAt(value: string) {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

function extractTweetId(artwork: ArtworkItem) {
	const notesMatch = artwork.notes.match(/tweet\s+(\d{8,25})/i);
	if (notesMatch?.[1]) return notesMatch[1];
	const imageMatch = artwork.image.match(/\/(\d{8,25})(?:_\d+)?\.[a-z0-9]+$/i);
	if (imageMatch?.[1]) return imageMatch[1];
	const idMatch = artwork.id.match(/-(\d{8,25})-(?:\d+)-/);
	if (idMatch?.[1]) return idMatch[1];
	return '';
}

function extractTwitterHandle(artwork: ArtworkItem) {
	const mediumMatch = artwork.medium.match(/^twitter\/([^/\s]+)$/i);
	if (mediumMatch?.[1]) return mediumMatch[1];
	const imageMatch = artwork.image.match(/^\/twitter\/([^/]+)\//i);
	if (imageMatch?.[1]) return imageMatch[1];
	const notesMatch = artwork.notes.match(/twitter\/([^,\s]+)/i);
	if (notesMatch?.[1]) return notesMatch[1];
	return '';
}

function buildTwitterStatusUrl(artwork: ArtworkItem) {
	const handle = extractTwitterHandle(artwork);
	const tweetId = extractTweetId(artwork);
	if (!handle || !tweetId) return '';
	return `https://twitter.com/${handle}/status/${tweetId}`;
}

function formatArtworkNotes(notes: string) {
	const stripped = notes.replace(/^Imported from\s+/i, '').trim();
	const withoutTwitterUrls = stripped
		.replace(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\S+/gi, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
	if (/^twitter\/[^,\s]+,\s*tweet\s+\d{8,25}$/i.test(withoutTwitterUrls)) {
		return '';
	}
	return withoutTwitterUrls;
}

const selectedArtworkTwitterUrl = computed(() => {
	if (!props.showTwitterLink || !selectedArtwork.value) return '';
	return buildTwitterStatusUrl(selectedArtwork.value);
});

const selectedArtworkNotes = computed(() => {
	if (!selectedArtwork.value) return '';
	return formatArtworkNotes(selectedArtwork.value.notes);
});

function markIconLoaded(artworkId: string) {
	if (iconImagesLoaded.value[artworkId]) return;
	iconImagesLoaded.value[artworkId] = true;
}

function loadMoreIconTiles() {
	const next = Math.min(
		sortedArtworks.value.length,
		iconTilesLoadedCount.value + iconBatchSize
	);
	if (next === iconTilesLoadedCount.value) return;
	iconTilesLoadedCount.value = next;
}

function fillViewportIfNeeded(iteration = 0) {
	if (iteration > 6) return;
	const el = galleryGridRef.value;
	if (!el) return;
	const needsMore =
		el.scrollHeight <= el.clientHeight + 24 &&
		iconTilesLoadedCount.value < sortedArtworks.value.length;
	if (!needsMore) return;
	loadMoreIconTiles();
	void nextTick(() => fillViewportIfNeeded(iteration + 1));
}

function updateIconLoadWindow() {
	const el = galleryGridRef.value;
	if (!el) return;
	const atLoadEdge =
		el.scrollTop + el.clientHeight >= el.scrollHeight - iconLoadThresholdPx;
	if (atLoadEdge) {
		loadMoreIconTiles();
	}
	void nextTick(() => {
		fillViewportIfNeeded();
	});
}

function handleIconGridScroll() {
	updateIconLoadWindow();
}

function handleGalleryResize() {
	if (mode.value !== 'icons') return;
	void nextTick(() => {
		updateIconLoadWindow();
	});
}

function clearSecurityShieldTimer() {
	if (shieldTimer !== null && typeof window !== 'undefined') {
		window.clearTimeout(shieldTimer);
		shieldTimer = null;
	}
}

function showSecurityShield(
	message: string,
	options: { durationMs?: number; persistent?: boolean } = {}
) {
	const { durationMs = 1400, persistent = false } = options;
	securityShieldVisible.value = true;
	securityShieldPersistent.value =
		securityShieldPersistent.value || persistent;
	shell.pushStatus(message);
	clearSecurityShieldTimer();
	if (
		typeof window !== 'undefined' &&
		!securityShieldPersistent.value &&
		durationMs > 0
	) {
		shieldTimer = window.setTimeout(() => {
			securityShieldVisible.value = false;
			shieldTimer = null;
		}, durationMs);
	}
}

function handleProtectedInteraction(message: string) {
	showSecurityShield(message, { durationMs: 1000 });
}

function detectBlockedCommand(event: KeyboardEvent) {
	const key = event.key.toLowerCase();
	const code = event.code;
	const ctrlOrMeta = event.ctrlKey || event.metaKey;
	const isMacScreenshotChordPressed =
		event.metaKey &&
		event.shiftKey &&
		['shift', 'meta'].includes(key);
	const isMacScreenshotCombo =
		event.metaKey &&
		event.shiftKey &&
		(['Digit3', 'Digit4', 'Digit5'].includes(code) ||
			['3', '4', '5', '#', '$', '%'].includes(key));

	if (event.key === 'PrintScreen') {
		return {
			message: 'Screenshot shortcut detected. Picture capture is blocked.',
			persistent: true
		};
	}

	if (isMacScreenshotChordPressed) {
		return {
			message: 'Screenshot shortcut detected. Picture capture is blocked.',
			persistent: true
		};
	}

	if (isMacScreenshotCombo) {
		return {
			message: 'Screenshot shortcut detected. Picture capture is blocked.',
			persistent: true
		};
	}

	if (ctrlOrMeta && ['s', 'p', 'c', 'x', 'u'].includes(key)) {
		return {
			message: 'Copy and save shortcuts are blocked in My Art.'
		};
	}

	if (ctrlOrMeta && event.shiftKey && ['i', 'j', 'c'].includes(key)) {
		return {
			message: 'Developer-tool shortcuts are blocked while My Art is open.'
		};
	}

	if (event.key === 'F12') {
		return {
			message: 'Developer-tool shortcuts are blocked while My Art is open.'
		};
	}

	return null;
}

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	const tagName = target.tagName;
	return (
		target.isContentEditable ||
		tagName === 'INPUT' ||
		tagName === 'TEXTAREA' ||
		tagName === 'SELECT'
	);
}

function handleGlobalKeydown(event: KeyboardEvent) {
	if (
		mode.value === 'viewer' &&
		(event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
		!isEditableTarget(event.target)
	) {
		event.preventDefault();
		event.stopPropagation();
		stepArtwork(event.key === 'ArrowLeft' ? -1 : 1);
		return;
	}
	const blocked = detectBlockedCommand(event);
	if (!blocked) return;
	event.preventDefault();
	event.stopPropagation();
	showSecurityShield(blocked.message, { persistent: blocked.persistent });
}

function handleGlobalKeyup(event: KeyboardEvent) {
	const blocked = detectBlockedCommand(event);
	if (!blocked) return;
	event.preventDefault();
	event.stopPropagation();
	showSecurityShield(blocked.message, { persistent: blocked.persistent });
}

function handleGlobalProtectedEvent(event: Event) {
	event.preventDefault();
	event.stopPropagation();
	showSecurityShield('Protected media cannot be copied, dragged, or saved.', {
		durationMs: 900
	});
}

watch(
	sortedArtworks,
	(next) => {
		if (!next.some((entry) => entry.id === selectedArtworkId.value)) {
			selectedArtworkId.value = next[0]?.id ?? '';
		}
		if (iconTilesLoadedCount.value > next.length) {
			iconTilesLoadedCount.value = next.length;
		}
		if (iconTilesLoadedCount.value === 0 && next.length > 0) {
			iconTilesLoadedCount.value = Math.min(iconBatchSize, next.length);
		}
		const validIds = new Set(next.map((entry) => entry.id));
		for (const id of Object.keys(iconImagesLoaded.value)) {
			if (validIds.has(id)) continue;
			delete iconImagesLoaded.value[id];
		}
		if (mode.value === 'icons') {
			void nextTick(() => {
				updateIconLoadWindow();
			});
		}
	},
	{ immediate: true }
);

watch([mode, selectedArtworkId, filmstripStartIndex], ([nextMode]) => {
	if (nextMode !== 'viewer') return;
	void nextTick(() => {
		scrollFilmstripToSelected();
	});
});

onMounted(() => {
	if (typeof document === 'undefined' || typeof window === 'undefined') return;
	document.addEventListener('keydown', handleGlobalKeydown, true);
	document.addEventListener('keyup', handleGlobalKeyup, true);
	document.addEventListener('contextmenu', handleGlobalProtectedEvent, true);
	document.addEventListener('copy', handleGlobalProtectedEvent, true);
	document.addEventListener('cut', handleGlobalProtectedEvent, true);
	document.addEventListener('dragstart', handleGlobalProtectedEvent, true);
	document.addEventListener('selectstart', handleGlobalProtectedEvent, true);
	window.addEventListener('resize', handleGalleryResize, { passive: true });
	void nextTick(() => {
		updateIconLoadWindow();
	});
});

onBeforeUnmount(() => {
	if (typeof document !== 'undefined') {
		document.removeEventListener('keydown', handleGlobalKeydown, true);
		document.removeEventListener('keyup', handleGlobalKeyup, true);
		document.removeEventListener('contextmenu', handleGlobalProtectedEvent, true);
		document.removeEventListener('copy', handleGlobalProtectedEvent, true);
		document.removeEventListener('cut', handleGlobalProtectedEvent, true);
		document.removeEventListener('dragstart', handleGlobalProtectedEvent, true);
		document.removeEventListener('selectstart', handleGlobalProtectedEvent, true);
	}
	if (typeof window !== 'undefined') {
		window.removeEventListener('resize', handleGalleryResize);
	}
	clearSecurityShieldTimer();
	securityShieldPersistent.value = false;
});
</script>

<template>
	<ShellWindowFrame
		window-id="gallery"
		title="My Art"
		:icon="shellIcons.picture"
		icon-alt="my art icon"
		window-class="gallery-window"
		body-class="gallery-window-body"
	>
		<div
			class="gallery-shell"
			:class="{ 'gallery-security-active': securityShieldVisible }"
			@contextmenu.prevent="
				handleProtectedInteraction('Context menu is disabled while My Art is open.')
			"
			@dragstart.prevent="
				handleProtectedInteraction('Dragging or saving pictures is disabled in My Art.')
			"
			@copy.prevent="handleProtectedInteraction('Copy is disabled while My Art is open.')"
			@cut.prevent="handleProtectedInteraction('Cut is disabled while My Art is open.')"
			@selectstart.prevent="
				handleProtectedInteraction('Text and image selection is disabled in My Art.')
			"
		>
			<div class="gallery-content">
				<nav class="gallery-menu-bar" aria-label="My Art menu">
					<button type="button" @click="shell.pushStatus('File menu is not available in this build.')">File</button>
					<button type="button" @click="shell.pushStatus('Edit menu is not available in this build.')">Edit</button>
					<button type="button" @click="shell.pushStatus('View menu is not available in this build.')">View</button>
					<button type="button" @click="shell.pushStatus('Favorites menu is not available in this build.')">Favorites</button>
					<button type="button" @click="shell.pushStatus('Tools menu is not available in this build.')">Tools</button>
					<button type="button" @click="shell.pushStatus('Help menu is not available in this build.')">Help</button>
				</nav>

				<div v-if="mode === 'icons'" class="gallery-explorer-view">
					<header class="gallery-header">
						<h2>My Art</h2>
						<p>Masonry feed by year. Double-click any image to open XP Picture Viewer.</p>
					</header>

					<div
						ref="galleryGridRef"
						class="gallery-icon-grid"
						role="list"
						aria-label="Artwork list"
						@scroll="handleIconGridScroll"
					>
						<section
							v-for="group in iconYearGroups"
							:key="`year-${group.year}`"
							class="gallery-year-group"
						>
							<h3 class="gallery-year-heading">{{ group.year }}</h3>
							<div class="gallery-year-masonry" role="list" :aria-label="`Artwork from ${group.year}`">
								<button
									v-for="artwork in group.items"
									:key="artwork.id"
									type="button"
									class="gallery-masonry-item"
									:class="{ active: selectedArtworkId === artwork.id }"
									@click="selectArtwork(artwork.id)"
									@dblclick="openArtwork(artwork.id)"
								>
									<img
										:src="artworkSource(artwork, 'thumbnail')"
										:alt="artwork.title"
										loading="lazy"
										decoding="async"
										draggable="false"
										:class="{ loaded: iconImagesLoaded[artwork.id] }"
										@load="markIconLoaded(artwork.id)"
										@error="handleArtworkSourceError(artwork, 'thumbnail')"
									/>
								</button>
							</div>
						</section>
					</div>

					<footer class="gallery-footer-row">
						<button type="button" :disabled="!selectedArtwork" @click="openSelectedArtwork">
							Open
						</button>
						<span>{{ loadedIconArtworks.length }} / {{ sortedArtworks.length }} loaded</span>
					</footer>
				</div>

				<div v-else class="gallery-viewer-mode">
					<div class="gallery-viewer-toolbar">
						<button type="button" @click="backToIcons">Back To Art</button>
						<button type="button" @click="stepArtwork(-1)">Previous</button>
						<button type="button" @click="stepArtwork(1)">Next</button>
					</div>

					<div v-if="selectedArtwork" class="gallery-viewer-layout">
						<div class="gallery-viewer-stage">
							<img
								:src="artworkSource(selectedArtwork, 'image')"
								:alt="selectedArtwork.title"
								draggable="false"
								@error="handleArtworkSourceError(selectedArtwork, 'image')"
							/>
						</div>
							<aside class="gallery-viewer-info">
								<p><strong>Year:</strong> {{ selectedArtwork.year }}</p>
								<p><strong>Posted:</strong> {{ formatPostedAt(selectedArtwork.postedAt) }}</p>
								<p v-if="selectedArtworkTwitterUrl">
									<strong>Tweet:</strong>&nbsp;
									<a :href="selectedArtworkTwitterUrl" target="_blank" rel="noopener noreferrer">Link</a>
								</p>
								<p v-if="selectedArtworkNotes">{{ selectedArtworkNotes }}</p>
							</aside>
						</div>

					<div
						ref="filmstripRef"
						class="gallery-filmstrip"
						role="list"
						aria-label="Filmstrip"
					>
						<button
							v-for="artwork in filmstripArtworks"
							:key="`film-${artwork.id}`"
							type="button"
							class="gallery-filmstrip-item"
							:class="{ active: selectedArtworkId === artwork.id }"
							@click="selectArtwork(artwork.id)"
							@dblclick="openArtwork(artwork.id)"
						>
							<img
								:src="artworkSource(artwork, 'thumbnail')"
								:alt="`${artwork.title} thumbnail`"
								loading="lazy"
								draggable="false"
								@error="handleArtworkSourceError(artwork, 'thumbnail')"
							/>
						</button>
					</div>
				</div>
			</div>
				<div
					v-if="securityShieldVisible"
					class="gallery-security-shield"
					aria-hidden="true"
				/>
			</div>
		</ShellWindowFrame>
	</template>
