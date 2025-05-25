#!/bin/bash

TARGET="$1"
if [ -z "$TARGET" ]; then
  echo "Usage: $0 <permalink>"
  exit 1
fi

if ! command -v convert &> /dev/null; then
  echo "ImageMagick is not installed. Please install it to run this script."
  exit 1
fi

IMAGE_DIR="assets/resources-$TARGET"

if [ ! -d "$IMAGE_DIR" ]; then
  echo "Directory $IMAGE_DIR does not exist. Please check the permalink."
  exit 1
fi

echo "Before optimization:"
du -ch "$IMAGE_DIR"/*.png | grep total

# Optimize each PNG file while maintaining aspect ratio
echo "Optimizing images..."
for img in "$IMAGE_DIR"/*.png; do
  echo "Processing $img"
  # Optimize the PNG using ImageMagick
  # -quality 85% gives good compression while maintaining visual quality
  # -strip removes metadata to reduce file size
  # We'll resize to 75% of original size and apply compression
  convert "$img" -resize 75% -quality 85% -strip "$img"
done

# Get after sizes
echo "After optimization:"
du -ch "$IMAGE_DIR"/*.png | grep total

echo "Optimization complete!"
