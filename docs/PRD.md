# PRD — WPDevBox

## Scope (MVP direction)
- macOS-focused local WordPress dev stack (Docker-based)
- Devilbox-compatible directory layout (`data/www/<site>`, `data/www/general`)
- Configurable global runtime versions (PHP, DB image, web server)
- Per-site domain pattern: `<folder>.loc`
- Mailpit + Adminer + dashboard
- CLI-first workflow (`bin/devbox`)

## Non-goals (v1)
- Windows/Linux host support
- Desktop GUI app (web dashboard only)
- Built-in DB backup/restore workflows
- Automatic WordPress install unless `--with-wp`
- Per-site PHP versions
- Cloud deployment integration
- Remote DB auto-sync
- Xdebug profiling UI

## Functional requirements (mapped in-progress)
- Shared mount root preserves relative includes to `general/`
- Per-site DB creation via CLI
- Mail routing to Mailpit
- Config in one file (`.env`)
- UID/GID mapping support in env
- `DB_HOST=db` for wp-config

## Current implementation status
- ✅ Foundation compose stack
- ✅ `devbox up/down/restart/status/logs/wp`
- ✅ `devbox add-site <name> [--with-wp]` (creates folder + db + domain-ready routing)
- ✅ dnsmasq setup guide (`devbox dns-setup`)
- 🚧 SSL CA + cert automation
- 🚧 Rich dashboard status/config controls
