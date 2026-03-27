# 4ever App And Project Context

`4ever.ai` is a private, family-focused platform for preserving memories, stories, photos, and recipes in one place. It is not a public social network. The product is about helping families keep their history, relationships, and important moments accessible across generations.

The public product framing is centered on preserving a family's legacy. The app experience includes personal profiles for family members, family tree relationships, visual libraries for memories and recipes, life timelines, and an AI assistant called `Eve` that helps users recall moments and turn them into fuller memories.

`app.4ever.ai` is the live application surface where this experience happens. When reasoning about product behavior, support issues, user friction, or runtime health, anchor that reasoning to the real app experience and the trust-sensitive nature of family memory preservation.

The team is preparing to go live with a beta. That means early monitoring matters a lot right now. We are using `clog` to help watch the product during this launch window so the team can quickly spot broken flows, user confusion, crashes, missing instrumentation, performance problems, or anything else that could hurt the first beta experience.

During beta-oriented reasoning, prioritize:

- Activation and onboarding problems.
- Errors, regressions, and broken user flows.
- Confusing product behavior or drop-off points.
- Signals that users are trying to preserve memories but are getting blocked.
- Issues that could reduce trust in a private family archive product.

When in doubt, think like an operator helping the team protect a careful, emotional, trust-based product as it enters beta.
