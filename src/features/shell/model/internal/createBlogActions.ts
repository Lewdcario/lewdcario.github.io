import { $fetch } from 'ofetch';
import { createBlogPostInputSchema, type BlogPost } from '~/shared/blog';
import type { AuthSessionRole } from '~/shared/auth';

export function createBlogActions(deps: any) {
	const {
		sessionRole,
		blogLoading,
		blogError,
		blogPosts,
		selectedBlogPostId,
		blogEditingPostId,
		blogDeletingPostId,
		blogComposerTitle,
		blogComposerExcerpt,
		blogComposerContent,
		blogComposerPublished,
		blogComposerSaving,
		blogComposerError,
		signedInAsAdmin,
		selectedBlogPost,
		markdownRenderer,
		pushStatus,
		readApiErrorMessage
	} = deps;

	async function refreshAuthSession() {
		try {
			const payload = await $fetch<{ role: AuthSessionRole }>('/api/auth/session');
			sessionRole.value = payload.role;
		} catch {
			sessionRole.value = 'guest';
		}
	}

	async function loadBlogPosts() {
		blogLoading.value = true;
		blogError.value = '';

		try {
			const payload = await $fetch<{ role: AuthSessionRole; posts: BlogPost[] }>('/api/blog/posts');
			sessionRole.value = payload.role;
			blogPosts.value = payload.posts;
			if (payload.posts.length === 0) {
				selectedBlogPostId.value = null;
			} else if (!payload.posts.some((post) => post.id === selectedBlogPostId.value)) {
				selectedBlogPostId.value = payload.posts[0]?.id ?? null;
			}
			if (
				blogEditingPostId.value !== null &&
				!payload.posts.some((post) => post.id === blogEditingPostId.value)
			) {
				resetBlogComposer();
			}
		} catch (error) {
			blogPosts.value = [];
			selectedBlogPostId.value = null;
			blogError.value = readApiErrorMessage(error, 'Unable to load blog posts.');
		} finally {
			blogLoading.value = false;
		}
	}

	function resetBlogComposer() {
		blogComposerTitle.value = '';
		blogComposerExcerpt.value = '';
		blogComposerContent.value = '';
		blogComposerPublished.value = true;
		blogComposerError.value = '';
		blogEditingPostId.value = null;
	}

	function beginEditingBlogPost(post: BlogPost | null) {
		if (!signedInAsAdmin.value || !post || blogComposerSaving.value || blogDeletingPostId.value !== null) {
			return;
		}

		blogEditingPostId.value = post.id;
		blogComposerTitle.value = post.title;
		blogComposerExcerpt.value = post.excerpt;
		blogComposerContent.value = post.content;
		blogComposerPublished.value = post.published;
		blogComposerError.value = '';
	}

	function cancelEditingBlogPost() {
		if (blogComposerSaving.value) return;
		resetBlogComposer();
	}

	async function submitBlogPost() {
		if (!signedInAsAdmin.value || blogComposerSaving.value) return;

		blogComposerError.value = '';
		const parseResult = createBlogPostInputSchema.safeParse({
			title: blogComposerTitle.value,
			excerpt: blogComposerExcerpt.value,
			content: blogComposerContent.value,
			published: blogComposerPublished.value
		});

		if (!parseResult.success) {
			blogComposerError.value = parseResult.error.issues[0]?.message ?? 'Invalid post data.';
			return;
		}

		blogComposerSaving.value = true;
		const editingPostId = blogEditingPostId.value;
		try {
			if (editingPostId === null) {
				const payload = await $fetch<{ post: BlogPost }>('/api/blog/posts', {
					method: 'POST',
					body: parseResult.data
				});
				blogPosts.value = [payload.post, ...blogPosts.value];
				selectedBlogPostId.value = payload.post.id;
				resetBlogComposer();
				pushStatus(`Published "${payload.post.title}".`);
			} else {
				const payload = await $fetch<{ post: BlogPost }>(`/api/blog/posts/${editingPostId}`, {
					method: 'PATCH',
					body: parseResult.data
				});
				const existingPostIndex = blogPosts.value.findIndex((post: BlogPost) => post.id === editingPostId);
				if (existingPostIndex >= 0) {
					const nextPosts = [...blogPosts.value];
					nextPosts.splice(existingPostIndex, 1, payload.post);
					blogPosts.value = nextPosts;
				} else {
					blogPosts.value = [payload.post, ...blogPosts.value];
				}
				selectedBlogPostId.value = payload.post.id;
				resetBlogComposer();
				pushStatus(`Updated "${payload.post.title}".`);
			}
		} catch (error) {
			blogComposerError.value = readApiErrorMessage(
				error,
				editingPostId === null ? 'Failed publishing blog post.' : 'Failed updating blog post.'
			);
		} finally {
			blogComposerSaving.value = false;
		}
	}

	async function deleteSelectedBlogPost() {
		if (
			!signedInAsAdmin.value ||
			blogComposerSaving.value ||
			blogDeletingPostId.value !== null ||
			!selectedBlogPost.value
		) {
			return;
		}

		const post = selectedBlogPost.value;
		const shouldDelete = window.confirm(`Delete "${post.title}"? This cannot be undone.`);
		if (!shouldDelete) return;

		blogComposerError.value = '';
		blogDeletingPostId.value = post.id;
		try {
			const payload = await $fetch<{ deletedId: number }>(`/api/blog/posts/${post.id}`, {
				method: 'DELETE'
			});
			blogPosts.value = blogPosts.value.filter((entry: BlogPost) => entry.id !== payload.deletedId);
			if (selectedBlogPostId.value === payload.deletedId) {
				selectedBlogPostId.value = blogPosts.value[0]?.id ?? null;
			}
			if (blogEditingPostId.value === payload.deletedId) {
				resetBlogComposer();
			}
			pushStatus(`Deleted "${post.title}".`);
		} catch (error) {
			blogComposerError.value = readApiErrorMessage(error, 'Failed deleting blog post.');
		} finally {
			blogDeletingPostId.value = null;
		}
	}

	function formatBlogTimestamp(value: string) {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleString();
	}

	function selectBlogPost(postId: number) {
		selectedBlogPostId.value = postId;
	}

	function renderBlogMarkdown(content: string) {
		const source = content.trim().length > 0 ? content : '_No content._';
		return markdownRenderer.render(source);
	}

	return {
		refreshAuthSession,
		loadBlogPosts,
		resetBlogComposer,
		beginEditingBlogPost,
		cancelEditingBlogPost,
		submitBlogPost,
		deleteSelectedBlogPost,
		formatBlogTimestamp,
		selectBlogPost,
		renderBlogMarkdown
	};
}
