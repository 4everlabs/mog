<script lang="ts">
	const installCommand = 'curl -fsSL https://website.sh/install | sh';
	const altCommand = 'npx mog@latest';

	let copied = $state(false);
	let resetHandle: ReturnType<typeof setTimeout> | undefined;

	async function copyInstallCommand() {
		try {
			await navigator.clipboard.writeText(installCommand);
			copied = true;

			if (resetHandle) {
				clearTimeout(resetHandle);
			}

			resetHandle = setTimeout(() => {
				copied = false;
			}, 1600);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head>
	<meta
		name="description"
		content="MOG is a focused marketing agent for audience research, content, posting, and campaign feedback loops."
	/>
</svelte:head>

<section class="hero">
	<div class="hero__grid" aria-hidden="true"></div>

	<div class="terminal-shell">
		<div class="terminal-shell__bar">
			<div class="terminal-shell__lights" aria-hidden="true">
				<span class="terminal-shell__light terminal-shell__light--red"></span>
				<span class="terminal-shell__light terminal-shell__light--yellow"></span>
				<span class="terminal-shell__light terminal-shell__light--blue"></span>
			</div>
			<p class="terminal-shell__title">mog://landing</p>
		</div>

		<div class="terminal-shell__body">
			<img class="logo" src="/logo.png" alt="MOG logo" />

			<p class="eyebrow">
				<span class="eyebrow__prompt">$</span>
				<span class="eyebrow__text">./launch_mog</span>
			</p>

			<p class="accent-line">quietly opinionated software for marketers</p>

			<h1>The marketing agent that ships.</h1>

			<p class="lede">
				MOG is built for audience research, content creation, posting, and campaign loops
				that learn from what lands.
			</p>

			<p class="supporting-copy">
				Keep the stack lean, move fast, and stay locked on measurable output instead of
				generic chat.
			</p>

			<div class="command-card">
				<div class="command-card__header">
					<span class="command-card__label">quick install</span>
					<span class="command-card__meta">placeholder preview</span>
				</div>

				<div class="command-card__body">
					<code class="command-line">
						<span class="token token--prompt">$</span>
						<span class="token token--binary">curl</span>
						<span class="token token--flag"> -fsSL</span>
						<span class="token token--url"> https://website.sh/install</span>
						<span class="token token--pipe"> | </span>
						<span class="token token--binary">sh</span>
						<span class="cursor" aria-hidden="true"></span>
					</code>

					<button class="copy-button" type="button" onclick={copyInstallCommand}>
						{copied ? 'copied' : 'copy'}
					</button>
				</div>
			</div>

			<div class="meta-row">
				<div class="meta-row__command">
					<span class="meta-row__label">alt</span>
					<code aria-label={altCommand}>
						<span class="token token--prompt">$</span>
						<span class="token token--binary">npx</span>
						<span class="token token--package"> mog@latest</span>
					</code>
				</div>

				<a
					class="download-link"
					href="https://website.sh/download"
					target="_blank"
					rel="noreferrer"
				>
					download release
				</a>
			</div>

			<nav class="links" aria-label="Secondary links">
				<a href="https://website.sh/github" target="_blank" rel="noreferrer">GitHub</a>
				<a href="https://website.sh/docs" target="_blank" rel="noreferrer">Docs</a>
				<a href="https://website.sh/discord" target="_blank" rel="noreferrer">Discord</a>
			</nav>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 100vh;
		min-height: 100dvh;
		padding: clamp(1rem, 2vw, 1.5rem);
		overflow: hidden;
		isolation: isolate;
	}

	.hero__grid {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(var(--line) 1px, transparent 1px),
			linear-gradient(90deg, var(--line) 1px, transparent 1px);
		background-size: 100% 2.75rem, 2.75rem 100%;
		opacity: 0.5;
		pointer-events: none;
	}

	.terminal-shell {
		position: relative;
		width: min(100%, 46rem);
		overflow: hidden;
		border: 1px solid var(--panel-border);
		border-radius: 0;
		background: var(--panel);
	}

	.terminal-shell__bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--panel-border);
		background: rgba(255, 255, 255, 0.02);
	}

	.terminal-shell__lights {
		display: flex;
		gap: 0.55rem;
	}

	.terminal-shell__light {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 999px;
	}

	.terminal-shell__light--red {
		color: var(--red);
		background: var(--red);
	}

	.terminal-shell__light--yellow {
		color: var(--yellow);
		background: var(--yellow);
	}

	.terminal-shell__light--blue {
		color: var(--blue);
		background: var(--blue);
	}

	.terminal-shell__title {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 200;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.terminal-shell__body {
		display: grid;
		gap: clamp(0.75rem, 1.8vh, 1.1rem);
		padding: clamp(1.15rem, 2vw, 1.5rem);
	}

	.logo {
		width: min(100%, 16rem);
		margin: 0 auto 0.2rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		width: fit-content;
		margin: 0 auto;
		padding: 0.45rem 0.75rem;
		border: 1px solid rgba(224, 175, 104, 0.18);
		border-radius: 0;
		background: rgba(224, 175, 104, 0.06);
		font-size: 0.78rem;
		font-weight: 200;
		letter-spacing: 0.03em;
	}

	.eyebrow__prompt {
		color: var(--yellow);
		font-weight: 800;
	}

	.eyebrow__text {
		color: var(--text);
	}

	.accent-line {
		margin: -0.1rem auto 0.15rem;
		text-align: center;
		font-family: var(--font-serif);
		font-size: clamp(1.15rem, 1.7vw, 1.45rem);
		font-style: italic;
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.01em;
		color: var(--yellow);
		text-wrap: balance;
	}

	h1 {
		margin: 0;
		text-align: center;
		font-size: clamp(1.95rem, 4.2vw, 3.4rem);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.05em;
		color: var(--blue);
		text-wrap: balance;
	}

	.lede,
	.supporting-copy {
		max-width: 38rem;
		margin: 0 auto;
		text-align: center;
		line-height: 1.6;
		text-wrap: pretty;
	}

	.lede {
		font-size: clamp(0.95rem, 1vw + 0.55rem, 1.05rem);
		color: var(--text);
		font-weight: 320;
	}

	.supporting-copy {
		font-size: 0.88rem;
		color: var(--muted);
		font-weight: 320;
	}

	.command-card {
		display: grid;
		gap: 0.85rem;
		padding: 1rem;
		border: 1px solid rgba(247, 118, 142, 0.16);
		border-radius: 0;
		background: rgba(0, 0, 0, 0.8);
	}

	.command-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.72rem;
		font-weight: 200;
		text-transform: uppercase;
		letter-spacing: 0.14em;
	}

	.command-card__label {
		color: var(--yellow);
		font-weight: 300;
	}

	.command-card__meta {
		color: var(--muted);
	}

	.command-card__body {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.command-line {
		flex: 1 1 20rem;
		margin: 0;
		padding: 0.95rem 1rem;
		border: 1px solid rgba(104, 181, 252, 0.12);
		border-radius: 0;
		background: rgba(255, 255, 255, 0.02);
		font-size: 0.92rem;
		font-weight: 200;
		line-height: 1.65;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.copy-button {
		flex: 0 0 auto;
		min-width: 5.5rem;
		padding: 0.92rem 1rem;
		border: 1px solid rgba(104, 181, 252, 0.2);
		border-radius: 0;
		background: rgba(104, 181, 252, 0.08);
		color: var(--blue);
		font-weight: 200;
		letter-spacing: 0.08em;
		text-transform: lowercase;
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.copy-button:hover,
	.copy-button:focus-visible {
		border-color: rgba(224, 175, 104, 0.4);
		background: rgba(224, 175, 104, 0.1);
		color: var(--yellow);
		transform: translateY(-1px);
		outline: none;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem 1rem;
	}

	.meta-row__command {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.84rem;
		font-weight: 200;
		color: var(--text);
	}

	.meta-row__command code {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.meta-row__label {
		color: var(--red);
		font-weight: 300;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.download-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1rem;
		border: 1px solid rgba(247, 118, 142, 0.24);
		border-radius: 0;
		background: rgba(247, 118, 142, 0.08);
		color: var(--red);
		font-size: 0.84rem;
		font-weight: 200;
		letter-spacing: 0.06em;
		text-decoration: none;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.download-link:hover,
	.download-link:focus-visible {
		border-color: rgba(224, 175, 104, 0.44);
		background: rgba(224, 175, 104, 0.1);
		transform: translateY(-1px);
		outline: none;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.95rem 1.25rem;
		font-size: 0.8rem;
		font-weight: 200;
		letter-spacing: 0.04em;
		color: var(--muted);
	}

	.links a {
		text-decoration: none;
		transition: color 160ms ease;
	}

	.links a:hover,
	.links a:focus-visible {
		color: var(--blue);
		outline: none;
	}

	.token--prompt,
	.token--flag {
		color: var(--yellow);
	}

	.token--binary,
	.token--url,
	.token--package {
		color: var(--blue);
	}

	.token--pipe {
		color: var(--red);
	}

	.cursor {
		display: inline-block;
		width: 0.7ch;
		height: 1.05em;
		margin-left: 0.2rem;
		transform: translateY(0.18em);
		background: var(--yellow);
		animation: blink 1.1s steps(1) infinite;
	}

	@keyframes blink {
		0%,
		48% {
			opacity: 1;
		}

		50%,
		100% {
			opacity: 0;
		}
	}

	@media (max-width: 40rem) {
		.terminal-shell__bar {
			padding-inline: 0.85rem;
		}

		.command-card,
		.command-line {
			padding-inline: 0.9rem;
		}

		.copy-button,
		.download-link {
			width: 100%;
		}

		.command-card__header,
		.meta-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
