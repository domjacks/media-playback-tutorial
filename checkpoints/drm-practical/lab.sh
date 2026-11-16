#!/usr/bin/env bash
# Regenerates the ClearKey test assets in ./media. Run from anywhere. Needs ffmpeg and node.
# TEST ONLY: this key is published in the tutorial. Never use it for real content.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p media
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# #region keys
# TEST ONLY - public, well-known values. 16 bytes each, as 32 hex characters.
KID=00112233445566778899aabbccddeeff
KEY=0f1e2d3c4b5a69788796a5b4c3d2e1f0
# #endregion keys

# #region clear-source
# Clear source: 4 s of test video plus a sine tone. No B-frames and a keyframe
# every second keep the fragments simple and the timestamps starting at zero.
ffmpeg -y -v error -f lavfi -i "testsrc2=size=640x360:rate=25:duration=4" \
  -f lavfi -i "sine=frequency=440:duration=4" \
  -c:v libx264 -profile:v high -level 3.1 -pix_fmt yuv420p -b:v 400k \
  -bf 0 -g 25 -keyint_min 25 -sc_threshold 0 \
  -c:a aac -b:a 64k -ar 44100 -ac 2 "$work/clear.mp4"
# #endregion clear-source

# #region encrypt
# One fragmented, CENC (AES-CTR) encrypted file per track, same KID and key.
# -frag_duration is set long enough for a single moof: with several fragments,
# the FFmpeg build used here wrote cumulative senc/saiz tables (fragment 2 listed
# 50 samples, not 25), which FFmpeg's own decryptor then rejected.
for track in video audio; do
  map=0:v; [ "$track" = audio ] && map=0:a
  ffmpeg -y -v error -i "$work/clear.mp4" -map "$map" -c copy \
    -movflags +empty_moov+default_base_moof -frag_duration 60000000 \
    -encryption_scheme cenc-aes-ctr -encryption_key "$KEY" -encryption_kid "$KID" \
    "media/$track.mp4"
done
# #endregion encrypt

# #region add-pssh
# FFmpeg writes tenc/senc but no pssh, so the browser would never fire "encrypted".
# Add a W3C common-system pssh (SystemID 1077efec-...) carrying the KID.
for track in video audio; do
  node add-pssh.js "media/$track.mp4" "$KID"
done
# #endregion add-pssh

# #region verify
# Remux the same tracks without encryption (same flags), decrypt the encrypted
# files with FFmpeg, and compare per-frame hashes. Remuxing the clear source the
# same way matters: the fragmented files drop the AAC priming edit list, so the
# original clear.mp4 has one fewer audio frame.
for track in video audio; do
  map=0:v; [ "$track" = audio ] && map=0:a
  ffmpeg -y -v error -i "$work/clear.mp4" -map "$map" -c copy \
    -movflags +empty_moov+default_base_moof -frag_duration 60000000 "$work/clear.$track.mp4"
  ffmpeg -v error -i "$work/clear.$track.mp4" -f framemd5 "$work/clear.$track.md5"
  ffmpeg -v error -decryption_key "$KEY" -i "media/$track.mp4" -f framemd5 "$work/dec.$track.md5"
  diff <(grep -v '^#' "$work/clear.$track.md5") <(grep -v '^#' "$work/dec.$track.md5") \
    && echo "$track: $(grep -vc '^#' "$work/dec.$track.md5") frames identical after decryption"
  # Negative control: without the key the frame hashes must differ.
  ffmpeg -v error -i "media/$track.mp4" -f framemd5 "$work/enc.$track.md5" 2>/dev/null || true
  cmp -s <(grep -v '^#' "$work/clear.$track.md5") <(grep -v '^#' "$work/enc.$track.md5") \
    && echo "$track: UNEXPECTED, encrypted file matches clear" || echo "$track: encrypted file does not match clear (expected)"
done
# #endregion verify
