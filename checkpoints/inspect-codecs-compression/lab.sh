#!/usr/bin/env bash
# Lab: encode one source several ways with libx264 and compare the results.
# Run it from a directory where you are happy to create ./lab/
set -euo pipefail

# #region create-source
mkdir -p lab

ffmpeg -y \
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=8 \
  -f lavfi -i sine=frequency=880:sample_rate=48000:duration=8 \
  -c:v ffv1 \
  -c:a pcm_s16le \
  lab/source.mkv
# #endregion create-source

# #region compare-crf
ffmpeg -y -i lab/source.mkv \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -g 50 \
  -c:a aac -b:a 128k \
  lab/h264-crf18.mp4

ffmpeg -y -i lab/source.mkv \
  -c:v libx264 -pix_fmt yuv420p -crf 32 -g 50 \
  -c:a aac -b:a 128k \
  lab/h264-crf32.mp4

ls -lh lab/h264-crf18.mp4 lab/h264-crf32.mp4
# #endregion compare-crf

# #region inspect-bitrate
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,profile,pix_fmt,bit_rate,avg_frame_rate \
  -of default=noprint_wrappers=1 \
  lab/h264-crf18.mp4

ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,profile,pix_fmt,bit_rate,avg_frame_rate \
  -of default=noprint_wrappers=1 \
  lab/h264-crf32.mp4
# #endregion inspect-bitrate

# #region bitrate-target
ffmpeg -y -i lab/source.mkv \
  -c:v libx264 -pix_fmt yuv420p \
  -b:v 1200k -maxrate 1200k -bufsize 2400k \
  -g 50 \
  -c:a aac -b:a 128k \
  lab/h264-1200k.mp4
# #endregion bitrate-target

# `head` closes the pipe early, which would make ffprobe fail under pipefail.
set +o pipefail

echo "=== frame types, CRF 18 ==="
# #region frame-types
ffprobe -v error \
  -select_streams v:0 \
  -show_entries frame=pts_time,pict_type,key_frame \
  -of compact=p=0 \
  lab/h264-crf18.mp4 | head -40
# #endregion frame-types

echo "=== frame types, GOP 25 without B-frames ==="
# #region gop-no-bframes
ffmpeg -y -i lab/source.mkv \
  -c:v libx264 -pix_fmt yuv420p -crf 23 \
  -g 25 -bf 0 \
  -c:a aac -b:a 128k \
  lab/h264-gop25-no-bframes.mp4

ffprobe -v error \
  -select_streams v:0 \
  -show_entries frame=pict_type,key_frame \
  -of compact=p=0 \
  lab/h264-gop25-no-bframes.mp4 | head -40
# #endregion gop-no-bframes

set -o pipefail
