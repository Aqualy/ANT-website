<script lang="ts">
	import { resources } from '#lib/content.js';
	import ResourcePreview from '#lib/components/resources/ResourcePreview.svelte';

	const statusLabel = { preview: 'Preview', 'coming-soon': 'Coming soon' } as const;
	const ready = resources.filter((r) => r.status === 'preview').length;
</script>

<svelte:head>
	<title>Resources — ANT, Adaptive Network of Trust</title>
	<meta
		name="description"
		content="Printable materials from the Blackout Communication Kit: posters, pictograms, map templates, cards, paper profiles, tokens and a preparation guide."
	/>
</svelte:head>

<section aria-labelledby="resources-title" class="pt-12 md:pt-20">
	<div class="wrap">
		<!-- First thing under the header's rule, so no second rule here. -->
		<div class="section-head border-t-0 pt-0">
			<div>
				<p class="label">Resources</p>
				<h1 id="resources-title" class="title mt-6 max-w-[18ch]">Printable materials from the Blackout Communication Kit.</h1>
			</div>
			<div class="max-w-[30rem]">
				<p class="lead">
					Everything in the kit is made to be printed, shared and used offline. The designs are still in progress.
				</p>
				<!-- Legend: green marks what you can already look at. -->
				<p class="mt-6 flex flex-wrap gap-3 text-sm">
					<span class="chip border-ant-green bg-ant-green">{ready} previews</span>
					<span class="chip">{resources.length - ready} coming soon</span>
				</p>
			</div>
		</div>
	</div>
</section>

<section class="wrap pt-12 pb-20 md:pt-16 md:pb-28" aria-label="Materials">
	<ul class="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
		{#each resources as r, i (r.id)}
			<li class="flex flex-col">
				<div class="overflow-hidden rounded-[1.5rem] bg-ant-white">
					<ResourcePreview kind={r.preview} />
				</div>
				<div class="mt-5 flex items-start justify-between gap-4 border-t border-ant-black pt-4">
					<p class="label">{String(i + 1).padStart(2, '0')} &nbsp;{r.category}</p>
					{#if !r.file}
						<span class="chip shrink-0 {r.status === 'preview' ? 'border-ant-green bg-ant-green' : ''}">
							{statusLabel[r.status]}
						</span>
					{/if}
				</div>
				<h2 class="mt-4 text-2xl md:text-3xl">{r.title}</h2>
				<p class="mt-2 flex-1 leading-snug">{r.text}</p>
				{#if r.file}
					<a href={r.file} download class="btn btn-primary mt-5 self-start">Download PDF</a>
				{:else}
					<span class="sr-only">No download available yet.</span>
				{/if}
			</li>
		{/each}
	</ul>

	<div class="mt-20 grid gap-8 border-t border-ant-black pt-8 md:grid-cols-2">
		<p class="lead">
			<strong>Why no downloads yet?</strong> The final print files are not ready. Previews show the format so you
			know what to expect.
		</p>
		<div>
			<p class="leading-snug">
				All materials are for preparing <em>before</em> a blackout: getting to know neighbours, learning the symbols and
				practising together.
			</p>
			<a href="/#the-kit" class="btn btn-ghost mt-6"><span aria-hidden="true">←</span> Explore the kit in 3D</a>
		</div>
	</div>
</section>
