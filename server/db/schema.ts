import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const blogPosts = pgTable(
	'blog_posts',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		slug: varchar('slug', { length: 190 }).notNull(),
		title: varchar('title', { length: 160 }).notNull(),
		excerpt: varchar('excerpt', { length: 400 }).notNull().default(''),
		content: text('content').notNull(),
		author: varchar('author', { length: 120 }).notNull().default('Okami'),
		published: boolean('published').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		slugUnique: uniqueIndex('blog_posts_slug_unique').on(table.slug),
		publishedCreatedIdx: index('blog_posts_published_created_idx').on(table.published, table.createdAt)
	})
);

export const chatMessages = pgTable(
	'chat_messages',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		name: varchar('name', { length: 48 }).notNull(),
		message: text('message').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		createdIdx: index('chat_messages_created_idx').on(table.createdAt)
	})
);
