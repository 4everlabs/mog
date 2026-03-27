<script lang="ts">
	const altCommand = 'npx mog@latest';
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
			<div class="terminal-shell__bar-meta">
				<p class="terminal-shell__title">mog://landing</p>
				<a
					class="github-link"
					href="https://github.com/"
					target="_blank"
					rel="noreferrer"
					aria-label="MOG GitHub"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.94c-2.93.64-3.55-1.24-3.55-1.24-.48-1.22-1.17-1.55-1.17-1.55-.96-.66.07-.65.07-.65 1.06.08 1.62 1.08 1.62 1.08.94 1.62 2.47 1.15 3.08.88.1-.68.37-1.15.67-1.42-2.34-.27-4.8-1.17-4.8-5.23 0-1.16.41-2.1 1.08-2.84-.11-.27-.47-1.36.1-2.83 0 0 .88-.28 2.89 1.08a10.1 10.1 0 0 1 5.26 0c2.01-1.36 2.89-1.08 2.89-1.08.57 1.47.21 2.56.1 2.83.67.74 1.08 1.68 1.08 2.84 0 4.07-2.46 4.96-4.8 5.22.38.33.72.97.72 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z"
						/>
					</svg>
					<span>github</span>
				</a>
			</div>
		</div>

		<div class="terminal-shell__body">
			<img class="logo" src="/logo.png" alt="MOG logo" />

			<p class="eyebrow">
				<span class="eyebrow__prompt">$</span>
				<span class="eyebrow__text">./launch_mog</span>
			</p>

			<p class="accent-line">
				"Do not think that I have come to bring peace to the earth; I have not come to
				bring peace, but a sword" -Jesus
			</p>

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

					<div class="copy-button-wrap">
						<button
							class="copy-button"
							type="button"
							aria-describedby="install-status-popup"
							aria-label="Install command availability"
						>
							copy
						</button>

						<div class="install-popup" id="install-status-popup" role="status" aria-live="polite">
							<span class="install-popup__title">[ install ]</span>
							<span class="install-popup__message">coming soon</span>
						</div>
					</div>
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

	.terminal-shell__bar-meta {
		display: flex;
		align-items: center;
		gap: 0.85rem;
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

	.github-link {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.32rem 0.5rem;
		border: 1px solid rgba(104, 181, 252, 0.18);
		background: rgba(104, 181, 252, 0.04);
		color: var(--blue);
		font-size: 0.68rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		text-decoration: none;
		text-transform: uppercase;
		transition:
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease,
			transform 160ms ease;
	}

	.github-link svg {
		width: 0.9rem;
		height: 0.9rem;
		fill: currentColor;
	}

	.github-link:hover,
	.github-link:focus-visible {
		border-color: rgba(224, 175, 104, 0.4);
		background: rgba(224, 175, 104, 0.08);
		color: var(--yellow);
		outline: none;
		transform: translateY(-1px);
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

	.copy-button-wrap {
		position: relative;
		flex: 0 0 auto;
	}

	.copy-button:hover,
	.copy-button:focus-visible {
		border-color: rgba(224, 175, 104, 0.4);
		background: rgba(224, 175, 104, 0.1);
		color: var(--yellow);
		transform: translateY(-1px);
		outline: none;
	}

	.install-popup {
		position: absolute;
		right: 0;
		bottom: calc(100% + 0.65rem);
		display: grid;
		gap: 0.3rem;
		min-width: 7.5rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid rgba(104, 181, 252, 0.2);
		background: rgba(0, 0, 0, 0.96);
		box-shadow: 0 0 0 1px rgba(224, 175, 104, 0.08);
		opacity: 0;
		pointer-events: none;
		transform: translateY(0.25rem);
		transition:
			opacity 140ms ease,
			transform 140ms ease;
	}

	.install-popup::after {
		content: '';
		position: absolute;
		right: 1rem;
		top: 100%;
		width: 0.6rem;
		height: 0.6rem;
		border-right: 1px solid rgba(104, 181, 252, 0.2);
		border-bottom: 1px solid rgba(104, 181, 252, 0.2);
		background: rgba(0, 0, 0, 0.96);
		transform: translateY(-0.32rem) rotate(45deg);
	}

	.copy-button-wrap:hover .install-popup,
	.copy-button-wrap:focus-within .install-popup {
		opacity: 1;
		transform: translateY(0);
	}

	.install-popup__title {
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--blue);
	}

	.install-popup__message {
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: var(--muted);
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
		.hero {
			place-items: start center;
			padding-block: 1rem max(2.75rem, env(safe-area-inset-bottom));
			overflow: visible;
		}

		.terminal-shell__bar {
			padding-inline: 0.85rem;
		}

		.terminal-shell__bar-meta {
			gap: 0.6rem;
		}

		.github-link span {
			display: none;
		}

		.command-card,
		.command-line {
			padding-inline: 0.9rem;
		}

		.copy-button,
		.download-link {
			width: 100%;
		}

		.copy-button-wrap {
			width: 100%;
		}

		.install-popup {
			left: 0;
			right: auto;
			bottom: calc(100% + 0.55rem);
		}

		.install-popup::after {
			left: 1rem;
			right: auto;
		}

		.command-card__header,
		.meta-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
