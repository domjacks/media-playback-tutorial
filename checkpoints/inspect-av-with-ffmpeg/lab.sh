#!/usr/bin/env bash
# Lab: inspect video and audio fundamentals with FFmpeg and FFprobe.
# Run it from a directory where you are happy to create ./lab/
set -euo pipefail

# #region check-tools
ffmpeg -version
ffprobe -version
# #endregion check-tools

# #region generate-mp4
mkdir -p lab

ffmpeg -y \
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=5 \
  -f lavfi -i sine=frequency=1000:sample_rate=48000:duration=5 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -crf 23 \
  -c:a aac -b:a 128k -ac 2 \
  -movflags +faststart \
  lab/fundamentals.mp4
# #endregion generate-mp4

# #region inspect-streams
ffprobe -hide_banner \
  -show_streams \
  -select_streams v:0 \
  lab/fundamentals.mp4

ffprobe -hide_banner \
  -show_streams \
  -select_streams a:0 \
  lab/fundamentals.mp4
# #endregion inspect-streams

echo "=== compact field view ==="
# #region compact-fields
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration \
  -of default=noprint_wrappers=1 \
  lab/fundamentals.mp4

ffprobe -v error \
  -select_streams a:0 \
  -show_entries stream=codec_name,sample_rate,channels,channel_layout,duration \
  -of default=noprint_wrappers=1 \
  lab/fundamentals.mp4
# #endregion compact-fields
