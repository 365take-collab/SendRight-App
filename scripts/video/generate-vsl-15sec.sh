#!/bin/bash
# SendRight VSL動画生成スクリプト（15秒版）
# 使用方法: ./generate-vsl-15sec.sh [output_format: story|feed]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../../public/videos"
TEMP_DIR="${SCRIPT_DIR}/temp"

# 出力フォーマット（デフォルト: story = 1080x1920）
FORMAT="${1:-story}"

if [ "$FORMAT" = "story" ]; then
    WIDTH=1080
    HEIGHT=1920
    FONT_SIZE_MAIN=72
    FONT_SIZE_SUB=48
    FONT_SIZE_CTA=56
elif [ "$FORMAT" = "feed" ]; then
    WIDTH=1080
    HEIGHT=1080
    FONT_SIZE_MAIN=64
    FONT_SIZE_SUB=40
    FONT_SIZE_CTA=48
else
    echo "Error: Invalid format. Use 'story' or 'feed'"
    exit 1
fi

mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

# 日本語フォント（Hiragino Sans）
FONT="/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
FONT_BOLD="/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc"

# 色設定
COLOR_PINK="#FF6B8A"
COLOR_CORAL="#FF8B7B"
COLOR_WHITE="#FFFFFF"
COLOR_DARK="#1A1A1A"
COLOR_GRAY="#666666"

echo "=== SendRight VSL 15秒版 生成開始 ==="
echo "フォーマット: $FORMAT ($WIDTH x $HEIGHT)"

# シーン1: フック（0-3秒）「また既読スルー…」
echo "シーン1: フック（0-3秒）"
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=3" \
    -vf "
        drawtext=fontfile='${FONT}':text='「また既読スルー…」':fontsize=${FONT_SIZE_MAIN}:fontcolor=${COLOR_PINK}:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0.5,3)',
        fade=t=in:st=0:d=0.5,
        fade=t=out:st=2.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 3 \
    "${TEMP_DIR}/scene1.mp4" 2>/dev/null

# シーン2: 痛みの増幅（3-7秒）「返信を考えて深夜2時」
echo "シーン2: 痛みの増幅（3-7秒）"
ffmpeg -y -f lavfi -i "color=c=0x2D2D2D:s=${WIDTH}x${HEIGHT}:d=4" \
    -vf "
        drawtext=fontfile='${FONT}':text='返信を考えて':fontsize=${FONT_SIZE_SUB}:fontcolor=${COLOR_GRAY}:x=(w-text_w)/2:y=(h/2)-80:enable='between(t,0.3,4)',
        drawtext=fontfile='${FONT_BOLD}':text='深夜2時':fontsize=${FONT_SIZE_MAIN}:fontcolor=${COLOR_WHITE}:x=(w-text_w)/2:y=(h/2)+20:enable='between(t,0.6,4)',
        drawtext=fontfile='${FONT}':text='😔':fontsize=100:x=(w-text_w)/2:y=(h/2)+140:enable='between(t,1,4)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=3.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 4 \
    "${TEMP_DIR}/scene2.mp4" 2>/dev/null

# シーン3: 解決策（7-12秒）「正解を10秒で」
echo "シーン3: 解決策（7-12秒）"
ffmpeg -y -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:c0=${COLOR_PINK}:c1=${COLOR_CORAL}:d=5:speed=0.5" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='正解を':fontsize=${FONT_SIZE_SUB}:fontcolor=${COLOR_WHITE}:x=(w-text_w)/2:y=(h/2)-120:enable='between(t,0.3,5)',
        drawtext=fontfile='${FONT_BOLD}':text='10秒で':fontsize=${FONT_SIZE_MAIN}:fontcolor=${COLOR_WHITE}:x=(w-text_w)/2:y=(h/2)-20:enable='between(t,0.6,5)',
        drawtext=fontfile='${FONT}':text='3つから選ぶだけ':fontsize=${FONT_SIZE_SUB}:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)+100:enable='between(t,1.2,5)',
        drawtext=fontfile='${FONT}':text='✨':fontsize=80:x=(w/2)-200:y=(h/2)+200:enable='between(t,1.5,5)',
        drawtext=fontfile='${FONT}':text='✨':fontsize=60:x=(w/2)+150:y=(h/2)+180:enable='between(t,1.8,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 5 \
    "${TEMP_DIR}/scene3.mp4" 2>/dev/null

# シーン4: CTA（12-15秒）「7日間無料」
echo "シーン4: CTA（12-15秒）"
ffmpeg -y -f lavfi -i "color=c=0xFFFFFF:s=${WIDTH}x${HEIGHT}:d=3" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='SendRight':fontsize=${FONT_SIZE_MAIN}:fontcolor=${COLOR_PINK}:x=(w-text_w)/2:y=(h/2)-100:enable='between(t,0.2,3)',
        drawbox=x=(w-400)/2:y=(h/2)+20:w=400:h=80:color=${COLOR_PINK}@1:t=fill:enable='between(t,0.5,3)',
        drawtext=fontfile='${FONT_BOLD}':text='7日間無料':fontsize=${FONT_SIZE_CTA}:fontcolor=${COLOR_WHITE}:x=(w-text_w)/2:y=(h/2)+35:enable='between(t,0.5,3)',
        drawtext=fontfile='${FONT}':text='※クレカ登録不要':fontsize=32:fontcolor=${COLOR_GRAY}:x=(w-text_w)/2:y=(h/2)+140:enable='between(t,1,3)',
        fade=t=in:st=0:d=0.2,
        fade=t=out:st=2.7:d=0.3
    " \
    -c:v libx264 -pix_fmt yuv420p -t 3 \
    "${TEMP_DIR}/scene4.mp4" 2>/dev/null

# シーンを結合
echo "シーンを結合中..."
cat > "${TEMP_DIR}/concat.txt" << EOF
file 'scene1.mp4'
file 'scene2.mp4'
file 'scene3.mp4'
file 'scene4.mp4'
EOF

OUTPUT_FILE="${OUTPUT_DIR}/vsl-15sec-${FORMAT}.mp4"

ffmpeg -y -f concat -safe 0 -i "${TEMP_DIR}/concat.txt" \
    -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
    -movflags +faststart \
    "$OUTPUT_FILE" 2>/dev/null

# 一時ファイル削除
rm -rf "${TEMP_DIR}"

echo "=== 完了 ==="
echo "出力: $OUTPUT_FILE"
echo "サイズ: $(du -h "$OUTPUT_FILE" | cut -f1)"

# ファイル情報表示
ffprobe -v quiet -show_format -show_streams "$OUTPUT_FILE" 2>/dev/null | grep -E "^(duration|width|height|bit_rate)=" | head -10 || true

echo ""
echo "プレビュー: open \"$OUTPUT_FILE\""
