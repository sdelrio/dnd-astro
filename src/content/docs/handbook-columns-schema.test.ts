import { docsSchema } from '@astrojs/starlight/schema';
import { describe, expect, it } from 'vitest';

import { HANDBOOK_COLUMNS, handbookColumnsSchema } from '../../content.config';

/**
 * The per-page column count, asserted as *readable*.
 *
 * This test exists because of a failure mode that has no symptom. Starlight's
 * default frontmatter schema is a Zod object in strip mode, and a Zod object in
 * strip mode does not reject a key it does not know: it drops it. So a page
 * carrying `columns: 1` in its frontmatter would parse without a warning, the
 * key would still be sitting in the markdown file, and `entry.data.columns`
 * would be `undefined` at render time. The page would print in two columns, the
 * author would see their key in the file, and nothing anywhere would say why it
 * was ignored.
 *
 * Reading the key therefore means extending the schema through the documented
 * `extend` option, and that is what is asserted here: the extended schema is
 * built and parsed for real, rather than the source of the configuration being
 * read and pattern-matched, because the question is whether the key survives
 * parsing and only parsing answers that.
 */

/**
 * A stand-in for the `SchemaContext` Astro hands the schema factory.
 *
 * Starlight's default schema asks the context for an image helper and nothing
 * else; the house-rule pages use no frontmatter images, so an any-schema in its
 * place exercises the same merge this test is about.
 */
const context = { image: () => ({}) } as unknown as Parameters<ReturnType<typeof docsSchema>>[0];

describe('the handbook column count in frontmatter', () => {
  const parse = docsSchema({ extend: handbookColumnsSchema })(context).parse;

  it('reads a single-column opt-out off a page', () => {
    expect(parse({ title: 'Skills', columns: 1 }).columns).toBe(1);
  });

  it('reads the two-column default as well, for a page that states it', () => {
    expect(parse({ title: 'Skills', columns: 2 }).columns).toBe(2);
  });

  it('leaves the key undefined when the page does not set it', () => {
    expect(parse({ title: 'Skills' }).columns).toBeUndefined();
  });

  // The silent case, stated as its own test: this is what the default schema
  // would do, and the reason `extend` is not optional bookkeeping.
  //
  // Cast because the default schema's output type genuinely has no `columns`
  // member, which is the finding. Reading one off it is what the schema permits
  // at runtime and what its type says it does not, and the assertion below is
  // about the runtime.
  it('would be dropped by the default schema, which is why it is extended', () => {
    const defaultParse = docsSchema()(context).parse;
    const parsed = defaultParse({ title: 'Skills', columns: 1 }) as Record<string, unknown>;

    expect(parsed.columns).toBeUndefined();
    expect('columns' in parsed).toBe(false);
  });

  it('rejects a column count the print stylesheet does not implement', () => {
    // Three columns is the same silent disagreement one level up from two: it
    // would parse, sit in the file, and print as two.
    expect(() => parse({ title: 'Skills', columns: 3 })).toThrow();
    expect(() => parse({ title: 'Skills', columns: 0 })).toThrow();
  });

  it('rejects a column count that is not a number at all', () => {
    expect(() => parse({ title: 'Skills', columns: 'one' })).toThrow();
  });

  it('offers exactly the two layouts the print stylesheet implements', () => {
    expect([...HANDBOOK_COLUMNS]).toEqual([1, 2]);
  });
});
