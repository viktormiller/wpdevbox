ARG PHP_VERSION=8.2
FROM webdevops/php-apache-dev:${PHP_VERSION}

USER root

RUN set -eux; \
    curl -fsSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp; \
    chmod +x /usr/local/bin/wp; \
    wp --info --allow-root >/dev/null 2>&1 || true
