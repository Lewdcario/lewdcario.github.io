import { z } from 'zod';
import { authSessionRoleSchema } from './auth';

export const blogPostSchema = z.object({
	id: z.number().int().nonnegative(),
	slug: z.string().min(1).max(190),
	title: z.string().min(1).max(160),
	excerpt: z.string().max(400),
	content: z.string().min(1),
	author: z.string().min(1).max(120),
	published: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string()
});

export const createBlogPostInputSchema = z.object({
	title: z.string().trim().min(3).max(160),
	excerpt: z.string().trim().max(400).optional().default(''),
	content: z.string().trim().min(20).max(20_000),
	author: z.string().trim().min(1).max(120).optional().default('Okami'),
	published: z.boolean().optional().default(true)
});

export const updateBlogPostInputSchema = createBlogPostInputSchema;

export const blogPostsResponseSchema = z.object({
	role: authSessionRoleSchema,
	posts: z.array(blogPostSchema)
});

export const blogPostResponseSchema = z.object({
	post: blogPostSchema
});

export const blogPostDeleteResponseSchema = z.object({
	deletedId: z.number().int().nonnegative()
});

export type BlogPost = z.infer<typeof blogPostSchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostInputSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostInputSchema>;
export type BlogPostsResponse = z.infer<typeof blogPostsResponseSchema>;
export type BlogPostResponse = z.infer<typeof blogPostResponseSchema>;
export type BlogPostDeleteResponse = z.infer<typeof blogPostDeleteResponseSchema>;
