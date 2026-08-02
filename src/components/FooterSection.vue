<template>
	<footer class="portfolio-footer">
		<p>&copy; Okami {{ currentDate }}</p>
	</footer>
</template>

<script lang="ts">
export default {
	data() {
		return {
			currentDate: new Date().getFullYear()
		};
	}
};
</script>

<style scoped>
.portfolio-footer {
	color: #37405f;
	font-weight: 700;
}

.portfolio-footer p {
	margin: 0;
}
</style>
