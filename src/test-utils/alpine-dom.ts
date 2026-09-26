/**
 * Boots a real Alpine instance against rendered component markup in tests.
 *
 * Every Alpine expression in this repo is a string. Nothing type-checks it, and
 * the render tests never evaluated one - which is exactly how the two-root
 * `x-for` regression in #328 shipped: the markup was asserted by reading the
 * `.astro` source as text, and the source was fine while the rendered card was
 * not. The only thing that catches a broken expression is running it, so this
 * harness exists to run them.
 *
 * The DOM comes from happy-dom's own `Window` rather than Vitest's
 * `happy-dom` environment, because a component can only be rendered to a string
 * by `astro/container` in a Node environment: with a DOM environment present,
 * Vite resolves a `.astro` import to its client stub, which throws on render.
 * Pointing `globalThis` at a happy-dom window gives Alpine the globals it reads
 * while the module graph stays server-side.
 *
 * Components are registered through `setupAlpine`, the same entry point
 * `astro.config.mjs` points the site at, so a component that is never
 * registered fails here rather than on a page.
 *
 * One known gap: `:class` bindings are not observable here. Alpine applies the
 * class - `classList.add` is reached with the right tokens - but happy-dom does
 * not retain the write on every element (it holds on the static markup and
 * drops it inside `x-for` clones and deeper subtrees). Tests assert the state
 * behind a class instead: `aria-pressed`, the disabled attribute, rendered
 * text, and the live region. `x-show` is unaffected, since it hides by writing
 * an inline `display` style.
 */
import { Window } from 'happy-dom';
import type { Alpine } from 'alpinejs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import setupAlpine from '@/alpine';

/**
 * The globals Alpine reads off `globalThis`. `navigator` is deliberately
 * absent: Node 22 defines it as a getter-only property, and Alpine does not
 * read it. `ShadowRoot` and `HTMLTemplateElement` are needed because every
 * `x-if` and `x-for` is implemented with a `<template>`.
 */
const BORROWED_GLOBALS = [
  'Node',
  'Element',
  'HTMLElement',
  'HTMLTemplateElement',
  'DocumentFragment',
  'ShadowRoot',
  'Text',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const;

export interface MountedAlpine {
  /** The window the component was mounted in. Read the result from its
      `document`. */
  window: Window;
  /**
   * Console messages produced while this component was mounted. Alpine reports
   * a failed expression through `console.warn` and carries on, so a broken
   * expression is invisible unless these are read.
   */
  messages: string[];
  /** Drains the microtask queue so Alpine's queued effects run. */
  flush(): Promise<void>;
  /** Waits real milliseconds. Anything touching `:class` wants this rather
      than `flush`: the class is applied from a queued effect that also has to
      be seen by Alpine's mutation observer. */
  settle(ms?: number): Promise<void>;
}

interface Harness {
  Alpine: Alpine;
  container: Awaited<ReturnType<typeof AstroContainer.create>>;
  messages: string[];
  /** The window a mount reuses. A new one per mount would leave Alpine's
      mutation observer watching the old document, and the class bindings on
      the second tree would silently stop applying. */
  window: Window;
  flush(): Promise<void>;
  settle(ms?: number): Promise<void>;
}

function borrowGlobals(window: Window): void {
  const globals = globalThis as unknown as Record<string, unknown>;
  const win = window as unknown as Record<string, unknown>;
  globals.window = window;
  globals.document = window.document;
  for (const name of BORROWED_GLOBALS) {
    if (win[name]) globals[name] = win[name];
  }
}

const settle = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Alpine batches its effects behind promises, so draining the microtask queue
 * is enough to let a click reach the DOM. A handful of turns, because one
 * click can cascade through more than one layer of effects.
 */
async function flush(): Promise<void> {
  for (let turn = 0; turn < 20; turn++) {
     
    await Promise.resolve();
  }
}

let harness: Harness | undefined;

/**
 * Boots Alpine once per test file. A second `Alpine.start()` over the same
 * instance is not a page load, and components mounted after it do not get
 * their class bindings applied.
 */
async function boot(): Promise<Harness> {
  if (harness) return harness;

  const messages: string[] = [];
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      messages.push(args.map((a) => String(a)).join(' '));
      original(...args);
    };
  }

  const window = new Window({ url: 'https://dnd-astro.test/' });
  borrowGlobals(window);
  window.document.body.innerHTML = '';

  // Registered before `start()`, because starting Alpine is what begins
  // walking the document for `x-data` roots.
  const Alpine = (await import('alpinejs')).default;
  setupAlpine(Alpine);
  Alpine.start();

  const booted: Harness = {
    Alpine,
    messages,
    window,
    container: await AstroContainer.create(),
    flush,
    settle,
  };
  harness = booted;
  return booted;
}

/**
 * Renders `component` into the booted document and initialises Alpine over it.
 *
 * The old tree is destroyed first, so the previous mount's effects stop
 * responding to the new one.
 */
type Renderable = Parameters<AstroContainer['renderToString']>[0];

export async function mountAlpine(
  component: Renderable,
  props?: Record<string, unknown>
): Promise<MountedAlpine> {
  const h = await boot();
  const previous = h.window.document.body.firstElementChild;
  if (previous) h.Alpine.destroyTree(previous as unknown as Parameters<Alpine['destroyTree']>[0]);
  h.messages.length = 0;

  const html = await h.container.renderToString(component, { props });
  h.window.document.body.innerHTML = html;
  const root = h.window.document.body.firstElementChild;
  // happy-dom's element type is not the DOM lib's, which is what Alpine's types
  // are written against. The object is the same either way.
  if (root) h.Alpine.initTree(root as unknown as Parameters<Alpine['initTree']>[0]);
  await settle();

  return {
    window: h.window,
    messages: h.messages,
    flush: h.flush,
    settle: h.settle,
  };
}
