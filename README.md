# WPDevBox (MVP scaffold)

Docker-based local WordPress environment designed as a Devilbox replacement.

## Quick start

```bash
cp .env.example .env
./bin/devbox up --build
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

```bash
./bin/devbox up
./bin/devbox down
./bin/devbox restart
./bin/devbox status
./bin/devbox logs [service]
./bin/devbox wp --info
./bin/devbox ssl-init
./bin/devbox add-site asi
./bin/devbox add-site ffb --with-wp
./bin/devbox dns-setup
```

`ssl-init` creates local trusted certs (mkcert) for `*.loc` and `localhost` in `config/certs/`.

`add-site` creates:
- `data/www/<name>/`
- MySQL database `wp_<name>`
- domain mapping via wildcard routing (`<name>.loc` by default)

If WP-CLI is missing in the `php` container, `devbox` auto-installs it on first `devbox wp ...` call or `add-site --with-wp`.

## SSL (mkcert)

Install mkcert (macOS):

```bash
brew install mkcert nss
```

Then initialize certs:

```bash
./bin/devbox ssl-init
```

## Domain resolution

Recommended (macOS): dnsmasq resolver for `*.loc`.

```bash
./bin/devbox dns-setup
```

Fallback: add hosts entries manually, e.g.:

```bash
127.0.0.1 asi.loc
```

## Notes

- Current MVP uses one PHP version for all sites (configurable globally).
- Site-specific SSL generation is planned next.
- Dashboard is currently read-only.
