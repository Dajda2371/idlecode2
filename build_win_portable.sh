#!/bin/bash

# Ensure electron-builder is installed
if ! npm list electron-builder > /dev/null 2>&1; then
    echo "Installing electron-builder..."
    npm install --save-dev electron-builder
fi

echo "Building Windows Portable Executable..."
npm run build:win

echo "Build complete! Check 'dist' folder."
