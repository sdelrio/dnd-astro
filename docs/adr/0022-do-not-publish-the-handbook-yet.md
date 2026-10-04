---
status: accepted
date: 2026-10-04
supersedes: 0021
superseded_by: null
tags: [print, pdf, handbook, publishing, deploy]
---

# ADR-0022: Do Not Publish the Printed Handbook Until the Design Settles

## Context and Problem Statement

[ADR-0021](0021-publish-the-printed-handbook.md) moved the generated PDF from
`tmp/` into `public/handbook/handbook.pdf` and committed it, so the publisher
page could link a file that would exist on the deployed site. That made the
artifact a published file, and it made every change to the eight house rules
carry an 8.7MB binary in its diff, which ADR-0021 stated as the cost.

The design of the book is not settled. The next two tickets change the page
geometry and halve the type, and both would rewrite an 8.7MB blob in `main`'s
history. Committing a binary that is about to be regenerated, then regenerating
it, then regenerating it again, is history that carries megabytes nobody can
read and a publisher page that offers a download of a design in flux.

The question is not whether the Handbook is published - it is whether it is
published *now*, while the thing being published is still being built.

## Decision Drivers

- A download that a reader can follow must resolve to the file the repository
  generates. A link to a file whose design is still moving is a link to a moving
  target.
- A committed binary in an otherwise text repository is a cost that has to be
  justified by the artifact being finished. ADR-0021 accepted it; the design
  being unsettled removes the justification.
- The manifest is a staleness gate and it does not depend on the PDF being
  published. It stays committed either way; [ADR-0020](0020-sheet-box-renderer.md)
  requires it wherever the artifact is.
- Regenerating the book must leave the working tree clean, so a dev-time command
  cannot dirty every branch it runs on.

## Considered Options

- **Keep publishing it and rewrite the binary with each change.** Rejected: it
  puts several versions of an 8.7MB blob into history while the design moves, and
  it publishes a book that is scheduled to change twice.
- **Publish it somewhere else and link that.** Rejected for the same reason
  ADR-0021 rejected it: it moves the book's identity off the repository and
  splits the artifact from the manifest that gates it.
- **Do not publish it yet.** Chosen. The publisher page keeps its URL, its title,
  its version and its edition line, and says plainly that the PDF is not
  published yet. It links nothing.

## Decision Outcome

Chosen option: **do not publish the printed Handbook until its design settles**,
and supersede ADR-0021.

The generated PDF goes back under `tmp/`, which is gitignored, so `make handbook`
followed by `git status` reports a clean tree. It is not committed, not served,
and not in the build output. `--out` still overrides the path for a run that
wants it elsewhere.

The blob is removed from `main`'s history, not only from the tip: the commit that
added it is rewritten and the rewrite is pushed with `--force-with-lease`, so
`git log main -- public/handbook/handbook.pdf` returns nothing. A clone that
predates the rewrite has to `git reset --hard origin/main`.

The publisher page keeps its URL, its title, its version and its edition line,
because those are what make the page a place a reader can trust rather than an
empty promise. It states that the PDF is not published yet and links no file, and
a test asserts there is no link and no `.pdf` string on the page, so a download
cannot quietly come back.

The manifest stays committed at `public/handbook/manifest.json`. It is
ADR-0020's staleness gate, it is a few kilobytes, and it is a record of the last
run rather than a thing a reader downloads.

## Consequences

- Good, because no change to a house rule carries an 8.7MB binary until the
  design is settled, and the branch stays reviewable as text.
- Good, because the publisher page cannot offer a download that resolves to a
  book whose layout is still being changed.
- Good, because `make handbook` leaves a clean working tree, so the command can
  run on any branch without a commit of its own output.
- Bad, because a reader cannot download the book from the site until it is
  published again, which is a deliberate deferral rather than a lost feature.
- Neutral, because the artifact is still generated at dev time: nothing here
  puts a browser in the build, and `git diff -- package.json pnpm-lock.yaml
  pnpm-workspace.yaml` is still empty.
