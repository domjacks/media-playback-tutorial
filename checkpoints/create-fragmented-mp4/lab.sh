#!/usr/bin/env bash
# Lab: create a progressive and a fragmented MP4, then segment for DASH.
# Run it from a directory where you are happy to create ./lab/
set -euo pipefail

# mp4dump comes from Bento4. If it is not installed, replace it with a stub
# that prints a notice, so the rest of the lab still runs.
if ! command -v mp4dump >/dev/null; then
  mp4dump() { echo "mp4dump not found; skipping box tree (install Bento4)"; }
fi

# #region create-progressive
mkdir -p lab

ffmpeg -y \
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=8 \
  -f lavfi -i sine=frequency=660:sample_rate=48000:duration=8 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -keyint_min 50 -sc_threshold 0 -crf 23 \
  -c:a aac -b:a 128k -ac 2 \
  -movflags +faststart \
  lab/progressive.mp4
# #endregion create-progressive

# #region create-fragmented
ffmpeg -y \
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=8 \
  -f lavfi -i sine=frequency=660:sample_rate=48000:duration=8 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -keyint_min 50 -sc_threshold 0 -crf 23 \
  -c:a aac -b:a 128k -ac 2 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  lab/fragmented.mp4
# #endregion create-fragmented

# #region compare-metadata
ffprobe -hide_banner -show_format -show_streams lab/progressive.mp4
ffprobe -hide_banner -show_format -show_streams lab/fragmented.mp4
# #endregion compare-metadata

# `head` closes the pipe early, which would make the writer fail under pipefail.
set +o pipefail

echo "=== fragment boxes ==="
# #region fragment-boxes
mp4dump lab/fragmented.mp4 | head -120
# #endregion fragment-boxes

set -o pipefail

# #region dash-segments
mkdir -p lab/dash

ffmpeg -y -i lab/progressive.mp4 \
  -map 0:v:0 -map 0:a:0 \
  -c copy \
  -f dash \
  -use_template 1 \
  -use_timeline 0 \
  -seg_duration 2 \
  -init_seg_name 'init-$RepresentationID$.mp4' \
  -media_seg_name 'chunk-$RepresentationID$-$Number%05d$.m4s' \
  lab/dash/manifest.mpd
# #endregion dash-segments

echo "=== dash output ==="
ls lab/dash
grep -c SegmentTimeline lab/dash/manifest.mpd || true
grep -o 'timescale="[0-9]*" duration="[0-9]*"' lab/dash/manifest.mpd | sort -u
