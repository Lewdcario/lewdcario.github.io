<script setup lang="ts">
import projects from '~/src/data/projects';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<article id="projects-tab" role="tabpanel" :hidden="shell.activeTab !== 'projects'">
		<fieldset>
			<legend>Projects</legend>
			<table class="projects-table">
				<thead>
					<tr>
						<th>Project</th>
						<th>Stack</th>
						<th>Window</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="project in projects" :key="project.title">
						<td>
							<strong>{{ project.title }}</strong>
							<div class="project-meta">{{ project.timeframe }} - {{ project.description }}</div>
						</td>
						<td>{{ project.tech }}</td>
						<td>
							<a v-if="project.link !== '#'" :href="project.link" @click="shell.handleProjectOpen(project, $event)">
								open
							</a>
							<span v-else>private</span>
						</td>
					</tr>
				</tbody>
			</table>
		</fieldset>
	</article>
</template>
