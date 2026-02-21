<script setup lang="ts">
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<article role="tabpanel" :hidden="shell.activeTab !== 'blog'">
		<fieldset class="blog-toolbar">
			<legend>Blog</legend>
			<div class="blog-toolbar-row">
				<p class="blog-session-note">
					Signed in as <strong>{{ shell.sessionRole }}</strong>
				</p>
				<button type="button" @click="shell.loadBlogPosts">Refresh</button>
			</div>
			<p v-if="shell.blogLoading" class="blinkie-status">Loading blog posts...</p>
			<p v-else-if="shell.blogError" class="blinkie-status blinkie-status-error">{{ shell.blogError }}</p>
			<p v-else-if="shell.blogPosts.length === 0" class="blinkie-status">No posts yet.</p>
		</fieldset>

		<fieldset v-if="shell.signedInAsAdmin" class="blog-composer">
			<legend>{{ shell.blogEditingPostId !== null ? 'Edit Post (Admin)' : 'New Post (Admin)' }}</legend>
			<div class="blog-composer-grid">
				<label for="blog-title">Title</label>
				<input id="blog-title" v-model="shell.blogComposerTitle" type="text" maxlength="160" />
				<label for="blog-excerpt">Excerpt</label>
				<input id="blog-excerpt" v-model="shell.blogComposerExcerpt" type="text" maxlength="400" />
				<label for="blog-content">Content</label>
				<textarea id="blog-content" v-model="shell.blogComposerContent" rows="5" maxlength="20000"></textarea>
				<label class="blog-checkbox">
					<input v-model="shell.blogComposerPublished" type="checkbox" />
					Published
				</label>
			</div>
			<p v-if="shell.blogComposerError" class="blinkie-status blinkie-status-error">{{ shell.blogComposerError }}</p>
			<div class="blog-composer-actions">
				<button type="button" :disabled="shell.blogComposerSaving || shell.blogDeletingPostId !== null" @click="shell.submitBlogPost">
					{{
						shell.blogComposerSaving
							? shell.blogEditingPostId !== null
								? 'Saving...'
								: 'Publishing...'
							: shell.blogEditingPostId !== null
								? 'Save Changes'
								: 'Publish Post'
					}}
				</button>
				<button
					v-if="shell.blogEditingPostId !== null"
					type="button"
					:disabled="shell.blogComposerSaving || shell.blogDeletingPostId !== null"
					@click="shell.cancelEditingBlogPost"
				>
					Cancel Edit
				</button>
			</div>
		</fieldset>

		<section v-if="shell.blogPosts.length > 0" class="blog-browser">
			<aside class="blog-post-list">
				<button
					v-for="post in shell.blogPosts"
					:key="post.id"
					type="button"
					class="blog-post-list-item"
					:class="{ active: shell.selectedBlogPostId === post.id }"
					@click="shell.selectBlogPost(post.id)"
				>
					<span class="blog-post-list-title">{{ post.title }}</span>
					<span class="blog-post-list-meta">
						{{ shell.formatBlogTimestamp(post.createdAt) }} • {{ post.author }}
						<span v-if="!post.published"> • draft</span>
					</span>
				</button>
			</aside>
			<article v-if="shell.selectedBlogPost" class="blog-post-view">
				<header class="blog-post-header">
					<h3>{{ shell.selectedBlogPost.title }}</h3>
					<p class="blog-post-meta">
						{{ shell.formatBlogTimestamp(shell.selectedBlogPost.createdAt) }} • {{ shell.selectedBlogPost.author }}
						<span v-if="!shell.selectedBlogPost.published"> • draft</span>
					</p>
					<div v-if="shell.signedInAsAdmin" class="blog-post-admin-actions">
						<button type="button" :disabled="shell.blogComposerSaving || shell.blogDeletingPostId !== null" @click="shell.beginEditingBlogPost(shell.selectedBlogPost)">
							Edit Post
						</button>
						<button type="button" class="danger" :disabled="shell.blogComposerSaving || shell.blogDeletingPostId !== null" @click="shell.deleteSelectedBlogPost">
							{{ shell.blogDeletingPostId === shell.selectedBlogPost.id ? 'Deleting...' : 'Delete Post' }}
						</button>
					</div>
				</header>
				<p v-if="shell.selectedBlogPost.excerpt" class="blog-post-excerpt">{{ shell.selectedBlogPost.excerpt }}</p>
				<div class="blog-post-content markdown-content" v-html="shell.renderBlogMarkdown(shell.selectedBlogPost.content)"></div>
			</article>
			<p v-else class="blinkie-status">Select a post from the list.</p>
		</section>
	</article>
</template>
