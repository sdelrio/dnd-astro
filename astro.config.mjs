// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
      title: 'DnD Companion',
      description: 'D&D rules, Fantasy Grounds xml visaulizer.',
			social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }
      ],
			sidebar: [
				{
					label: 'Guides',
					items: [
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'D&D rule fixes',
					items: [{ autogenerate: { directory: 'dnd' } }],
				},
				{
					label: 'D&D Tools',
					items: [{ autogenerate: { directory: 'dnd-tools' } }],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
