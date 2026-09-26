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

.PHONY: help test lint typecheck build check upgrade

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
	@printf "  $(GREEN)make submodule-init$(RESET)      🏗️  Impeccable skill to ./impeccable-skill\n"
	@printf "  $(GREEN)make submodule-update$(RESET)    🏗️  Update Impeccable skill from git\n"
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
	git submodule add https://github.com/pbakaus/impeccable .impeccable-skill
	npx impeccable link --source=.impeccable-skill --providers=opencode

submodule-update:
	git submodule update --remote .impeccable-skill
	npx impeccable link --source=.impeccable-skill --providers=opencode

