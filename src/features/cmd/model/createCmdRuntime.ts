import {
	browserHomeUrl,
	torBrowserHomeUrl,
	xpThemes
} from '~/src/features/shell/constants/shell';
import type { TabId, WindowId } from '~/src/features/shell/model/types';

export type CmdWorkingDirectory = 'C:\\' | 'C:\\BIN';

export interface CmdLine {
	kind: 'output' | 'error' | 'muted';
	text: string;
}

export interface CmdResult {
	nextDirectory: CmdWorkingDirectory;
	lines: CmdLine[];
	clearScreen?: boolean;
}

export interface CmdShellPort {
	sessionRole: 'guest' | 'admin';
	activeThemeId: string;
	browserCurrentUrl: string;
	setTab: (tab: TabId) => void;
	setTheme: (id: (typeof xpThemes)[number]['id']) => void;
	isThemeId: (id: string) => boolean;
	openWindowFromMenu: (windowId: WindowId) => void;
	openStandardBrowser: (url: string, label: string) => void;
	openTorBrowser: (url: string, label: string) => void;
	openInBrowser: (url: string, label: string) => void;
	closeWindow: (windowId: WindowId) => void;
	pushStatus: (message: string) => void;
}

const rootFiles: Record<string, string> = {
	'ABOUT.TXT':
		'Okami Portfolio XP shell.\nBuilt for experimentation, aesthetics, and interaction design.',
	'PROJECTS.TXT':
		'Use OPEN PROJECTS to jump to the projects tab.\nUse OPEN BROWSER to browse external links.',
	'LINKS.TXT':
		'Useful commands:\n  OPEN ABOUT\n  OPEN CONTACT\n  OPEN HTTPS://library.okami.codes',
	'TODO.TXT':
		'- polish cmd visuals\n- add fake networking commands\n- add tiny scriptable batch mode'
};

const binFiles: Record<string, string> = {
	'README.TXT':
		'This is the fake BIN directory.\nThere are no executables here yet.'
};

const openWindowTargets: Record<string, WindowId> = {
	links: 'links',
	clock: 'clock',
	main: 'main',
	browser: 'browser',
	recycle: 'recycle',
	vlc: 'vlc',
	noise: 'noise',
	cmd: 'cmd',
	chat: 'chat',
	mines: 'mines',
	control: 'control',
	otaclock: 'otaclock',
	remote: 'remote'
};

const openTabTargets: Record<string, TabId> = {
	about: 'about',
	projects: 'projects',
	blog: 'blog',
	contact: 'contact'
};

function ok(text: string): CmdLine {
	return { kind: 'output', text };
}

function muted(text: string): CmdLine {
	return { kind: 'muted', text };
}

function error(text: string): CmdLine {
	return { kind: 'error', text };
}

function currentFiles(directory: CmdWorkingDirectory) {
	return directory === 'C:\\BIN' ? binFiles : rootFiles;
}

function resolveCdTarget(
	rawValue: string,
	current: CmdWorkingDirectory
): CmdWorkingDirectory | null {
	const normalized = rawValue.trim().replaceAll('/', '\\').toUpperCase();
	if (!normalized) return current;

	if (normalized === '..') {
		return current === 'C:\\BIN' ? 'C:\\' : 'C:\\';
	}
	if (normalized === '\\' || normalized === 'C:' || normalized === 'C:\\') {
		return 'C:\\';
	}
	if (
		normalized === 'BIN' ||
		normalized === '\\BIN' ||
		normalized === 'C:\\BIN'
	) {
		return 'C:\\BIN';
	}

	return null;
}

function directoryListing(directory: CmdWorkingDirectory) {
	const lines: CmdLine[] = [
		muted(' Volume in drive C is OKAMI_SYSTEM'),
		muted(' Volume Serial Number is XP02-2001'),
		muted(''),
		muted(` Directory of ${directory}`),
		muted('')
	];

	if (directory === 'C:\\') {
		lines.push(ok('02/21/2026  10:24 PM    <DIR>          BIN'));
	}

	for (const [fileName, contents] of Object.entries(
		currentFiles(directory)
	)) {
		const byteSize = new TextEncoder().encode(contents).byteLength;
		const paddedSize = byteSize.toString().padStart(12, ' ');
		lines.push(ok(`02/21/2026  10:24 PM ${paddedSize} ${fileName}`));
	}

	lines.push(muted(''));
	lines.push(
		muted(`     ${Object.keys(currentFiles(directory)).length} File(s)`)
	);
	return lines;
}

function openTarget(target: string, shell: CmdShellPort): CmdLine[] {
	const normalized = target.trim().toLowerCase();
	if (!normalized) {
		return [error('OPEN requires a target. Example: OPEN PROJECTS')];
	}

	if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
		shell.openInBrowser(target.trim(), 'Command Link');
		shell.pushStatus(`Opened ${target.trim()} from cmd.`);
		return [ok(`Opening ${target.trim()}...`)];
	}

	if (normalized === 'tor') {
		shell.openTorBrowser(torBrowserHomeUrl, 'Tor Browser');
		return [ok('Opening Tor Browser...')];
	}

	if (
		normalized === 'browser' ||
		normalized === 'navigator' ||
		normalized === 'web'
	) {
		shell.openStandardBrowser(
			shell.browserCurrentUrl || browserHomeUrl,
			'Netscape Navigator'
		);
		return [ok('Opening Netscape Navigator...')];
	}

	if (normalized in openTabTargets) {
		const tabId = openTabTargets[normalized as keyof typeof openTabTargets];
		if (!tabId) {
			return [error(`Unknown OPEN target: ${target}`)];
		}
		shell.setTab(tabId);
		return [ok(`Opening ${normalized} tab...`)];
	}

	if (normalized in openWindowTargets) {
		const windowId =
			openWindowTargets[normalized as keyof typeof openWindowTargets];
		if (!windowId) {
			return [error(`Unknown OPEN target: ${target}`)];
		}
		shell.openWindowFromMenu(windowId);
		return [ok(`Opening ${normalized} window...`)];
	}

	return [error(`Unknown OPEN target: ${target}`)];
}

function randomMatrixLine(length = 42) {
	const glyphs = '01#@%$[]{}<>*+-=';
	let output = '';
	for (let index = 0; index < length; index += 1) {
		const charIndex = Math.floor(Math.random() * glyphs.length);
		output += glyphs[charIndex] ?? '0';
	}
	return output;
}

export function createCmdBannerLines() {
	return [
		muted('Microsoft Windows XP [Version 5.1.2600]'),
		muted('(C) Copyright 1985-2001 Microsoft Corp.'),
		muted('')
	];
}

export function runCmdCommand(
	rawInput: string,
	workingDirectory: CmdWorkingDirectory,
	shell: CmdShellPort
): CmdResult {
	const trimmed = rawInput.trim();
	if (!trimmed) {
		return { nextDirectory: workingDirectory, lines: [] };
	}

	const [rawCommand = '', ...args] = trimmed.split(/\s+/g);
	const command = rawCommand.toLowerCase();
	const argText = args.join(' ');

	switch (command) {
		case 'help':
			return {
				nextDirectory: workingDirectory,
				lines: [
					ok('Commands:'),
					ok('  HELP, VER, WHOAMI, DATE, TIME, CLS, EXIT'),
					ok('  DIR, CD <path>, TYPE <file>, ECHO <text>'),
					ok('  OPEN <target|url>'),
					ok('  THEME LIST'),
					ok('  THEME SET <theme-id>')
				]
			};
		case 'ver':
			return {
				nextDirectory: workingDirectory,
				lines: [ok('Microsoft Windows XP [Version 5.1.2600]')]
			};
		case 'whoami':
			return {
				nextDirectory: workingDirectory,
				lines: [ok(`okami\\${shell.sessionRole}`)]
			};
		case 'date': {
			const dateValue = new Date().toLocaleDateString('en-US');
			return {
				nextDirectory: workingDirectory,
				lines: [ok(`Current date is ${dateValue}`)]
			};
		}
		case 'time': {
			const timeValue = new Date().toLocaleTimeString('en-US', {
				hour12: false
			});
			return {
				nextDirectory: workingDirectory,
				lines: [ok(`Current time is ${timeValue}`)]
			};
		}
		case 'cls':
			return {
				nextDirectory: workingDirectory,
				lines: [],
				clearScreen: true
			};
		case 'exit':
			shell.closeWindow('cmd');
			return {
				nextDirectory: workingDirectory,
				lines: [muted('Closing command prompt...')]
			};
		case 'dir':
			return {
				nextDirectory: workingDirectory,
				lines: directoryListing(workingDirectory)
			};
		case 'cd': {
			const nextDirectory = resolveCdTarget(argText, workingDirectory);
			if (!nextDirectory) {
				return {
					nextDirectory: workingDirectory,
					lines: [
						error(
							`The system cannot find the path specified: ${argText || '<empty>'}`
						)
					]
				};
			}
			return { nextDirectory, lines: [ok(nextDirectory)] };
		}
		case 'type': {
			const fileName = (args[0] || '').toUpperCase();
			if (!fileName) {
				return {
					nextDirectory: workingDirectory,
					lines: [error('TYPE requires a file name.')]
				};
			}
			const fileContent = currentFiles(workingDirectory)[fileName];
			if (!fileContent) {
				return {
					nextDirectory: workingDirectory,
					lines: [error(`File not found: ${fileName}`)]
				};
			}

			return {
				nextDirectory: workingDirectory,
				lines: fileContent.split('\n').map((line) => ok(line))
			};
		}
		case 'open':
			return {
				nextDirectory: workingDirectory,
				lines: openTarget(argText, shell)
			};
		case 'theme': {
			const subCommand = (args[0] || '').toLowerCase();
			if (!subCommand || subCommand === 'list') {
				const lines = xpThemes.map((theme) =>
					ok(
						`${theme.id === shell.activeThemeId ? '* ' : '  '}${theme.id} - ${theme.label}`
					)
				);
				return { nextDirectory: workingDirectory, lines };
			}
			if (subCommand === 'set') {
				const rawThemeId = args[1] || '';
				if (!rawThemeId) {
					return {
						nextDirectory: workingDirectory,
						lines: [error('THEME SET requires a theme id.')]
					};
				}
				if (!shell.isThemeId(rawThemeId)) {
					return {
						nextDirectory: workingDirectory,
						lines: [error(`Unknown theme id: ${rawThemeId}`)]
					};
				}
				shell.setTheme(rawThemeId as (typeof xpThemes)[number]['id']);
				return {
					nextDirectory: workingDirectory,
					lines: [ok(`Theme changed to ${rawThemeId}`)]
				};
			}
			return {
				nextDirectory: workingDirectory,
				lines: [error(`Unknown THEME command: ${argText || '<empty>'}`)]
			};
		}
		case 'echo':
			return { nextDirectory: workingDirectory, lines: [ok(argText)] };
		case 'chat':
			shell.openWindowFromMenu('chat');
			return {
				nextDirectory: workingDirectory,
				lines: [ok('Opening MSN Chat...')]
			};
		case 'winver':
			return {
				nextDirectory: workingDirectory,
				lines: [
					ok('Microsoft Windows XP'),
					muted('Version 5.1 (Build 2600.xpsp_sp3_qfe)'),
					muted('Copyright (c) Microsoft Corporation')
				]
			};
		case 'konami':
			if (shell.isThemeId('luna-blue')) {
				shell.setTheme('luna-blue');
			}
			shell.openWindowFromMenu('chat');
			shell.pushStatus('Hidden command accepted.');
			return {
				nextDirectory: workingDirectory,
				lines: [
					ok('Konami sequence accepted.'),
					muted('Bonus unlocked: chat online.')
				]
			};
		case 'xyzzy':
			return {
				nextDirectory: workingDirectory,
				lines: [
					ok('Nothing happens.'),
					muted('...a distant modem squeal answers back.')
				]
			};
		case 'matrix': {
			const lines = [muted('Initializing digital rain...'), muted('')];
			for (let index = 0; index < 12; index += 1) {
				lines.push(ok(randomMatrixLine(44)));
			}
			lines.push(muted(''));
			lines.push(muted('Press CLS to clear.'));
			return { nextDirectory: workingDirectory, lines };
		}
		case 'sudo':
			return {
				nextDirectory: workingDirectory,
				lines: [
					error("'sudo' is not recognized in this shell."),
					muted('Hint: try logging in as Admin from the XP login screen.')
				]
			};
		case 'cat':
			return {
				nextDirectory: workingDirectory,
				lines: [
					ok(' /\\_/\\'),
					ok('( o.o )'),
					ok(' > ^ <'),
					muted('purr.exe is running in the noise window.')
				]
			};
		default:
			return {
				nextDirectory: workingDirectory,
				lines: [
					error(
						`'${rawCommand}' is not recognized as an internal or external command.`
					)
				]
			};
	}
}
