<script lang="ts">
	import { prepareSteps } from '#lib/content.js';
</script>

<section id="get-involved" aria-labelledby="involved-title" class="on-dark border-t-2 border-ant-black bg-ant-black py-16 text-ant-white md:py-24">
	<div class="wrap">
		<p class="eyebrow text-ant-green">Get involved</p>
		<h2 id="involved-title" class="section-title mt-3 max-w-[48rem]">Four steps to prepare together.</h2>
		<p class="mt-5 max-w-[40rem] text-lg leading-snug text-ant-grey">
			You don't need special skills. Start small, on your own street, long before anything goes wrong.
		</p>

		<ol class="mt-12 grid gap-px bg-ant-white/40 sm:grid-cols-2 lg:grid-cols-4">
			{#each prepareSteps as step, i (step.title)}
				<li class="flex flex-col bg-ant-black p-6 pt-5 sm:min-h-[19rem]">
					<span class="text-sm font-bold text-ant-green">Step {i + 1}</span>
					<svg viewBox="0 0 96 96" class="mt-5 size-20" aria-hidden="true">
						{#if i === 0}
							<!-- Connect: two people linked -->
							<circle cx="24" cy="30" r="12" fill="#c5d92f" />
							<circle cx="72" cy="30" r="12" fill="#c5d92f" />
							<path d="M6 76a18 18 0 0 1 36 0Z M54 76a18 18 0 0 1 36 0Z" fill="#c5d92f" />
							<path d="M36 30h24" stroke="#fff" stroke-width="5" stroke-linecap="round" />
						{:else if i === 1}
							<!-- Learn: a sheet of symbols -->
							<rect x="14" y="10" width="68" height="76" fill="none" stroke="#fff" stroke-width="5" />
							<circle cx="34" cy="34" r="9" fill="#c5d92f" />
							<rect x="53" y="25" width="18" height="18" fill="#c5d92f" />
							<path d="M34 54l10 18H24Z" fill="#c5d92f" />
							<path d="M62 54l10 9-10 9-10-9Z" fill="#c5d92f" />
						{:else if i === 2}
							<!-- Prepare: a meeting point marker on a map grid -->
							<path d="M8 84h80M8 64h80M28 44v40M68 44v40" stroke="#fff" stroke-width="4" />
							<path d="M48 70c-4-10-18-18-18-32a18 18 0 0 1 36 0c0 14-14 22-18 32Z" fill="#c5d92f" />
							<circle cx="48" cy="38" r="6" fill="#000" />
						{:else}
							<!-- Practise: scenario cards -->
							<rect x="14" y="20" width="44" height="62" fill="none" stroke="#fff" stroke-width="5" transform="rotate(-10 36 51)" />
							<rect x="38" y="14" width="44" height="62" fill="#c5d92f" transform="rotate(8 60 45)" />
							<path d="M52 44h20M52 54h14" stroke="#000" stroke-width="5" transform="rotate(8 60 45)" />
						{/if}
					</svg>
					<h3 class="mt-6 text-3xl">{step.title}</h3>
					<p class="mt-2 leading-snug text-ant-grey">{step.description}</p>
				</li>
			{/each}
		</ol>

		<div class="mt-12 flex flex-col items-start gap-5 border-t-2 border-ant-white/40 pt-10 md:flex-row md:items-center md:justify-between">
			<p class="max-w-[38rem] text-lg leading-snug">
				Start with the printable materials from the Blackout Communication Kit. They are being designed now — see
				what is ready and what is coming.
			</p>
			<a href="/resources" class="btn btn-primary shrink-0 border-ant-green text-lg">Get the Kit <span aria-hidden="true">→</span></a>
		</div>
		<p class="mt-6 text-sm text-ant-grey">
			ANT does not yet run workshops or hubs. Any meeting places shown on this site are examples.
		</p>
	</div>
</section>
