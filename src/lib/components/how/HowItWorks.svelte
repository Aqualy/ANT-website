<script lang="ts">
	/** 01 How it works: the 3D infographic from /explore, embedded in the page. */
	import ExploreStage from '#lib/components/explore/ExploreStage.svelte';
</script>

<section id="how-it-works" aria-labelledby="how-title" class="pt-20 md:pt-28">
	<div class="wrap">
		<div class="section-head">
			<div>
				<p class="label">01 &nbsp;How it works</p>
				<h2 id="how-title" class="title mt-6 max-w-[16ch]">A network made of people, places and paper.</h2>
			</div>
			<p class="lead max-w-[30rem]">
				Walk through one neighbourhood as Noor joins ANT: from the kit at home to her local Blob, and from there to
				the next. Step through the chapters, or press Autoplay.
			</p>
		</div>

		<!-- The stage runs to the screen edges on phones, and sits in a rounded frame like the kit's from md up. -->
		<ExploreStage
			embedded
			class="-mx-5 mt-10 h-[min(88svh,52rem)] min-h-[36rem] border-y border-ant-black md:mx-0 md:rounded-[2rem] md:border lg:mt-14 lg:h-[min(80svh,46rem)]"
		/>

		<div class="mt-10 flex flex-col gap-6 border-t border-ant-black pt-8 pb-4 md:flex-row md:items-center md:justify-between">
			<p class="font-display max-w-[30ch] text-2xl leading-tight [font-variation-settings:'opsz'_72] md:text-3xl">
				No servers, no signal needed. Just neighbours who know where to look.
			</p>
			<a href="#the-kit" class="btn btn-ghost shrink-0">What you need to start <span class="arrow arrow-down" aria-hidden="true">↓</span></a>
		</div>
	</div>
</section>
