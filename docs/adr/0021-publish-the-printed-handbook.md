---
status: superseded
date: 2026-10-04
supersedes: null
superseded_by: 0022
tags: [print, pdf, handbook, publishing, deploy]
---

# ADR-0021: Publish the Printed Handbook From the Repository

## Context and Problem Statement

[ADR-0020](0020-sheet-box-renderer.md) settled how the printed artifact is made: a
dev-time command renders a print route into one A4 vector PDF and commits it,
because there is no build step that could produce it - a browser may not enter the
build, by ADR-0007 and ADR-0011.

That left one question open, and the publisher page forces it. A reader has to be
able to download the book, so somewhere on the site there is a link, and the thing
it points at has to exist on the deployed site. Until now the PDF was written to
`tmp/handbook/handbook.pdf`, which is gitignored: nothing was served, and there
was no URL to point a link at.

Three ways out, and only one of them is a decision rather than a dodge.

## Decision Drivers

- A reader must be able to download the book from the site, and the link must
  resolve to the file this repository generates.
- A generated artifact committed without a gate against it is worse than no
  artifact, because it is confidently wrong. The [manifest](0020-sheet-box-renderer.md)
  is that gate and it already sits in `public/`.
- The per-sheet captures are several hundred kilobytes a sheet across sixty-odd
  sheets. They are evidence, not an artifact, and they are never committed.

## Considered Options

- **Serve the PDF from somewhere else.** An object store, a release asset, a CDN.
  Rejected: it moves the book's identity off the repository, so the manifest beside
  it stops being a record of the thing being served, and it introduces an upload
  step nobody can test.
- **Commit nothing and let readers print from the browser.** Rejected: SPEC 019
  makes it a non-goal, and offering it implies the artifact is equivalent to what
  a reader's own printer produces from a screen page, which it is not.
- **Publish it from the repository.** Chosen.

## Decision Outcome

Chosen option: **publish the artifact from the repository**, at
`public/handbook/handbook.pdf`, committed beside the manifest that gates it.

The path is written down once, in `HANDBOOK_FILE` in `src/utils/handbook.ts`, and
the command's default output is asserted against it by a test: the link on the
publisher page and the file the command writes are one path rather than two that
agree today. The publisher page states the version and the edition date, because a
PDF of house rules has to say what it is before it can be trusted at a table.

The per-sheet captures move to `tmp/handbook/sheets` and stay there whatever
`--out` says. They were derived from the artifact's directory, which was right when
both were scratch and is wrong now: deriving them from a `public/` path would put
tens of megabytes of PNG into the tree that gets deployed and served.

The trade is deliberate and it is the one SPEC 019 already named: a committed
binary in an otherwise text repository, which is why the manifest is what keeps it
honest. The book is 66 sheets and about 8.7MB.

## Consequences

- Good, because a reader can download a specific edition of the house rules from
  any page of the site, and the file they get is the one the manifest describes.
- Good, because the staleness gate and the artifact sit in the same directory and
  a change to a house rule cannot reach a reader without the artifact being
  regenerated.
- Bad, because every change to the eight house rules now carries an 8.7MB binary
  in its diff. That is the cost, stated rather than discovered.
- Neutral, because the artifact is still generated at dev time: nothing in this
  decision puts a browser in the build, and `git diff -- package.json
  pnpm-lock.yaml pnpm-workspace.yaml` is still empty.