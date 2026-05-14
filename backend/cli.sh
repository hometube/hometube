#!/bin/bash
# HomeTube CLI helper — manages virtual environment and ht command.
#
# Usage:
#   source cli.sh                 Activate virtual environment in current shell
#   bash cli.sh init              Create/update venv and install requirements
#   bash cli.sh update            Reinstall pip dependencies in existing venv
#   bash cli.sh install           Install ht command (uses venv Python)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
VENV_PYTHON="$VENV_DIR/bin/python3"
VENV_ACTIVATE="$VENV_DIR/bin/activate"

activate_venv() {
    if [ ! -f "$VENV_ACTIVATE" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv "$VENV_DIR"
    fi
    # shellcheck disable=SC1091
    source "$VENV_ACTIVATE"
}

case "${1:-}" in
    init)
        activate_venv
        echo "📥 Installing dependencies..."
        pip install -r "$SCRIPT_DIR/requirements.txt"
        echo "✅ Virtual environment ready at $VENV_DIR"
        echo "   Run: source $SCRIPT_DIR/cli.sh   (to activate in current shell)"
        ;;
    update)
        if [ ! -f "$VENV_ACTIVATE" ]; then
            echo "❌ No virtual environment found. Run 'cli.sh init' first."
            exit 1
        fi
        activate_venv
        echo "📥 Updating dependencies..."
        pip install -r "$SCRIPT_DIR/requirements.txt"
        echo "✅ Updated."
        ;;
    install)
        activate_venv
        python "$SCRIPT_DIR/cli.py" install
        # Rewrite the ht wrapper to use the venv Python so it always
        # runs in the correct environment regardless of PATH order.
        HT_PATH="$HOME/.local/bin/ht"
        if [ -f "$HT_PATH" ]; then
            cat > "$HT_PATH" <<- EOF
			#!/bin/sh
			exec "$VENV_PYTHON" "$SCRIPT_DIR/cli.py" "\$@"
			EOF
            chmod +x "$HT_PATH"
            echo "🔗 ht now uses venv Python: $VENV_PYTHON"
        fi
        echo "✅ ht installed. Make sure ~/.local/bin is in your PATH:"
        echo "   export PATH=\"\$PATH:$HOME/.local/bin\""
        ;;
    *)
        # No command — just activate (for sourcing)
        if [ -f "$VENV_ACTIVATE" ]; then
            # shellcheck disable=SC1091
            source "$VENV_ACTIVATE"
            echo "🐍 Virtual environment activated"
        else
            echo "Run 'cli.sh init' first to set up virtual environment."
        fi
        ;;
esac
