<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';

	let { children }: LayoutProps = $props();
</script>

<SiteHeader />
<main id="main">
	{@render children()}
</main>
<SiteFooter />
