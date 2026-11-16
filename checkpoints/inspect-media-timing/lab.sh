#!/usr/bin/env bash
# Lab: inspect timescales, PTS/DTS, AAC priming, edit lists and fragment timing.
# Run it from a directory where you are happy to create ./lab/
# Needs FFmpeg, FFprobe and node (for boxes.js, which sits next to this script).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
boxes() { node "$HERE/boxes.js" "$@"; }

# #region create-source
mkdir -p lab

# -bf 2 enables B-frames, so decode order differs from presentation order.
ffmpeg -v error -y \
  -f lavfi -i testsrc2=size=640x360:rate=25:duration=4 \
  -f lavfi -i sine=frequency=440:sample_rate=48000:duration=4 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -bf 2 \
  -c:a aac -b:a 96k -ac 2 \
  lab/timing.mp4
# #endregion create-source

echo "=== timescales and start times ==="
# #region timescales
ffprobe -v error \
  -show_entries stream=index,codec_type,time_base,start_pts,start_time,duration_ts \
  -of compact=p=0 \
  lab/timing.mp4
# #endregion timescales

# `head` closes the pipe early, which would make ffprobe fail under pipefail.
set +o pipefail

echo "=== video packets in decode order ==="
# #region pts-dts
ffprobe -v error \
  -select_streams v:0 \
  -show_packets \
  -show_entries packet=pts,dts,pts_time,dts_time,flags \
  -of compact=p=0 \
  lab/timing.mp4 | head -8
# #endregion pts-dts

echo "=== same packets sorted into presentation order ==="
# #region reorder
ffprobe -v error \
  -select_streams v:0 \
  -show_packets \
  -show_entries packet=pts,dts \
  -of csv=p=0 \
  lab/timing.mp4 | sort -t, -k1,1n | head -8
# #endregion reorder

echo "=== audio packets: AAC priming ==="
# #region aac-priming
ffprobe -v error \
  -select_streams a:0 \
  -show_packets \
  -show_entries packet=pts,dts,pts_time,duration,flags:packet_side_data=skip_samples \
  -of compact=p=0 \
  lab/timing.mp4 | head -3
# #endregion aac-priming
set -o pipefail

echo "=== edit lists in the default file ==="
# #region elst-default
boxes lab/timing.mp4 | grep -E "mdhd|elst|ctts"
# #endregion elst-default

echo "=== the same encode without an edit list ==="
# #region elst-off
ffmpeg -v error -y \
  -f lavfi -i testsrc2=size=640x360:rate=25:duration=4 \
  -f lavfi -i sine=frequency=440:sample_rate=48000:duration=4 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -bf 2 \
  -c:a aac -b:a 96k -ac 2 \
  -use_editlist 0 \
  lab/no-editlist.mp4

ffprobe -v error \
  -show_entries stream=codec_type,start_pts,start_time \
  -of compact=p=0 \
  lab/no-editlist.mp4

boxes lab/no-editlist.mp4 | grep -E "elst|stts" || true
# #endregion elst-off

echo "=== fragmented output ==="
# #region make-fragmented
ffmpeg -v error -y \
  -f lavfi -i testsrc2=size=640x360:rate=25:duration=4 \
  -f lavfi -i sine=frequency=440:sample_rate=48000:duration=4 \
  -c:v libx264 -pix_fmt yuv420p -g 50 -bf 2 \
  -c:a aac -b:a 96k -ac 2 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  lab/frag.mp4
# #endregion make-fragmented

# #region frag-monotonic
ffprobe -v error \
  -select_streams v:0 \
  -show_packets \
  -show_entries packet=dts_time \
  -of csv=p=0 \
  lab/frag.mp4 |
  awk 'NR > 1 && $1 + 0 <= prev + 0 { bad += 1 } { prev = $1 }
       END { print NR " video packets, non-increasing dts steps: " bad + 0 }'
# #endregion frag-monotonic

echo "=== fragment boxes: tfdt and trun ==="
# #region frag-boxes
boxes lab/frag.mp4 | grep -E "moof|mfhd|tfhd|tfdt|trun"
# #endregion frag-boxes

echo "=== negative composition offsets ==="
# #region negative-cts
ffmpeg -v error -y -i lab/timing.mp4 -c copy \
  -movflags frag_keyframe+empty_moov+default_base_moof+negative_cts_offsets \
  lab/frag-negative-cts.mp4

boxes lab/frag-negative-cts.mp4 | grep -E "tfdt|trun" | head -4
# #endregion negative-cts
