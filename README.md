# WPDevBox (MVP scaffold)

Docker-based local WordPress environment designed as a Devilbox replacement.

## Quick start

```bash
cp .env.example .env
./bin/devbox up
./bin/devbox status
```

## Directory layout

- `data/www/<site>`: site roots (e.g. `data/www/asi`)
- `data/www/general`: shared code directory

This preserves relative include paths between sites and `general/`.

## Services

- PHP container (`devbox-php`)
- Web server (via `WEB_SERVER=nginx|apache` profile)
- DB (`MYSQL_IMAGE` configurable)
- Mailpit
- Adminer
- Dashboard (MVP)

## Ports

Configured in `.env` and chosen to avoid common Local WP defaults.

## CLI

- `./bin/devbox up|down|restart|status|logs`
- `./bin/devbox wp --info`
