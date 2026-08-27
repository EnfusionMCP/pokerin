#!/bin/sh
# Exercise a reverse-proxy failure and prove query/referrer credentials are
# absent from Caddy's runtime (not merely access-file) logs.

set -eu

image=${1:-pokerin-web:ci}
container="pokerin-caddy-redaction-$$"

cleanup() {
    docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

# The dollar sign below belongs to Caddy's regular expression.
# shellcheck disable=SC2016
config='{
	auto_https off
	log default {
		format filter {
			request>uri regexp `\?.*$` ``
			request>headers>Referer delete
		}
	}
}
:8080 {
	reverse_proxy 127.0.0.1:59999
}'

docker run -d --name "$container" \
    -e TEST_CADDYFILE="$config" \
    "$image" /bin/sh -c \
    'printf "%s\n" "$TEST_CADDYFILE" > /tmp/Caddyfile && exec caddy run --config /tmp/Caddyfile --adapter caddyfile' \
    >/dev/null

attempt=0
while :; do
    if docker logs "$container" 2>&1 | grep -Fq 'serving initial configuration'; then
        break
    fi
    attempt=$((attempt + 1))
    [ "$attempt" -lt 20 ] || {
        docker logs "$container" >&2
        echo "Caddy redaction test did not become ready" >&2
        exit 1
    }
    sleep 0.25
done

docker exec "$container" wget -q -O /dev/null \
    --header='Referer: https://invalid.example/?token=REFERER_CREDENTIAL_SENTINEL' \
    'http://127.0.0.1:8080/auth/callback?code=OAUTH_CODE_SENTINEL&state=OAUTH_STATE_SENTINEL' \
    >/dev/null 2>&1 || true

logs=$(docker logs "$container" 2>&1)
printf '%s\n' "$logs" | grep -Fq 'http.log.error' || {
    echo "Caddy redaction test did not exercise runtime error logging" >&2
    exit 1
}
if printf '%s\n' "$logs" \
    | grep -Eq 'OAUTH_CODE_SENTINEL|OAUTH_STATE_SENTINEL|REFERER_CREDENTIAL_SENTINEL'; then
    echo "Caddy runtime logs exposed a request credential sentinel" >&2
    exit 1
fi

echo "Caddy runtime log redaction verified"
