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
</script>

<svelte:window {onkeydown} />

<a
	href="#main"
	class="sr-only z-[60] bg-ant-green px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
	>Skip to content</a
>

<header class="sticky top-0 z-50 border-b-2 border-ant-black bg-ant-white">
	<div class="wrap flex h-16 items-center justify-between gap-4">
		<a href="/#home" class="flex shrink-0 items-center" onclick={close}>
			<img src="/brand/ANT_logo.svg" alt="ANT, Adaptive Network of Trust — home" class="h-8 w-auto" width="96" height="32" />
		</a>

		<nav aria-label="Main" class="hidden md:block">
			<ul class="flex items-center gap-1">
				{#each nav as item (item.href)}
					<li>
						<a
							href={item.href}
							aria-current={isCurrent(item.href) ? 'page' : undefined}
							class="block px-3 py-2 text-[0.95rem] font-bold underline-offset-[6px] hover:underline aria-[current=page]:bg-ant-black aria-[current=page]:text-ant-white"
							>{item.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>

		<button
			id="menu-toggle"
			type="button"
			class="flex h-12 min-w-12 items-center justify-center gap-2 border-2 border-ant-black px-3 font-bold md:hidden"
			aria-expanded={open}
			aria-controls="mobile-menu"
			onclick={() => (open = !open)}
		>
			<span aria-hidden="true" class="relative block h-3.5 w-5">
				<span class="absolute left-0 h-0.5 w-5 bg-ant-black transition-transform {open ? 'top-1.5 rotate-45' : 'top-0'}"></span>
				<span class="absolute top-1.5 left-0 h-0.5 w-5 bg-ant-black {open ? 'opacity-0' : ''}"></span>
				<span class="absolute left-0 h-0.5 w-5 bg-ant-black transition-transform {open ? 'top-1.5 -rotate-45' : 'top-3'}"></span>
			</span>
			Menu
		</button>
	</div>

	{#if open}
		<nav id="mobile-menu" aria-label="Main" class="border-t-2 border-ant-black bg-ant-white md:hidden">
			<ul class="wrap py-2">
				{#each nav as item (item.href)}
					<li class="border-b border-ant-grey last:border-0">
						<a
							href={item.href}
							onclick={close}
							aria-current={isCurrent(item.href) ? 'page' : undefined}
							class="block py-4 text-xl font-bold">{item.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</header>
