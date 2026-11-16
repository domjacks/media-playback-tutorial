#!/usr/bin/env bash
# Lab: inspect an MP4 as streams, packets, frames and boxes.
# Run it from a directory where you are happy to create ./lab/
set -euo pipefail

# mp4dump comes from Bento4. If it is not installed, replace it with a stub
# that prints a notice, so the rest of the lab still runs.
if ! command -v mp4dump >/dev/null; then
  mp4dump() { echo "mp4dump not found; skipping box tree (install Bento4)"; }
fi

# #region check-tools
ffmpeg -version
ffprobe -version
mp4dump --version
# #endregion check-tools

# #region create-faststart
mkdir -p lab

ffmpeg -y \
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=6 \
  -f lavfi -i sine=frequency=440:sample_rate=48000:duration=6 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -crf 23 \
  -c:a aac -b:a 128k -ac 2 \
  -movflags +faststart \
  lab/container-faststart.mp4
# #endregion create-faststart

# #region show-format
ffprobe -hide_banner \
  -show_format \
  -show_streams \
  lab/container-faststart.mp4
# #endregion show-format

# `head` closes the pipe early, which would make the writer fail under pipefail.
set +o pipefail

echo "=== packets ==="
# #region inspect-packets
ffprobe -v error \
  -select_streams v:0 \
  -show_packets \
  -show_entries packet=stream_index,pts_time,dts_time,duration_time,size,flags \
  -of compact=p=0 \
  lab/container-faststart.mp4 | head -30
# #endregion inspect-packets

echo "=== frames ==="
# #region inspect-frames
ffprobe -v error \
  -select_streams v:0 \
  -show_frames \
  -show_entries frame=key_frame,pict_type,best_effort_timestamp_time,pkt_size \
  -of compact=p=0 \
  lab/container-faststart.mp4 | head -40
# #endregion inspect-frames

echo "=== box tree ==="
# #region box-tree
mp4dump lab/container-faststart.mp4 | head -80
# #endregion box-tree

set -o pipefail
