// Role icons use game-icons equivalents (user-confirmed deviation from the
// spec's mdi: names; IconifyIcon.astro now ships both sets).
//
// Each role carries a light and a dark hue step rather than one flat color.
// The hue is only ever used for the chip border and a 14% background tint -
// never as the text color - because a saturated hue on a tint of itself cannot
// reach 4.5:1 in either theme. Every pair below verifies at >=3:1 border
// (WCAG 1.4.11) and >=5.6:1 label text against its own tinted surface.
//
// This module has NO imports of its own, and must not acquire any. It is the
// browser-safe half of the party data: the party view's client component takes
// it as a type-only import, which the compiler erases, so no runtime edge
// reaches the browser. #351 was the one import edge that did - the roster
// module reads the roster file from disk, so the client graph pulled in
// `node:fs`, which the dev server externalises and throws on, and Alpine never
// booted on any page. A value import here from any client module reintroduces
// that whole failure, so `party-roles.test.ts` asserts the rule.
export const ROLE_CONFIG = {
  tank: { icon: 'game-icons:shield', label: 'Tank', light: '#a06e00', dark: '#d99a2b' },
  healer: { icon: 'game-icons:heart-plus', label: 'Healer', light: '#4a6b1f', dark: '#8fae5c' },
  damage: { icon: 'game-icons:crossed-swords', label: 'Damage Dealer', light: '#8f2f12', dark: '#c2603f' },
  support: { icon: 'game-icons:scroll-unfurled', label: 'Support', light: '#9a5410', dark: '#d08a4a' },
  utility: { icon: 'game-icons:monkey-wrench', label: 'Utility', light: '#6b2f4c', dark: '#b07a94' },
} as const;

/** One role's entry in {@link ROLE_CONFIG}. Named so a consumer can refer to the shape without a `typeof` query against the value - a `typeof` import of a value is the edge this ticket removed. */
export type RoleConfig = (typeof ROLE_CONFIG)[Role];

export type Role = keyof typeof ROLE_CONFIG;

export const ALL_ROLES = Object.keys(ROLE_CONFIG) as Role[];
