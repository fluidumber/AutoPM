#!/bin/bash
set -e

APP_NAME="ProductFlow Installer"
APP_DIR="$APP_NAME.app"
DMG_NAME="ProductFlow.dmg"

echo "Building AppleScript Application..."
osacompile -o "$APP_DIR" scripts/installer.applescript

echo "Setting up Resources..."
mkdir -p "$APP_DIR/Contents/Resources"
cp scripts/install.sh "$APP_DIR/Contents/Resources/install.sh"
chmod +x "$APP_DIR/Contents/Resources/install.sh"

echo "Bundling Node..."
NODE_TAR="node-v20.18.0-darwin-arm64.tar.gz"
NODE_DIR="node-v20.18.0-darwin-arm64"
if [ ! -f "$NODE_TAR" ]; then
    echo "Downloading official Node.js binary..."
    curl -sO "https://nodejs.org/dist/v20.18.0/$NODE_TAR"
fi
if [ ! -d "$NODE_DIR" ]; then
    tar -xf "$NODE_TAR"
fi
rm -f "$APP_DIR/Contents/Resources/node"
cp "$NODE_DIR/bin/node" "$APP_DIR/Contents/Resources/node"

echo "Bundling ProductFlow source..."
mkdir -p "$APP_DIR/Contents/Resources/app"
rsync -a --exclude '.git' --exclude 'node_modules' --exclude "$APP_DIR" --exclude "$DMG_NAME" --exclude "dist" . "$APP_DIR/Contents/Resources/app/"
# Include node_modules separately to speed up the process instead of npm install
rsync -a node_modules "$APP_DIR/Contents/Resources/app/"

echo "Creating DMG..."
rm -f "$DMG_NAME"
hdiutil create -volname "ProductFlow" -srcfolder "$APP_DIR" -ov -format UDZO "$DMG_NAME"

echo "Successfully built $DMG_NAME"
