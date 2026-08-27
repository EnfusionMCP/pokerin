#!/usr/bin/env bash
#
# One-time VPS setup for pokerin.space on a fresh Hetzner CX22 (Ubuntu 24.04)
# Run as root: curl -sSL <this-script> | bash
#
set -euo pipefail

echo "=== pokerin.space VPS setup ==="

# ── 1. System updates + firewall ─────────────────────────────
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates ufw git curl python3 util-linux nano sudo

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy redirect)
ufw allow 443/tcp   # HTTPS
ufw allow 443/udp   # HTTP/3
ufw --force enable

# ── 2. Install Docker from its signed APT repository ─────────
if ! command -v docker &>/dev/null; then
    # shellcheck source=/dev/null
    . /etc/os-release
    if [ "${ID:-}" != "ubuntu" ] || [ "${VERSION_CODENAME:-}" != "noble" ]; then
        echo "This setup script supports Ubuntu 24.04 (noble) only." >&2
        exit 1
    fi
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
    apt-get update
    # Override this explicitly when advancing Docker; APT rejects a version
    # whose signed repository metadata is unavailable for noble.
    DOCKER_CE_VERSION=${DOCKER_CE_VERSION:-5:29.7.2-1~ubuntu.24.04~noble}
    apt-get install -y \
        docker-ce="$DOCKER_CE_VERSION" \
        docker-ce-cli="$DOCKER_CE_VERSION" \
        containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
fi

# ── 3. Create app user ───────────────────────────────────────
if ! id pokerin &>/dev/null; then
    useradd -m -s /bin/bash pokerin
    usermod -aG docker pokerin
fi

# ── 4. Clone repo ────────────────────────────────────────────
APP_DIR="/home/pokerin/app"
if [ ! -d "$APP_DIR" ]; then
    echo "Clone your repo into $APP_DIR:"
    echo "  sudo -u pokerin git clone <your-repo-url> $APP_DIR"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone repo:     sudo -u pokerin git clone <repo> $APP_DIR"
echo "  2. Create .env:    install -o pokerin -g pokerin -m 0600 $APP_DIR/.env.example $APP_DIR/.env"
echo "  3. Edit as owner:  sudo -u pokerin nano $APP_DIR/.env"
echo "  4. Point DNS:      A record for pokerin.space -> this server's IP"
echo "  5. Provision/adopt the external PostgreSQL volume (deploy/README.md)"
echo "  6. Configure and initialize the off-host backup path (deploy/README.md)"
echo "  7. Launch:         sudo -u pokerin sh -c 'cd $APP_DIR && sh deploy/deploy.sh'"
echo "  8. Enable the daily backup timer (deploy/README.md)"
echo "  9. Check logs:     docker compose logs -f"
