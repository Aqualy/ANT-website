<script lang="ts">
	import Hero from '#lib/components/Hero.svelte';
	import HowItWorks from '#lib/components/how/HowItWorks.svelte';
	import KitSection from '#lib/components/kit/KitSection.svelte';
	import GetInvolved from '#lib/components/GetInvolved.svelte';
</script>

<svelte:head>
	<title>ANT — Adaptive Network of Trust</title>
	<meta
		name="description"
		content="ANT helps neighbours build a physical communication network before digital services become unreliable. Explore the Blackout Communication Kit."
	/>
</svelte:head>

<Hero />
<HowItWorks />
<KitSection />
<GetInvolved />
