#!/usr/bin/env bash
set -euo pipefail

# Convert GIF(s) to loop-friendly MP4 for portfolio motion clips.
# Usage:
#   ./scripts/convert-gif-to-mp4.sh path/to/file.gif
#   ./scripts/convert-gif-to-mp4.sh path/to/images/*.gif

for input in "$@"; do
	output="${input%.gif}.mp4"
	ffmpeg -y -i "$input" \
		-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
		-c:v libx264 \
		-crf 28 \
		-preset medium \
		-movflags +faststart \
		-pix_fmt yuv420p \
		-an \
		"$output"
	echo "Wrote $output"
done
