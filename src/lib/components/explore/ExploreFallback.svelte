<script lang="ts">
	/**
	 * The same nine chapters as flat diagrams, shown when WebGL is unavailable
	 * or the GPU context is lost. Plain circles and lines: these are diagrams,
	 * not an imitation of the blob animation.
	 */
	let { index, reason }: { index: number; reason: string } = $props();

	const K = '#000000';
	const G = '#dddddd';
	const W = '#ffffff';
	const A = '#c5d92f';

	const houses: [number, number][] = [
		[150, 130],
		[650, 130],
		[110, 300],
		[690, 300],
		[170, 450],
		[630, 450],
		[400, 90],
		[400, 480]
	];
	const others: [number, number][] = [
		[130, 110],
		[670, 130],
		[650, 440]
	];
	const kitItems = ['Visual Language Kit', 'Neighbourhood Map', 'Community Cards', 'Paper Profiles', 'Interest Tokens', 'Blob Signage'];
</script>

{#snippet house(x: number, y: number)}
	<path d="M{x - 30} {y + 26}v-30l30-24 30 24v30z" fill={W} stroke={K} stroke-width="2" />
{/snippet}

{#snippet person(x: number, y: number, name: string)}
	<circle cx={x} cy={y - 34} r="13" fill={K} />
	<path d="M{x - 24} {y + 14}c0-22 10-32 24-32s24 10 24 32z" fill={K} />
	<text {x} y={y + 38} text-anchor="middle" font-size="18">{name}</text>
{/snippet}

{#snippet blob(x: number, y: number, r: number, name: string)}
	<circle cx={x} cy={y} {r} fill={A} />
	<text {x} y={y + 6} text-anchor="middle" font-size="18" font-weight="700">{name}</text>
{/snippet}

{#snippet chip(x: number, y: number, w: number, label: string, on: boolean)}
	<rect x={x - w / 2} y={y - 17} width={w} height="34" rx="17" fill={on ? A : W} stroke={on ? A : K} />
	<text {x} y={y + 5} text-anchor="middle" font-size="14" font-weight="700" letter-spacing="0.6">{label.toUpperCase()}</text>
{/snippet}

{#snippet card(x: number, y: number, name: string, tokens: number, covered: boolean)}
	<rect {x} {y} width="150" height="200" fill={W} stroke={K} stroke-width="2" />
	<rect x={x + 12} y={y + 12} width="50" height="50" fill={G} />
	<text x={x + 72} y={y + 46} font-size="24" font-weight="700">{name}</text>
	{#if covered}
		<rect {x} y={y + 76} width="150" height="124" fill={K} />
		<text x={x + 75} y={y + 144} text-anchor="middle" font-size="16" font-weight="700" fill={W}>PRIVATE</text>
	{:else}
		<path d="M{x + 12} {y + 88}h126M{x + 12} {y + 106}h126M{x + 12} {y + 124}h80" stroke={K} stroke-width="2" />
		{#each Array(tokens) as _, i (i)}
			<circle cx={x + 30 + i * 40} cy={y + 164} r="16" fill={A} />
		{/each}
	{/if}
{/snippet}

<div class="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
	<svg viewBox="0 0 800 560" class="h-auto max-h-[calc(100%-3rem)] w-full max-w-[46rem]" aria-hidden="true" font-family="var(--font-sans)" fill={K}>
		{#if index === 0 || index === 8}
			{#if index === 8}<rect width="800" height="560" fill={A} />{/if}
			{#each houses as [x, y] (x + '-' + y)}
				<path d="M400 290L{x} {y}" stroke={K} stroke-width="2" />
			{/each}
			{#each houses as [x, y] (x + '-' + y)}
				<circle cx={x} cy={y} r="46" fill={index === 8 ? K : A} />
				{@render house(x, y - 4)}
			{/each}
			<circle cx="400" cy="290" r="70" fill={index === 8 ? K : A} />
			<text x="400" y="296" text-anchor="middle" font-size="18" font-weight="700" fill={index === 8 ? W : K}>Local Blob</text>
		{:else if index === 1}
			<rect x="160" y="400" width="480" height="110" fill={K} />
			<text x="184" y="462" font-size="26" font-weight="700" fill={W}>Blackout Communication Kit</text>
			{#each kitItems as t, i (t)}
				<rect x={52 + i * 118} y={130 + Math.abs(i - 2.5) * 22} width="106" height="150" fill={W} stroke={K} stroke-width="2" />
				<text x={62 + i * 118} y={164 + Math.abs(i - 2.5) * 22} font-size="24" font-weight="700">{i + 1}</text>
				<foreignObject x={58 + i * 118} y={196 + Math.abs(i - 2.5) * 22} width="96" height="70">
					<p style="margin:0;font:700 12.5px/1.15 var(--font-sans);color:#000">{t}</p>
				</foreignObject>
			{/each}
		{:else if index === 2}
			<g transform="translate(250 40) scale(2)">{@render card(0, 0, 'Noor', 3, false)}</g>
			<text x="570" y="380" font-size="20" font-style="italic">+ fixing radios</text>
			{@render person(130, 420, 'Noor')}
		{:else if index === 3}
			{@render person(120, 300, 'Noor')}
			<g transform="translate(200 210) scale(0.6)">{@render card(0, 0, 'Noor', 3, false)}</g>
			<path d="M310 270h110m-14-12l14 12-14 12" fill="none" stroke={K} stroke-width="3" />
			{@render blob(560, 270, 110, 'Local Blob')}
			{@render blob(450, 150, 34, '')}
			{@render blob(690, 170, 34, '')}
			<text x="450" y="104" text-anchor="middle" font-size="16">Operator</text>
			<text x="690" y="124" text-anchor="middle" font-size="16">Operator</text>
			{@render chip(490, 450, 110, 'Public', true)}
			{@render chip(630, 450, 120, 'Private', false)}
		{:else if index === 4}
			<rect x="150" y="80" width="500" height="330" fill={K} />
			<g transform="translate(170 96) scale(1.5)">{@render card(0, 0, 'Sam', 2, false)}</g>
			<g transform="translate(405 96) scale(1.5)">{@render card(0, 0, 'Noor', 3, false)}</g>
			<path d="M275 342H450" stroke={K} stroke-width="5" />
			<text x="400" y="56" text-anchor="middle" font-size="18" font-weight="700">Blob booklet · public profiles</text>
			{@render chip(400, 470, 290, 'Shared interest: gardening', true)}
		{:else if index === 5}
			{@render person(110, 300, 'Sam')}
			<rect x="180" y="150" width="150" height="62" fill={W} stroke={K} stroke-width="2" />
			<text x="192" y="174" font-size="13" font-weight="700">REQUEST</text>
			<text x="192" y="198" font-size="14">to read your profile</text>
			<path d="M200 270h120m-14-12l14 12-14 12M480 270h80m-14-12l14 12-14 12" fill="none" stroke={K} stroke-width="3" />
			{@render blob(400, 270, 80, 'Local Blob')}
			<text x="400" y="390" text-anchor="middle" font-size="16">Held until Noor’s next visit</text>
			{@render card(590, 170, 'Noor', 3, true)}
			{@render chip(665, 420, 110, 'Accept', true)}
		{:else if index === 6}
			<rect x="40" y="110" width="170" height="250" fill={W} stroke={K} stroke-width="2" />
			<text x="56" y="140" font-size="13" font-weight="700">SYMBOL FORM</text>
			<rect x="56" y="154" width="138" height="110" fill="none" stroke={K} stroke-width="2" />
			<path d="M125 248v-50m0 14c0-22-16-30-34-30 0 20 14 30 34 30zm0-10c0-16 14-26 30-26 0 16-12 26-30 26z" fill="none" stroke={K} stroke-width="5" stroke-linejoin="round" />
			<path d="M56 290h138M56 312h138M56 334h90" stroke={K} stroke-width="2" />
			<path d="M226 235h50m-14-12l14 12-14 12M556 235h50m-14-12l14 12-14 12" fill="none" stroke={K} stroke-width="3" />
			<rect x="290" y="90" width="250" height="290" fill={W} stroke={K} stroke-width="2" />
			<text x="306" y="118" font-size="13" font-weight="700">PUBLIC SYMBOL BOARD</text>
			{#each Array(6) as _, i (i)}
				<rect x={306 + (i % 3) * 76} y={134 + Math.floor(i / 3) * 96} width="66" height="82" fill={i === 5 ? A : W} stroke={K} stroke-width="2" />
			{/each}
			<text x="306" y="362" font-size="13">Example symbols, for illustration</text>
			<path d="M690 330v-70" stroke={K} stroke-width="5" />
			<circle cx="690" cy="220" r="48" fill={A} stroke={K} stroke-width="4" />
			<text x="690" y="380" text-anchor="middle" font-size="16">The garden</text>
			<path d="M620 430h150" stroke={K} stroke-width="3" />
		{:else if index === 7}
			{#each others as [x, y] (x + '-' + y)}
				<path d="M340 320L{x} {y}" stroke={K} stroke-width="5" />
				<circle cx={340 + (x - 340) * 0.45} cy={320 + (y - 320) * 0.45} r="11" fill={A} stroke={K} stroke-width="3" />
				<circle cx={x} cy={y} r="56" fill={A} />
				<text {x} y={y + 5} text-anchor="middle" font-size="15">Another Blob</text>
				<rect x={x + 50} y={y - 66} width="34" height="44" fill={W} stroke={K} stroke-width="2" />
			{/each}
			{@render blob(340, 320, 84, 'Local Blob')}
			{@render chip(130, 520, 170, 'Profile copies', false)}
			{@render chip(420, 520, 360, 'With electricity: light through fibre', true)}
		{/if}
	</svg>
	<p class="max-w-[32rem] text-center text-sm">{reason}</p>
</div>
