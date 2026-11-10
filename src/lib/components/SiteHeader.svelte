<script lang="ts">
	import { nav } from '#lib/content.js';
	import { page } from '$app/state';

	let open = $state(false);

	function close() {
		open = false;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			document.getElementById('menu-toggle')?.focus();
		}
	}

	const isCurrent = (href: string) =>
		href === '/resources' ? page.url.pathname.startsWith('/resources') : false;
	// "Get the Kit" is the site's one standing action; hide it where it would point at itself.
	const onResources = $derived(page.url.pathname.startsWith('/resources'));
</script>

<svelte:window {onkeydown} />

<a
	href="#main"
	class="sr-only z-[60] rounded-full bg-ant-green px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
	>Skip to content</a
>

<header class="sticky top-0 z-50 bg-ant-grey">
	<div class="wrap">
		<div class="flex h-16 items-center justify-between gap-6 border-b border-ant-black">
			<a href="/" class="flex shrink-0 items-center" onclick={close}>
				<img src="/brand/ANT_logo.svg" alt="ANT, Adaptive Network of Trust — home" class="h-7 w-auto" width="84" height="28" />
			</a>

			<nav aria-label="Main" class="hidden md:block">
				<ul class="flex items-center gap-7 text-[0.9rem]">
					{#each nav as item (item.href)}
						<li>
							<a
								href={item.href}
								aria-current={isCurrent(item.href) ? 'page' : undefined}
								class="underline-offset-[6px] hover:underline aria-[current=page]:font-bold aria-[current=page]:underline"
								>{item.label}</a
							>
						</li>
					{/each}
					{#if !onResources}
						<li><a href="/resources" class="btn btn-primary btn-sm">Get the Kit</a></li>
					{/if}
				</ul>
			</nav>

			<button
				id="menu-toggle"
				type="button"
				class="btn btn-ghost btn-sm md:hidden"
				aria-expanded={open}
				aria-controls="mobile-menu"
				onclick={() => (open = !open)}
			>
				{open ? 'Close' : 'Menu'}
			</button>
		</div>
	</div>

	{#if open}
		<nav id="mobile-menu" aria-label="Main" class="border-b border-ant-black bg-ant-grey md:hidden">
			<ul class="wrap pt-2 pb-6">
				{#each nav as item (item.href)}
					<li class="border-b border-ant-black last:border-0">
						<a
							href={item.href}
							onclick={close}
							aria-current={isCurrent(item.href) ? 'page' : undefined}
							class="font-display block py-4 text-3xl [font-variation-settings:'opsz'_72]">{item.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</header>
