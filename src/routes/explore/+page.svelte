<script lang="ts">
	/** /explore: the 3D infographic full screen. The homepage embeds the same stage. */
	import ExploreStage from '#lib/components/explore/ExploreStage.svelte';
</script>

<svelte:head>
	<title>Explore how ANT works — ANT, Adaptive Network of Trust</title>
	<meta
		name="description"
		content="Step through the ANT system in a 3D neighbourhood: the Blackout Communication Kit, paper profiles, local Blobs, shared symbols and light between Blobs."
	/>
</svelte:head>

<section aria-labelledby="explore-title">
	<h1 id="explore-title" class="sr-only">How ANT works: a walk through the neighbourhood in nine chapters</h1>
	<ExploreStage class="h-[calc(100svh-var(--header-h))] min-h-[34rem] lg:min-h-[38rem]" />
</section>
