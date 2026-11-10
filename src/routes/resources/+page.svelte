<script lang="ts">
	import { resources } from '#lib/content.js';
	import ResourcePreview from '#lib/components/resources/ResourcePreview.svelte';

	const statusLabel = { concept: 'Concept preview', 'coming-soon': 'Coming soon' } as const;
</script>

<svelte:head>
	<title>Resources — ANT, Adaptive Network of Trust</title>
	<meta
		name="description"
		content="Printable materials from the Blackout Communication Kit: posters, pictograms, map templates, cards, paper profiles, tokens and a preparation guide."
	/>
</svelte:head>

<section aria-labelledby="resources-title" class="border-b-2 border-ant-black bg-ant-green">
	<div class="wrap py-14 md:py-20">
		<p class="eyebrow">Resources</p>
		<h1 id="resources-title" class="section-title mt-3 max-w-[44rem]">Printable materials from the Blackout Communication Kit.</h1>
		<p class="mt-5 max-w-[40rem] text-lg leading-snug">
			Everything in the kit is made to be printed, shared and used offline. The designs are still in progress: each item
			shows whether it is a concept preview or coming soon.
		</p>
	</div>
</section>

<section class="wrap py-14 md:py-20" aria-label="Materials">
	<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each resources as r (r.id)}
			<li class="flex flex-col border-2 border-ant-black">
				<div class="border-b-2 border-ant-black">
					<ResourcePreview kind={r.preview} />
				</div>
				<div class="flex flex-1 flex-col p-5">
					<p class="text-sm font-bold">{r.category}</p>
					<h2 class="mt-1 text-xl">{r.title}</h2>
					<p class="mt-2 flex-1 leading-snug">{r.text}</p>
					<div class="mt-5">
						{#if r.file}
							<a href={r.file} download class="btn btn-primary">Download PDF</a>
						{:else}
							<span class="tag {r.status === 'concept' ? 'bg-ant-green' : 'bg-ant-grey'} border-ant-black">
								{statusLabel[r.status]}
							</span>
							<span class="sr-only">, no download available yet.</span>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>

	<div class="mt-14 grid gap-6 border-t-2 border-ant-black pt-10 md:grid-cols-2">
		<p class="text-lg leading-snug">
			<strong>Why no downloads yet?</strong> The final print files are not ready. Previews show the planned format so you
			know what to expect. Nothing here is a finished design.
		</p>
		<p class="leading-snug">
			All materials are for preparing <em>before</em> a blackout: getting to know neighbours, learning the symbols and
			practising together. This website is not a service for use during an emergency.
		</p>
	</div>
	<p class="mt-10"><a href="/#the-kit" class="font-bold underline underline-offset-4">← Explore the kit in 3D</a></p>
</section>
