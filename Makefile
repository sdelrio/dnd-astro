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

.PHONY: help test lint typecheck build check upgrade \
        submodule-init submodule-update submodule-link

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
	@printf "$(MAGENTA)Agent skills$(RESET)\n"
	@printf "  $(GREEN)make submodule-init$(RESET)    📥  Check out the pinned Impeccable skill\n"
	@printf "  $(GREEN)make submodule-update$(RESET)  ⬆️  Bump Impeccable to upstream HEAD and relink\n"
	@printf "  $(GREEN)make submodule-link$(RESET)    🔗  Relink for IMPECCABLE_PROVIDER=<harness> (default opencode)\n"
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

upgrade:
	pnpm dlx @astrojs/upgrade

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
