<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<article role="tabpanel" :hidden="shell.activeTab !== 'contact'">
		<table class="contact-table">
			<tbody>
				<tr>
					<td>GitHub</td>
					<td>
						<a href="https://github.com/Lewdcario" @click.prevent="shell.openInBrowser('https://github.com/Lewdcario', 'GitHub')">
							@Lewdcario
						</a>
					</td>
				</tr>
				<tr>
					<td>Twitter</td>
					<td>
						<a href="https://twitter.com/okamicario" @click.prevent="shell.openInBrowser('https://twitter.com/okamicario', 'Twitter')">
							@okamicario
						</a>
					</td>
				</tr>
				<tr>
					<td>Email</td>
					<td>not public</td>
				</tr>
			</tbody>
		</table>

		<fieldset>
			<legend>Note</legend>
			<p>
				retro inspired!
			</p>
		</fieldset>
	</article>
</template>
