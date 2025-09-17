#!/bin/bash

echo "🚀 Setting up Papyrus Lite 2..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY"
else
    echo "✅ .env file already exists"
fi

echo "✅ Setup complete!"
echo ""
echo "To run in development mode:"
echo "1. Terminal 1: npm run dev (backend server)"
echo "2. Terminal 2: cd client && npm start (React dev server)"
echo "3. Open http://localhost:3000"
echo ""
echo "Don't forget to add your ANTHROPIC_API_KEY to the .env file!"
