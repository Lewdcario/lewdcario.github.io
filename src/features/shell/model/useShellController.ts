import { inject, provide, type InjectionKey } from 'vue';
import {
	createShellController,
	type ShellController
} from '~/src/features/shell/model/createShellController';

export const shellControllerKey: InjectionKey<ShellController> = Symbol('shell-controller');

export function provideShellController() {
	const controller = createShellController();
	provide(shellControllerKey, controller);
	return controller;
}

export function useShellControllerContext() {
	const controller = inject(shellControllerKey);
	if (!controller) {
		throw new Error('Shell controller context is not available.');
	}
	return controller;
}
