import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
	css: ['~/src/assets/main.css'],
	devtools: { enabled: true },
	runtimeConfig: {
		databaseUrl: process.env.DATABASE_URL ?? '',
		adminPassword: process.env.ADMIN_PASSWORD ?? '',
		authSessionSecret: process.env.AUTH_SESSION_SECRET ?? ''
	}
});
