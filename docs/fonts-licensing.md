# Font Licensing

This project uses custom D&D-themed fonts to replicate the look of official
Dungeons & Dragons 5th Edition books. Below is the licensing context for each
font family in use.

Every font listed as **vendored** is committed to this repository as bytes under
`public/fonts/`. Vendoring is what turns a license note into an obligation: the
redistributed copy has to carry its license and its attribution with it, so each
vendored family ships its license text alongside the `.woff2` files.

## Fonts in Use

| Font Name         | Role in This Project | Source                                 | License      | Vendored |
| ----------------- | -------------------- | -------------------------------------- | ------------ | -------- |
| **Bookinsanity**  | Body text            | `solbera-dnd-fonts`                    | CC-BY-SA 4.0 | yes      |
| **Cinzel**        | Headings (h2, h3)    | Google Fonts, committed to the repo     | OFL 1.1      | yes      |

## What vendoring commits the project to

### Cinzel (OFL 1.1)

The woff2 files in `public/fonts/Cinzel.woff2` and `public/fonts/Cinzel Ext.woff2`
were obtained from Google Fonts and are committed here, which means this project
now redistributes the font rather than linking to someone else's copy of it. Under
the [SIL Open Font License 1.1](https://openfontlicense.org/) that is permitted
without condition, and it carries obligations that the previous CDN arrangement
did not:

- **The license travels with the font.** `public/fonts/Cinzel OFL.txt` is the
  unmodified OFL 1.1 text for the family and must be redistributed alongside the
  font files. Removing it would break the terms the vendoring relies on.
- **Copyright and attribution are retained.** The notice is
  `Copyright 2020 The Cinzel Project Authors
  (https://github.com/NDISCOVER/Cinzel)`. It must stay with the redistributed
  font.
- **The fonts themselves may not be sold on their own**, and a modified version
  may not use the reserved font name. This project vendors Cinzel unmodified, so
  neither restriction is engaged.
- **The family must stay under OFL 1.1** if it is redistributed further.

If Cinzel is ever replaced, this record has to be updated in the same change. A
vendored face can rot silently: the CDN copy moved upstream on its own and this
copy will not, so a Cinzel revision that fixes a glyph will not arrive unless
someone brings it here deliberately.

## Solbera's D&D 5e Fonts

All fonts in the [solbera-dnd-fonts](https://github.com/jonathonf/solbera-dnd-fonts)
repository are released under the
[Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/)
(CC-BY-SA 4.0).

### Available Fonts

| Font Name                   | Original Font            | D&D 5e Usage                   |
| --------------------------- | ------------------------ | ------------------------------ |
| **Bookinsanity (Remake)**   | Bookmania                | Body text                      |
| **Scaly Sans Caps**         | Scala Sans Caps          | Monster Manual quotes          |
| **Nodesto Caps Condensed**  | Modesto Bold Condensed   | Book and card titles           |
| **Mr Eaves Small Caps**     | Mrs Eaves Small Caps     | Headings                       |
| **Zatanna Misdirection**    | Dai Vernon Misdirect     | Titles of tables               |
| **Scaly Sans (Remake)**     | Scala Sans               | Tables                         |
| **Solbera Imitation**       | (unknown)                | Drop caps                      |
| **Dungeon Drop Case**       | (unknown)                | Drop caps                      |

### CC-BY-SA 4.0 License Terms

You are free to:
- **Share** - copy and redistribute the material in any medium or format.
- **Adapt** - remix, transform, and build upon the material for any purpose,
  even commercially.

Under the following terms:
- **Attribution** - You must give appropriate credit, provide a link to the
  license, and indicate if changes were made.
- **ShareAlike** - If you remix, transform, or build upon the material, you
  must distribute your contributions under the same license.

### Why We Use These Fonts

- **Bookinsanity** (from `solbera-dnd-fonts` npm package): CC-BY-SA 4.0
  licensed, legally safe for free distribution. Provides the authentic D&D 5e
  body text aesthetic.
- **Cinzel** (from Google Fonts, vendored into `public/fonts/`): Open Font
  License 1.1, completely free for any use. Chosen as the legal alternative to
  MrEavesRemake for heading text, with a similar classic/monumental serif feel.
  Self-hosted since ADR-0019 so heading metrics do not depend on a third party.

## Background: D&D Community Fonts

### MrEavesRemake

- **The Original**: Mr Eaves (including Sans, Modern, and XL variants) is a
  highly regulated paid commercial font designed by Zuzana Licko for Emigre.
  Individual styles cost around $49-$59, and full families cost hundreds of
  dollars. It is also available via paid subscriptions like Adobe Fonts.
- **The "Remake" Version**: MrEavesRemake is a modified, renamed file
  circulated for free in the D&D homebrew community. Legally speaking,
  downloading or distributing these "remake" files outside of the platform they
  are built for sits in a precarious legal gray zone, as the underlying outlines
  mimic copyrighted intellectual property.

### BookInsanity (or BookSanity)

- **The Original**: This font was created to mimic Scales or Mrs Eaves, which
  are premium, paid fonts used in publishing.
- **The "Remake" Version**: BookInsanity (often spelled BookSanity) was built
  from scratch or modified by community font-smiths using open-source bases to
  look identical to D&D's print font without forcing creators to buy expensive
  licenses. These files are shared freely as Creative Commons assets within the
  D&D homebrew community.

## Licensing Summary

If you are using these fonts purely inside a tool like
[The Homebrewery](https://homebrewery.naturalcrit.com/new/) to make free
homebrew content, you do not need to pay anything. However, if you plan to sell
a commercial book or product, you should **avoid using the "Remake" files** and
instead buy the official license for Mr Eaves or use safe, open-source
alternatives from a platform like [Google Fonts](https://fonts.google.com/).

### References

- [Solbera's D&D 5e Fonts](https://github.com/jonathonf/solbera-dnd-fonts)
- [CC-BY-SA 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/)
- [SIL Open Font License 1.1](https://openfontlicense.org/)
- [Cinzel](https://github.com/NDISCOVER/Cinzel)
- [The Homebrewery](https://homebrewery.naturalcrit.com/new/)
- [Homebrewery's Included Fonts](https://www.reddit.com/r/homebrewery/comments/mlmcbe/homebrewerys_included_fonts/)
- [Font Licensing for Commercial Use](https://www.reddit.com/r/selfpublishing/comments/qsl8kv/font_licensing_for_use_in_novel_please/)
