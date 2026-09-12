## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Architecture Decisions

- Location: `docs/adr/`
- Index: `docs/adr/README.md`
- Format: MADR with YAML front matter
- Only `accepted` ADRs are binding. Check status before relying on a decision.

## Spec-Driven Development

Before implementing any feature:

1. Read `docs/specs/README.md` to find a relevant spec.
2. Match your task to specs via **tags** and **description** — only load the relevant spec.
3. Read the ADRs listed in `adr_constraints` front matter.
4. Implement per the spec's implementation plan.
5. If a new architectural decision was made, draft an ADR and update the index.
6. When done, set spec `status: archived`. Do not delete the folder.

Template: `docs/specs/_TEMPLATE.md`
