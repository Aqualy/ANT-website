<script lang="ts">
	import BlobBackground from './BlobBackground.svelte';
</script>

<section
	id="home"
	aria-labelledby="hero-title"
	class="relative isolate flex min-h-[calc(100svh-4rem)] items-end overflow-hidden bg-ant-green"
>
	<BlobBackground />

	<div class="wrap relative z-10 py-6 md:py-12">
		<div class="max-w-[40rem] border-2 border-ant-black bg-ant-white p-6 sm:p-8 md:p-10">
			<img
				src="/brand/ANT_logo.svg"
				alt="ANT"
				class="h-16 w-auto sm:h-20"
				width="240"
				height="80"
			/>
			<p class="eyebrow mt-5">Adaptive Network of Trust</p>
			<h1 id="hero-title" class="mt-3 text-[clamp(2rem,6vw,3.6rem)] leading-[1.02]">
				When the network goes down, our connections remain.
			</h1>
			<p class="mt-5 max-w-[34rem] text-lg leading-snug sm:text-xl">
				ANT helps neighbours build a physical communication network — people, places, symbols and paper —
				before digital services become unreliable.
			</p>
			<div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
				<a href="#how-it-works" class="btn btn-primary">See how it works <span aria-hidden="true">↓</span></a>
				<span class="text-sm">A preparation campaign for 2026–2035</span>
			</div>
		</div>
	</div>
</section>
