<script lang="ts">
	/**
	 * Hosts the supplied, unmodified WebGL2 animation (static/blobs-background.html)
	 * as a decorative layer. The iframe is only mounted while the host is on/near
	 * screen, so no render loop runs when the hero is scrolled away. The supplied
	 * file handles cover-cropping, the 30s loop, reduced motion (still frame) and
	 * the no-WebGL2 fallback (plain #c5d92f) itself.
	 */
	let root: HTMLDivElement;
	let active = $state(false);

	$effect(() => {
		if (!('IntersectionObserver' in window)) {
			active = true;
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				active = entry.isIntersecting;
			},
			{ rootMargin: '120px 0px' }
		);
		observer.observe(root);
		return () => observer.disconnect();
	});
</script>

<div class="blob-bg" bind:this={root} aria-hidden="true">
	{#if active}
		<iframe src="/blobs-background.html" title="Decorative animated background" aria-hidden="true" tabindex="-1"></iframe>
	{/if}
</div>

<style>
	.blob-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
		/* Matches the animation's own background so there is no flash before WebGL starts. */
		background: #c5d92f;
	}
	iframe {
		display: block;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		pointer-events: none;
	}
</style>
