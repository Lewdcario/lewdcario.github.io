import { inject, provide, proxyRefs, type InjectionKey, type ShallowUnwrapRef } from 'vue';
import {
	createShellController,
	type ShellController
} from '~/src/features/shell/model/createShellController';

export type ShellControllerContext = ShallowUnwrapRef<ShellController>;

export const shellControllerKey: InjectionKey<ShellControllerContext> =
	Symbol('shell-controller');

export function provideShellController() {
	const controller = proxyRefs(createShellController());
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
