# ANSI color codes
BOLD    := \033[1m
DIM     := \033[2m
RED     := \033[0;31m
GREEN   := \033[0;32m
YELLOW  := \033[0;33m
BLUE    := \033[0;34m
MAGENTA := \033[0;35m
CYAN    := \033[0;36m
RESET   := \033[0m

# Impeccable skill, vendored as a submodule. Bump the pinned commit with
# `make submodule-update`; never `git submodule add`, the gitlink is committed.
IMPECCABLE               := .impeccable-skill
IMPECCABLE_PROVIDER      ?= opencode

# Where each harness keeps project skills, used to detect an existing link.
# Empty for an unknown provider, which makes submodule-link always run the CLI
# so it can report the bad name instead of silently skipping.
IMPECCABLE_SKILLS_opencode := .opencode/skills
IMPECCABLE_SKILLS_claude   := .claude/skills
IMPECCABLE_SKILLS          := $(IMPECCABLE_SKILLS_$(IMPECCABLE_PROVIDER))

# Scratch space: `tmp/` at the repo root, gitignored, and where AGENTS.md sends
# every temporary file. `clean-tmp` reads the root rather than hardcoding it so a
# test can point the target at a fixture it owns instead of a developer's own
# scratch files.
TMP_ROOT ?= tmp

# How old a scratch file has to be before `make clean-tmp` removes it. Overridable
# from the command line, so a different age never means editing the recipe:
# `make clean-tmp TMP_RETENTION_DAYS=1`.
TMP_RETENTION_DAYS ?= 3

# `ARGS='-n'` is the dry run. `-n` is a predicate find rejects on GNU and a verb
# on BSD, so the recipe picks the verb itself instead of handing the flag on, and
# it matches the whole word rather than any ARGS that happens to contain "-n".
TMP_DRY_RUN := $(filter -n,$(ARGS))
TMP_CLEAN_FILE := $(if $(TMP_DRY_RUN),-print,-delete)

# The second pass removes what the first one emptied. A dry run deletes nothing,
# so `-empty` would call a directory that still holds a stale file non-empty and
# the listing would under-report what a real run removes. A directory is empty
# afterwards exactly when it holds nothing but stale files, so the dry run asks
# that question per directory instead, at the cost of one extra find each.
TMP_CLEAN_DIR := $(if $(TMP_DRY_RUN),-type d -exec sh -c 'test -z "$$(find "$$1" -mindepth 1 ! \( -type f -mtime +$(TMP_RETENTION_DAYS) \) -print -quit)"' _ {} \; -print,-type d -empty -delete)

.PHONY: help test lint typecheck build check capture measure handbook handbook-art \
        upgrade clean-tmp submodule-init submodule-update submodule-link

# The design review capture command. See ADR-0012.
CAPTURE := node .opencode/lib/design-review/capture.mjs

# The rendered-verification command: overflow, contrast, tap, pointer.
# Pass the subcommand and its flags: make measure ARGS='tap --selector ...'
MEASURE := node .opencode/lib/design-review/measure.mjs

# The printed handbook: the eight house-rule pages as one A4 vector PDF, one
# fixed-size sheet per page. See ADR-0020.
HANDBOOK := node .opencode/lib/design-review/handbook.mjs

# The Handbook's generated artwork: the parchment tile and the footer ornament,
# generated once and committed at two single documented paths under
# public/handbook/. Run with ARGS='--check' to fail when either is stale.
HANDBOOK_ART := node .opencode/lib/design-review/handbook-art.mjs

help:
	@printf "\n"
	@printf "$(CYAN)$(BOLD)🧙 DnD Companion - Make targets$(RESET)\n"
	@printf "\n"
	@printf "$(MAGENTA)Verification$(RESET)\n"
	@printf "  $(GREEN)make check$(RESET)      🚦  Run every gate: lint, typecheck, test, build\n"
	@printf "  $(GREEN)make lint$(RESET)       🧹  ESLint (Astro-aware, zero warnings allowed)\n"
	@printf "  $(GREEN)make typecheck$(RESET)  🔍  Astro diagnostics (noninteractive)\n"
	@printf "  $(GREEN)make test$(RESET)       🧪  Vitest unit tests\n"
	@printf "  $(GREEN)make build$(RESET)      🏗️  Production build to ./dist/\n"
	@printf "\n"
	@printf "$(MAGENTA)Print$(RESET)\n"
	@printf "  $(GREEN)make handbook$(RESET)  📕  Print the book: a cover, a contents and the eight house rules as fixed-size sheets\n"
	@printf "$(DIM)                     writes public/handbook/handbook.pdf, the manifest, and every split it made\n"
	@printf "$(DIM)                     ARGS='--url http://localhost:4321/handbook/spike-fixture/ --out tmp/spike.pdf --no-manifest'$(RESET)\n"
	@printf "  $(GREEN)make handbook-art$(RESET)  🎨  Write the committed parchment tile and footer ornament\n"
	@printf "$(DIM)                     ARGS='--check' fails when either is stale$(RESET)\n"
	@printf "\n"
	@printf "$(MAGENTA)Design review$(RESET)\n"
	@printf "  $(GREEN)make capture$(RESET)    📸  Write desktop.png (1440) and mobile.png (390) for review\n"
	@printf "  $(GREEN)make measure$(RESET)    🔬  Measure a rendered page: overflow, contrast, tap, pointer\n"
	@printf "  $(DIM)                     ARGS='overflow --url http://localhost:4321/dnd-tools/dice-roller/'$(RESET)\n"
	@printf "\n"
	@printf "$(MAGENTA)Agent skills$(RESET)\n"
	@printf "  $(GREEN)make submodule-init$(RESET)    📥  Check out the pinned Impeccable skill\n"
	@printf "  $(GREEN)make submodule-update$(RESET)  ⬆️  Bump Impeccable to upstream HEAD and relink\n"
	@printf "  $(GREEN)make submodule-link$(RESET)    🔗  Relink for IMPECCABLE_PROVIDER=<harness> (default opencode)\n"
	@printf "\n"
	@printf "$(MAGENTA)Maintenance$(RESET)\n"
	@printf "  $(GREEN)make upgrade$(RESET)       ⚠️  Interactive. Upgrades Astro and rewrites package.json\n"
	@printf "  $(DIM)                         Changes your dependencies - read the diff$(RESET)\n"
	@printf "  $(GREEN)make clean-tmp$(RESET)     🧺  Delete ./tmp files older than three days, then the directories they empty\n"
	@printf "$(DIM)                         ARGS='-n' lists without deleting, TMP_RETENTION_DAYS=<days> sets the age$(RESET)\n"
	@printf "\n"
	@printf "$(DIM)Wrap the pnpm scripts documented in AGENTS.md$(RESET)\n"
	@printf "\n"

test:
	pnpm run test

lint:
	pnpm run lint

typecheck:
	CI=true pnpm run typecheck

build:
	pnpm run build

check:
	$(MAKE) lint
	$(MAKE) typecheck
	$(MAKE) test
	$(MAKE) build

# Writes .impeccable/review/desktop.png and .impeccable/review/mobile.png, the
# exact filenames the vendored Impeccable skill's reviewer looks for. Fails if
# the display font is not genuinely loaded, and writes nothing if it is not.
capture:
	$(CAPTURE)

# Answers the three questions a resized viewport or a screenshot cannot. See
# docs/audits/2026-09-26-rendered-verification-report.md.
measure:
	$(MEASURE) $(ARGS)

# Writes one A4 vector PDF of the eight dnd/ house-rule pages, one sheet per
# page, one capture per sheet, and the committed manifest beside them, and refuses
# to write a file that does not read back as the document the layout produced.
# Content that does not fit a sheet is split at the nearest block boundary and
# every break is printed by name; ARGS='--no-manifest' records nothing, and
# ARGS='--baseline <dir>' or ARGS='--compare <dir>' do the local, non-gating
# image comparison. Needs the dev server; pass ARGS='--start-dev-server' to let it
# start and stop the documented one.
handbook:
	$(HANDBOOK) $(ARGS)

# Writes public/handbook/parchment.png and public/handbook/ornament.svg. The
# parchment is a 256px sRGB tile that CSS tiles; the ornament is an 88x10 SVG
# drawn in the site's gold rule colour. Both are committed, so this only has to be
# run when one of them should change.
handbook-art:
	$(HANDBOOK_ART) $(ARGS)

upgrade:
	pnpm dlx @astrojs/upgrade

# Removes scratch files under $(TMP_ROOT) that have not been touched in more than
# $(TMP_RETENTION_DAYS) days, then the directories those files emptied. Two passes,
# files first and directories second, because one `find -delete` over the whole tree
# fails with "Directory not empty" whenever a stale directory still holds a fresh
# file - the common case here, since tmp/ mixes long-lived capture directories with
# screenshots written into them. ARGS='-n' lists what a run removes and deletes
# nothing. The root itself is never a candidate, only what is inside it.
clean-tmp:
	@if [ ! -d "$(TMP_ROOT)" ]; then \
		echo "clean-tmp: $(TMP_ROOT)/ does not exist, nothing to clean"; \
	else \
		echo "clean-tmp: files under $(TMP_ROOT)/ older than $(TMP_RETENTION_DAYS) days$(if $(TMP_DRY_RUN), (dry run),)"; \
		find "$(TMP_ROOT)" -mindepth 1 -type f -mtime +$(TMP_RETENTION_DAYS) $(TMP_CLEAN_FILE) && \
		find "$(TMP_ROOT)" -mindepth 1 $(TMP_CLEAN_DIR); \
	fi

submodule-init:
	git submodule update --init --recursive $(IMPECCABLE)
	$(MAKE) submodule-link

submodule-update:
	git submodule update --remote $(IMPECCABLE)
	$(MAKE) submodule-link

submodule-link:
	@if [ -n "$(IMPECCABLE_SKILLS)" ] && [ -e "$(IMPECCABLE_SKILLS)/impeccable" ]; then \
		echo "impeccable already linked for $(IMPECCABLE_PROVIDER) at $(IMPECCABLE_SKILLS)/impeccable - skipping"; \
	else \
		pnpm dlx impeccable link --source=$(IMPECCABLE) --providers=$(IMPECCABLE_PROVIDER) -y; \
	fi
