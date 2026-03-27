<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		color-scheme: dark;
		--bg: #000;
		--bg-soft: #0a0a0a;
		--panel: #000;
		--panel-border: rgba(104, 181, 252, 0.18);
		--blue: #68b5fc;
		--yellow: #e0af68;
		--red: #f7768e;
		--text: #d4d4d4;
		--muted: #666;
		--line: rgba(224, 175, 104, 0.1);
		--font-mono:
			'Roboto Mono', 'SFMono-Regular', 'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace;
		--font-serif: 'Instrument Serif', 'Times New Roman', serif;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		overflow-x: hidden;
		overflow-y: auto;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-mono);
		font-weight: 300;
	}

	:global(body) {
		width: 100%;
		min-height: 100vh;
		min-height: 100dvh;
		margin: 0;
		overflow-x: hidden;
		overflow-y: auto;
		background: transparent;
		color: inherit;
		font-family: inherit;
		text-rendering: optimizeLegibility;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(button),
	:global(input),
	:global(textarea),
	:global(select) {
		font: inherit;
	}

	:global(a) {
		color: inherit;
	}

	:global(img) {
		display: block;
		max-width: 100%;
	}

	:global(code),
	:global(pre) {
		font-family: var(--font-mono);
	}

	:global(#svelte) {
		min-height: 100vh;
		min-height: 100dvh;
	}
</style>
