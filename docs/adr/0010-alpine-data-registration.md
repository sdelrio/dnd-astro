---
status: accepted
date: 2026-09-26
supersedes: null
superseded_by: null
tags: [alpine, architecture, testing, components]
---

# ADR-0010: Register Alpine Components with `Alpine.data`, Never `window` Globals

## Context and Problem Statement

Every interactive component on the site was an Alpine component, and every one
of them attached its helpers to `window` so the inline `x-data` strings could
reach them:

- `DiceRoller.astro` assigned nine globals - eight `dice-utils` helpers plus
  the `diceRoller` factory - and the factory itself called them back through
  `window.rollAbility()`, `window.formatStats()` and six more.
- `PointBuy.astro` assigned eleven, partly working around itself by
  re-declaring seven of them on the returned object
  (`calculateModifier: window.calculateModifier`).
- `PartyView.astro` shipped an `is:inline` script assigning
  `window.partyView`.

Twenty globals across three files, and each one had three problems:

1. **They collide.** `formatModifier` and `calculateModifier` are generic names
   on the global object, and a page carrying two of these components would have
   whichever copy loaded last.
2. **No call site is type checked.** An Alpine expression is a string, so
   `window.formatModifier(...)` inside `x-text` is a lookup in a bag of globals
   that the compiler cannot see. Renaming a helper broke the expression at
   runtime and nowhere else.
3. **The markup and the logic were welded together.** A component's behaviour
   lived in a `<script>` block inside a `.astro` file, so nothing could test it
   without reading the file as text.

The trigger for the change was #328, a two-root `x-for` regression in the dice
roller. The panel holding the swap confirmation rendered nothing because Alpine
clones only a template's first element child, and every existing test passed:
they scanned the `.astro` source for strings, which were all correct. A test
suite that reads source cannot tell a working expression from a broken one.

## Decision Drivers

- An expression is a string, so the only net that catches a broken one is
  running it
- Behaviour that can be imported can be tested, and a test that runs Alpine is
  the only kind that covers the markup
- `window` is shared with every script on the page, including any future one
- The type checker should see the component's whole surface
- Client JavaScript stays near zero: this is a refactor, not a framework change

## Considered Options

- **Keep the globals, add `Alpine.data` alongside.** Doubles the surface, keeps
  the collisions, and leaves the two registration paths free to disagree.
  Rejected.
- **Move the behaviour into `.ts` modules and register them.** The component
  becomes a pure view over an imported object, the registration is one line in
  `src/alpine.ts`, and the object can be mounted in a DOM harness. Chosen.
- **A framework (React, Solid, and so on).** The site ships a handful of
  interactive cards and no build complexity. Rejected on cost.

## Decision

Alpine components live in a `.ts` module next to their `.astro` view, export a
factory, and are registered once in `src/alpine.ts`:

```ts
Alpine.data('pointBuy', pointBuyComponent);
```

The markup names the registration, `x-data="pointBuy"`, and every helper the
template's expressions call is a property of the returned object. No component
assigns to `window`, and none declares a `Window` interface.

Two constraints follow from the toolchain, and both are load-bearing:

- **Import helpers as a namespace** (`import * as pointBuy from
  './point-buy-utils'`) when the same binding is referenced from a type
  position. A named import that appears in a `typeof` query loses its runtime
  binding under the SSR transform the tests run through, and the helper arrives
  `undefined` in every test and nowhere else.
- **Test behaviour through a mounted DOM**, not through the source text. The
  harness in `src/test-utils/alpine-dom.ts` renders the component with
  `astro/container` and boots a real Alpine over it. Class bindings are the one
  thing it cannot observe - happy-dom does not retain `classList` writes on
  every element - so those assertions are made against the state behind the
  class (`aria-pressed`, rendered text, the live region).

## Consequences

- Good, because the global object no longer carries twenty names that can
  collide with anything else on the page.
- Good, because the behaviour is importable: the dice roller's, point buy's and
  party view's components are all exercised by tests that click real buttons in
  a real DOM, which is the coverage #328 lacked.
- Good, because a missing registration now fails a test rather than a page.
- Neutral, because the components are slightly larger files: a view, a
  behaviour module, and a runtime test each.
- Bad, because an Alpine expression is still a string. Renaming a helper on the
  component object is a runtime failure in the browser and is caught only
  because a mounted test exercises the expression. New components are expected
  to arrive with such a test.

## Links

- [#334](https://github.com/sdelrio/dnd-astro/issues/334) - the refactor
- [#328](https://github.com/sdelrio/dnd-astro/issues/328) - the regression whose
  source-scanning tests let it through
