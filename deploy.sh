#!/bin/bash

echo "🚀 Deploying Papyrus Lite 2 to production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Build the React app
echo "🔨 Building React app for production..."
cd client
npm run build
cd ..

# Check if build was successful
if [ ! -f "client/build/index.html" ]; then
    echo "❌ Build failed! client/build/index.html not found."
    exit 1
fi

# Create production .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating production .env file..."
    cp .env.production .env
    echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY"
fi

# Ensure data directory exists
mkdir -p data

echo "✅ Build complete!"
echo ""
echo "To start the production server:"
echo "npm start"
echo ""
echo "The app will be available at:"
echo "- Backend: http://localhost:3001 → https://api-dev.jimboslice.xyz"
echo "- Frontend: http://localhost:4201 → https://dev.jimboslice.xyz"
echo ""
echo "Make sure your nginx configuration is active and your .env file has the correct ANTHROPIC_API_KEY"
