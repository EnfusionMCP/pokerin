#!/usr/bin/env bash
#
# One-time VPS setup for pokerin.space on a fresh Hetzner CX22 (Ubuntu 24.04)
# Run as root: curl -sSL <this-script> | bash
#
set -euo pipefail

echo "=== pokerin.space VPS setup ==="

# ── 1. System updates + firewall ─────────────────────────────
apt-get update && apt-get upgrade -y
apt-get install -y ufw git curl

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy redirect)
ufw allow 443/tcp   # HTTPS
ufw allow 443/udp   # HTTP/3
ufw --force enable

# ── 2. Install Docker ────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
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
echo "  2. Create .env:    cp $APP_DIR/.env.production $APP_DIR/.env"
echo "  3. Edit secrets:   nano $APP_DIR/.env"
echo "  4. Point DNS:      A record for pokerin.space -> this server's IP"
echo "  5. Launch:         cd $APP_DIR && docker compose up -d --build"
echo "  6. Check logs:     docker compose logs -f"
