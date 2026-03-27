<script lang="ts">
	import { onMount } from 'svelte';
	import { Renderer, JsonUIProvider, defineRegistry, schema as jsonSchema } from '@json-render/svelte';
	import { z } from 'zod';
	import type { Spec } from '@json-render/core';

	// Adaptive Cards Catalog - based on https://json-render.dev/docs/adaptive-cards
	const adaptiveCatalog = jsonSchema.defineCatalog({
		components: {
			AdaptiveCard: {
				description: 'Root Adaptive Card container',
				props: z.object({
					version: z.string().default('1.5'),
					body: z.array(z.unknown()).optional(),
					actions: z.array(z.unknown()).optional(),
					fallbackText: z.string().optional(),
					minHeight: z.string().optional(),
				}),
			},
			TextBlock: {
				description: 'Displays text with formatting options',
				props: z.object({
					text: z.string(),
					size: z.enum(['small', 'default', 'medium', 'large', 'extraLarge']).optional(),
					weight: z.enum(['lighter', 'default', 'bolder']).optional(),
					color: z.enum(['default', 'dark', 'light', 'accent', 'good', 'warning', 'attention']).optional(),
					wrap: z.boolean().optional(),
					isSubtle: z.boolean().optional(),
					maxLines: z.number().optional(),
				}),
			},
			Image: {
				description: 'Displays an image',
				props: z.object({
					url: z.string(),
					altText: z.string().optional(),
					size: z.enum(['auto', 'stretch', 'small', 'medium', 'large']).optional(),
					style: z.enum(['default', 'person']).optional(),
				}),
			},
			Container: {
				description: 'Groups elements together',
				props: z.object({
					items: z.array(z.unknown()),
					style: z.enum(['default', 'emphasis', 'good', 'attention', 'warning', 'accent']).optional(),
				}),
			},
			'Input.Text': {
				description: 'Text input field',
				props: z.object({
					id: z.string(),
					placeholder: z.string().optional(),
					label: z.string().optional(),
					value: z.string().optional(),
					isMultiline: z.boolean().optional(),
				}),
			},
		},
		actions: {
			submit: { description: 'Submit form data' },
			openUrl: { description: 'Open a URL' },
		},
	});

	// Registry with Svelte component implementations
	const { registry } = defineRegistry(adaptiveCatalog, {
		components: {
			AdaptiveCard: ({ props, children }) => {
				return {
					// The renderer will handle the root
					component: 'div',
					props: { class: 'adaptive-card', style: 'max-width: 400px; margin: 0 auto;' },
					children,
				};
			},
			TextBlock: ({ props }) => {
				const sizeMap = {
					small: '0.875rem',
					default: '1rem',
					medium: '1.125rem',
					large: '1.5rem',
					extraLarge: '2rem',
				};
				const weightMap = {
					lighter: '300',
					default: '400',
					bolder: '700',
				};
				return {
					component: 'div',
					props: {
						style: `
							font-size: ${sizeMap[props.size || 'default'] || '1rem'};
							font-weight: ${weightMap[props.weight || 'default'] || '400'};
							color: ${props.color === 'accent' ? '#22c55e' : 'inherit'};
							margin-bottom: 0.75rem;
							white-space: ${props.wrap === false ? 'nowrap' : 'normal'};
						`,
					},
					children: [props.text],
				};
			},
			Image: ({ props }) => ({
				component: 'img',
				props: {
					src: props.url,
					alt: props.altText || '',
					style: 'max-width: 100%; border-radius: 8px; margin: 0.5rem 0;',
				},
			}),
			Container: ({ props, children }) => ({
				component: 'div',
				props: { class: 'container', style: 'padding: 1rem; border: 1px solid #333; border-radius: 8px; margin: 0.5rem 0;' },
				children,
			}),
			'Input.Text': ({ props, emit }) => ({
				component: 'div',
				children: [
					props.label && { component: 'label', children: [props.label] },
					{
						component: 'input',
						props: {
							type: 'text',
							placeholder: props.placeholder || '',
							value: props.value || '',
							style: 'width: 100%; padding: 0.75rem; background: #222; border: 1px solid #444; border-radius: 6px; color: white; margin-top: 0.25rem;',
							oninput: (e: any) => {
								// In real use this would update state via bindings
								console.log('Input changed:', props.id, e.target.value);
							},
						},
					},
				],
			}),
		},
		actions: {
			submit: async (params: any) => {
				console.log('Form submitted:', params);
				alert('Adaptive Card action triggered: ' + JSON.stringify(params, null, 2));
			},
			openUrl: (params: any) => {
				if (params.url) window.open(params.url, '_blank');
			},
		},
	});

	// Sample Adaptive Cards
	let currentSpec: Spec | null = $state(null);

	const sampleCards = [
		{
			name: "Welcome Card",
			spec: {
				root: "card1",
				elements: {
					card1: {
						type: "AdaptiveCard",
						version: "1.5",
						body: [
							{ type: "TextBlock", text: "Hello from JSON Render!", size: "large", weight: "bolder" },
							{ type: "Image", url: "https://picsum.photos/id/1015/600/400", altText: "Demo image" },
							{ type: "TextBlock", text: "This card was rendered from a JSON spec using the @json-render/svelte package.", wrap: true },
						],
					},
				},
			} as Spec,
		},
		{
			name: "Form Card",
			spec: {
				root: "card2",
				elements: {
					card2: {
						type: "AdaptiveCard",
						version: "1.5",
						body: [
							{ type: "TextBlock", text: "Contact Us", size: "large", weight: "bolder" },
							{ type: "Input.Text", id: "name", label: "Your Name", placeholder: "Enter name..." },
							{ type: "Input.Text", id: "message", label: "Message", placeholder: "Your message...", isMultiline: true },
						],
					},
				},
			} as Spec,
		},
	];

	function loadSample(index: number) {
		currentSpec = sampleCards[index].spec;
	}

	let jsonInput = $state(JSON.stringify(sampleCards[0].spec, null, 2));

	function loadFromEditor() {
		try {
			const parsed = JSON.parse(jsonInput);
			currentSpec = parsed as Spec;
		} catch (e) {
			alert('Invalid JSON: ' + (e as Error).message);
		}
	}

	onMount(() => {
		// Load first sample
		loadSample(0);
	});
</script>

<div class="header">
	<div class="logo">JSON•RENDER</div>
	<div style="font-size: 0.9rem; color: #666;">Adaptive Cards Demo • Svelte 5 + Bun</div>
</div>

<div class="container">
	<!-- Left: Controls & Editor -->
	<div class="panel">
		<h2>Controls</h2>
		
		<div class="tabs">
			{#each sampleCards as sample, i}
				<div 
					class="tab" 
					class:active={currentSpec === sample.spec}
					onclick={() => loadSample(i)}
				>
					{sample.name}
				</div>
			{/each}
		</div>

		<h2 style="margin-top: 2rem;">JSON Editor</h2>
		<textarea 
			bind:value={jsonInput}
			class="json-editor"
			spellcheck="false"
		></textarea>
		
		<button onclick={loadFromEditor} style="margin-top: 1rem; width: 100%;">
			Render from JSON
		</button>

		<pre style="margin-top: 2rem; font-size: 0.7rem; max-height: 200px; overflow: auto;">
{JSON.stringify(currentSpec, null, 2)}
		</pre>
	</div>

	<!-- Right: Live Render -->
	<div class="panel">
		<h2>Live Preview</h2>
		
		<div class="demo-area">
			{#if currentSpec}
				<JsonUIProvider>
					<Renderer 
						spec={currentSpec} 
						registry={registry} 
					/>
				</JsonUIProvider>
			{:else}
				<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #555; text-align: center;">
					Select a sample or edit JSON to see the Adaptive Card rendered here.
				</div>
			{/if}
		</div>

		<div style="margin-top: 1.5rem; font-size: 0.8rem; color: #666;">
			This demonstrates a production-ready surface for rendering JSON UI specs (including Microsoft Adaptive Cards) using 
			<a href="https://json-render.dev" target="_blank" style="color: #22c55e;">json-render.dev</a>.
			<br><br>
			Perfect for AI-generated UIs, bot responses, dynamic forms, and more.
		</div>
	</div>
</div>

<style>
	:global(.adaptive-card) {
		background: white;
		color: black;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.4);
	}
	
	:global(input:focus) {
		outline: 2px solid #22c55e;
	}
</style>