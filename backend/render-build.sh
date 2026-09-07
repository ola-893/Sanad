#!/usr/bin/env bash
# Render build script for Sanad backend

set -e

echo "Starting Render build process..."

# Build the application
echo "Building application..."
pnpm build

# Run database migrations
echo "Running database migrations..."
pnpm run migrate

echo "Build complete!"
