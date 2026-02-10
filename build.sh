#!/bin/bash
set -e

echo "Starting build process for macOS, Windows, and Linux..."

# Ensure dependencies are installed
npm install

# Build for all platforms
# -m: macOS (dmg)
# -w: Windows (portable exe)
# -l: Linux (AppImage)
# --x64: Intel/AMD 64-bit
# --arm64: ARM 64-bit (Apple Silicon, Linux ARM)
npx electron-builder -mwl --x64 --arm64

echo "Build complete! Artifacts are in the dist/ directory."
