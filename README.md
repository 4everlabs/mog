![logo](public/logo.png)

<div align="center">

## the ultimate harness for marketing and growth analysis

**The future of AI-powered marketing automation built with end-to-end TypeScript type safety.**

[![bun](https://img.shields.io/badge/bun-1.3.11-fffeaa?logo=bun&style=for-the-badge)](https://bun.com)
[![4ever](https://img.shields.io/badge/4ever.ai-v1.0-7C3AED?style=for-the-badge)](https://4ever.ai)
[![vercel](https://img.shields.io/badge/vercel-000000?logo=vercel&style=for-the-badge)](https://vercel.com)
[![ai-sdk](https://img.shields.io/badge/ai_sdk-v0.0.1-000000?logo=ai&style=for-the-badge)](https://sdk.vercel.ai)
[![chat-sdk](https://img.shields.io/badge/chat_sdk-v1.0-00DC82?style=for-the-badge)](https://vercel.com/docs/ai-sdk-chat)
[![svelte](https://img.shields.io/badge/svelte-5.0-FF3E00?logo=svelte&style=for-the-badge)](https://svelte.dev)
[![oxlint](https://img.shields.io/badge/oxlint-passing-7C3AED?style=for-the-badge)](https://oxlint.com)

</div>

---

## Why Focus Wins

MOG is not trying to be a do-everything chatbot. It is a focused marketing agent.

That matters because agent performance usually breaks down in three places: too many tools, too much irrelevant context, and weak long-horizon execution. A focused agent keeps the tool surface small, the memory domain-specific, and the success criteria measurable. Instead of wasting tokens deciding what kind of assistant it should be, it can stay locked on audience research, content generation, posting, campaign iteration, and analytics.

For marketing workflows, focus gives you a practical edge:

- fewer wrong tool calls
- less context drift across long tasks
- lower latency and lower token cost
- more repeatable outputs across the same campaign loop
- easier evaluation against real business metrics

This is the architecture bet behind MOG. We would rather build an agent that is excellent at marketing work than a generic assistant that can talk about everything and finish less.

## Benchmarks Support The Same Pattern

Public agent benchmarks increasingly reward systems that are trained, scoped, or architected for a specific task family instead of relying on a single general-purpose chat loop.

| Benchmark | Focused approach | Published result | Why it matters |
|-------|------------|------------|------------|
| OSWorld | AgentStore | Improved OSWorld success from 11.21% to 23.85% | Integrating specialist agents more than doubled the earlier result on a hard computer-use benchmark |
| OSWorld | Agent S2 | Reported 18.9% and 32.7% relative gains over leading baselines on 15-step and 50-step evals | Composing generalist and specialist components lifted real GUI task performance |
| WebArena-Lite | WebRL | Reached 42.4% with Llama-3.1-8B and 43.0% with GLM-4-9B | Task-trained web agents beat GPT-4-Turbo at 17.6%, GPT-4o at 13.9%, and prior AutoWebGLM at 18.2% |
| SWE-Skills-Bench | Specialized skills that actually matched the task | Only 7 of 49 skills produced meaningful gains, but the best improved pass rates by up to 30% | The lesson is not "add more agent layers." It is "use the right focused skill for the right job." |

The benchmark takeaway is simple: focused agents score higher when the focus is real. The win comes from constraining the problem, shaping the toolset, and optimizing around a concrete workflow instead of chasing vague generality.

## Why That Matters For Marketing

Marketing is a strong fit for focused agents because the loop is narrow, repetitive, and measurable:

- research accounts, competitors, and narratives
- generate hooks, posts, replies, and campaigns
- publish through a small number of channels
- watch engagement data and iterate quickly

That kind of work benefits from shared memory, reusable tools, and tight domain context. It does not benefit from turning the agent into a universal desktop operator on every request.

MOG is built around that idea. A focused marketing agent should be faster, cheaper, easier to steer, and easier to benchmark than a bloated general-purpose agent.

## Why TypeScript?

We chose TypeScript for **end-to-end type safety** from the AI agent all the way to the UI. This isn't an accident - it's a deliberate architectural decision.

### System Languages Won't Cut It

Languages like Rust, Go, and C++ might be great for systems programming, but they're terrible for AI agent development:

- **No seamless AI SDK integration** - Vercel AI SDK is built for TypeScript
- **Slow iteration** - Dynamic typing means faster prototyping for AI workflows
- **No Svelte support** - The best web GUI framework is TypeScript-first
- **Harder to maintain** - AI agents change rapidly; static languages slow you down

TypeScript gives you **compile-time guarantees** that your agent's logic, tools, and UI all speak the same language. When your Twitter tool returns a `Tweet` type, your UI knows exactly what fields are available. No runtime type errors. No guesswork.

## Built on Bun

[Bun](https://bun.com) is the fastest JavaScript runtime alive. We use Bun because:

- ⚡ **Blazing fast startup** - Your agent boots in milliseconds
- 📦 **Native bundling** - No need for webpack or vite
- 🔧 **First-class TypeScript** - No compilation step needed
- 💾 **Ultra-fast package installation** - Dependencies install in under a second

Bun isn't just faster - it's **the runtime AI agents deserve**.

## Vercel AI SDK + 4ever.ai

We use **Vercel AI SDK** for streaming AI responses and **4ever.ai** as our default model provider. This combo gives you:

- 🤖 **Streaming AI responses** - See tokens as they're generated
- 🔄 **Unified AI interface** - Swap models without changing code
- 🎯 **Smart tool calling** - AI decides when to use your marketing tools
- 💰 **Cost-effective** - 4ever.ai offers competitive pricing

The AI SDK's `generateText` and `streamText` APIs integrate perfectly with our TypeScript tool system. Define a tool, export its schema, and the AI calls it automatically.

## Free Twitter Data Through X Framework

We've built a **special X framework** that provides free access to Twitter data. No expensive API subscriptions. No rate limit nightmares.

Our framework includes:

- 📊 **Twitter Feed Reader** - Fetch any user's timeline instantly
- 🐦 **Tweet Manager** - Post, retweet, and engage programmatically
- 🔍 **Search API** - Find tweets by keyword, user, or hashtag
- 📈 **Analytics** - Track engagement without paying for Twitter API

All of this is **free** because we built it right. Use our tools to power your marketing campaigns without bleeding money on API costs.

## Web GUI Built in Svelte

Our web interface is built with **Svelte 5** - the fastest frontend framework:

- ⚡ **No virtual DOM** - Direct DOM updates mean blazing performance
- 🎨 **Reactive by default** - State changes automatically update the UI
- 📱 **Mobile-ready** - Responsive design works on every device
- 🔗 **Type-safe** - Svelte works perfectly with our TypeScript types

## Desktop App Coming Soon

Native desktop app with full system integration. Run your marketing agent 24/7 without keeping a browser open.

---

## Features

- 🤖 AI-powered marketing automation
- 📊 Campaign management and analytics
- 📧 Email and social media integration
- 🎯 Audience targeting and segmentation
- 🐦 Free Twitter data through our X framework
- 🌐 Web GUI in Svelte
- 🖥️ Desktop app coming soon

## Getting Started

```bash
# Install dependencies
bun install

# Run the agent
bun run index.ts
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Language | TypeScript |
| AI Framework | Vercel AI SDK |
| Model Provider | 4ever.ai |
| Web UI | Svelte 5 |
| Linting | oxlint |
| Deployment | Vercel |

## Benchmark References

Benchmarks move fast. The numbers above are drawn from public sources available as of March 26, 2026.

- [AgentStore: Scalable Integration of Heterogeneous Agents As Specialized Generalist Computer Assistant](https://arxiv.org/abs/2410.18603)
- [Agent S2: A Compositional Generalist-Specialist Framework for Computer Use Agents](https://arxiv.org/abs/2504.00906)
- [WebRL: Training LLM Web Agents via Self-Evolving Online Curriculum Reinforcement Learning](https://arxiv.org/abs/2411.02337)
- [SWE-Skills-Bench: Do Agent Skills Actually Help in Real-World Software Engineering?](https://arxiv.org/abs/2603.15401)
- [WebArena: A Realistic Web Environment for Building Autonomous Agents](https://arxiv.org/abs/2307.13854)

## License

MIT
