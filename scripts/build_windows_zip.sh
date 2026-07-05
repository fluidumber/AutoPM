#!/bin/bash
set -e

ZIP_NAME="ProductFlow-Windows.zip"
BUILD_DIR="tmp_win_build"

echo "Creating Windows package..."
rm -rf "$BUILD_DIR" "$ZIP_NAME"
mkdir -p "$BUILD_DIR"

echo "Downloading official Windows Node.js binary..."
NODE_ZIP="node-v20.18.0-win-x64.zip"
if [ ! -f "$NODE_ZIP" ]; then
    curl -sO "https://nodejs.org/dist/v20.18.0/$NODE_ZIP"
fi

echo "Extracting node.exe..."
unzip -q -j "$NODE_ZIP" "node-v20.18.0-win-x64/node.exe" -d "$BUILD_DIR"

echo "Bundling ProductFlow source..."
mkdir -p "$BUILD_DIR/app"
rsync -a --exclude '.git' --exclude 'node_modules' --exclude 'ProductFlow Installer.app' --exclude 'ProductFlow.dmg' --exclude "$BUILD_DIR" --exclude "$ZIP_NAME" --exclude "dist" --exclude "node-v20.18.0*" --exclude "tmp" . "$BUILD_DIR/app/"
rsync -a node_modules "$BUILD_DIR/app/"

echo "Copying installer script..."
cp scripts/install.ps1 "$BUILD_DIR/install.ps1"

echo "Creating Windows installer ZIP..."
cd "$BUILD_DIR"
zip -q -r "../$ZIP_NAME" *
cd ..

rm -rf "$BUILD_DIR"
echo "Successfully built $ZIP_NAME"
