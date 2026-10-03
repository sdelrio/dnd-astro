import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

/**
 * The per-page column count the printed Handbook reads.
 *
 * It has to be declared through `extend` rather than added as a bare key, and
 * that is not a style preference. Starlight's default schema is a Zod object in
 * *strip* mode, which does not reject an unknown key - it silently drops it. A
 * `columns: 1` in a page's frontmatter would therefore parse cleanly, still be
 * sitting in the file, and be `undefined` at render time with nothing anywhere
 * saying why the page printed in two columns anyway. `extend` deep-merges the
 * key into the schema, which is the documented way to make it readable.
 *
 * `1` and `2` only, because those are the two layouts the print stylesheet
 * implements. A page asking for three columns would parse and then be laid out
 * in two, which is the same silent disagreement one level up.
 */
export const HANDBOOK_COLUMNS = [1, 2] as const;

export const handbookColumnsSchema = z.object({
  columns: z.union([z.literal(1), z.literal(2)]).optional(),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: handbookColumnsSchema }) }),
};

