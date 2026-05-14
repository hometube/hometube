#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 HomeTube Installer"
echo ""

# Backend setup (virtual environment + dependencies)
echo "=== Backend ==="
cd "$SCRIPT_DIR/backend"
bash cli.sh init

# Frontend setup (npm install + build)
echo ""
echo "=== Frontend ==="
cd "$SCRIPT_DIR/frontend"
echo "📦 Installing npm dependencies..."
npm install
echo "🔨 Building frontend..."
npm run build

# Install ht command
echo ""
echo "=== CLI ==="
cd "$SCRIPT_DIR/backend"
bash cli.sh install

echo ""
echo "✅ HomeTube installation complete!"
echo ""
echo "To start the server:"
echo "  cd backend && source cli.sh && python main.py"
echo ""
echo "Or use the ht CLI tool:"
echo "  ht init                    # configure data directory and user"
echo "  ht login <username>        # set active user"
echo "  ht download <url>          # download videos/music"
echo "  ht export -o backup.ht     # export your data"
