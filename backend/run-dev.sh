#!/bin/bash
# HomeTube Development Runner with ngrok
# This script starts the backend with automatic ngrok tunnel for secure public access

echo "🚀 Starting HomeTube Backend with ngrok tunnel..."
echo "This will provide a secure public URL for use with GitHub Pages frontend"
echo ""

# Activate virtual environment if it exists
if [ -f ".venv/bin/activate" ]; then
    echo "📦 Activating virtual environment..."
    source .venv/bin/activate
fi

# Install/update dependencies
echo "📥 Installing/updating dependencies..."
pip install -r requirements.txt

# Start the backend with dev flag for ngrok
echo "🔌 Starting backend server with ngrok tunnel..."
python main.py --dev