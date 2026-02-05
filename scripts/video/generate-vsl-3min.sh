#!/bin/bash
# SendRight VSL動画生成スクリプト（3分版 - フルストーリー）
# LP構成案に基づく10セクション構成

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../../public/videos"
TEMP_DIR="${SCRIPT_DIR}/temp_3min"

# 出力フォーマット
FORMAT="${1:-story}"

if [ "$FORMAT" = "story" ]; then
    WIDTH=1080
    HEIGHT=1920
    FONT_SIZE_XL=80
    FONT_SIZE_MAIN=64
    FONT_SIZE_SUB=48
    FONT_SIZE_SM=36
    FONT_SIZE_XS=28
elif [ "$FORMAT" = "feed" ]; then
    WIDTH=1080
    HEIGHT=1080
    FONT_SIZE_XL=72
    FONT_SIZE_MAIN=56
    FONT_SIZE_SUB=40
    FONT_SIZE_SM=32
    FONT_SIZE_XS=24
else
    echo "Error: Invalid format. Use 'story' or 'feed'"
    exit 1
fi

mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

# フォント
FONT="/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
FONT_BOLD="/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc"
FONT_LIGHT="/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"

# 色設定
PINK="#FF6B8A"
CORAL="#FF8B7B"
WHITE="#FFFFFF"
DARK="#1A1A1A"
GRAY="#666666"
LIGHT_PINK="#FFF5F7"

echo "=== SendRight VSL 3分版 生成開始 ==="
echo "フォーマット: $FORMAT ($WIDTH x $HEIGHT)"

# =========================================
# セクション1: ファーストビュー（0-15秒）
# =========================================
echo "[1/10] ファーストビュー（0-15秒）"

# 1-A: フック（0-5秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='「また既読スルー…」':fontsize=${FONT_SIZE_XL}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)-50:enable='between(t,0.5,5)',
        drawtext=fontfile='${FONT}':text='を終わらせる。':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,1.5,5)',
        fade=t=in:st=0:d=0.5,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 5 \
    "${TEMP_DIR}/s01a.mp4" 2>/dev/null

# 1-B: サブヘッド（5-10秒）
ffmpeg -y -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:c0=${PINK}:c1=${CORAL}:d=5" \
    -vf "
        drawtext=fontfile='${FONT}':text='返信の正解を':fontsize=${FONT_SIZE_SUB}:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)-80:enable='between(t,0.3,5)',
        drawtext=fontfile='${FONT_BOLD}':text='10秒で。':fontsize=${FONT_SIZE_XL}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+20:enable='between(t,0.8,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 5 \
    "${TEMP_DIR}/s01b.mp4" 2>/dev/null

# 1-C: 権威バッジ（10-15秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawbox=x=(w-600)/2:y=(h/2)-60:w=600:h=80:color=${PINK}@0.3:t=fill,
        drawtext=fontfile='${FONT}':text='🔥 700人斬りのナンパ師が開発':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)-35:enable='between(t,0.5,5)',
        drawtext=fontfile='${FONT_BOLD}':text='SendRight':fontsize=${FONT_SIZE_XL}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,1,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 5 \
    "${TEMP_DIR}/s01c.mp4" 2>/dev/null

# =========================================
# セクション2: 共感（痛みの提示）（15-45秒）
# =========================================
echo "[2/10] 共感・痛みの提示（15-45秒）"

# 2-A: 導入（15-20秒）
ffmpeg -y -f lavfi -i "color=c=0x2D2D2D:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='こんな経験、':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,0.5,5)',
        drawtext=fontfile='${FONT_BOLD}':text='ありませんか？':fontsize=${FONT_SIZE_MAIN}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+40:enable='between(t,1,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 5 \
    "${TEMP_DIR}/s02a.mp4" 2>/dev/null

# 2-B: 痛み1（20-25秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT}':text='☐ 返信を考えすぎて':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,0.3,5)',
        drawtext=fontfile='${FONT_BOLD}':text='気づいたら深夜2時':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+40:enable='between(t,0.8,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t 5 \
    "${TEMP_DIR}/s02b.mp4" 2>/dev/null

# 2-C: 痛み2（25-30秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT}':text='☐ 既読がついた瞬間':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,0.3,5)',
        drawtext=fontfile='${FONT_BOLD}':text='祈るような気持ちで':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+40:enable='between(t,0.8,5)',
        drawtext=fontfile='${FONT}':text='スマホを見つめている':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+120:enable='between(t,1.3,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=5 \
    "${TEMP_DIR}/s02c.mp4" 2>/dev/null

# 2-D: 痛み3（30-35秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT}':text='☐ アプリに毎月課金してるのに':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,0.3,5)',
        drawtext=fontfile='${FONT_BOLD}':text='一度もデートできていない':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+40:enable='between(t,0.8,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=5 \
    "${TEMP_DIR}/s02d.mp4" 2>/dev/null

# 2-E: 痛みの増幅（35-45秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=10" \
    -vf "
        drawtext=fontfile='${FONT}':text='返信を間違えるたびに':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-100:enable='between(t,0.5,10)',
        drawtext=fontfile='${FONT_BOLD}':text='彼女候補が':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)-20:enable='between(t,1,10)',
        drawtext=fontfile='${FONT_BOLD}':text='1人ずつ消えていく':fontsize=${FONT_SIZE_MAIN}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,1.5,10)',
        drawtext=fontfile='${FONT}':text='あなたのせいじゃない。':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+180:enable='between(t,4,10)',
        drawtext=fontfile='${FONT_BOLD}':text='正解を知らなかっただけ。':fontsize=${FONT_SIZE_SUB}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+240:enable='between(t,5.5,10)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=9.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=10 \
    "${TEMP_DIR}/s02e.mp4" 2>/dev/null

# =========================================
# セクション3: 敵の設定（45-60秒）
# =========================================
echo "[3/10] 敵の設定（45-60秒）"

ffmpeg -y -f lavfi -i "color=c=0xFFFFFF:s=${WIDTH}x${HEIGHT}:d=15" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='「センスがないから」':fontsize=${FONT_SIZE_MAIN}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-100:enable='between(t,0.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='は嘘です':fontsize=${FONT_SIZE_XL}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2):enable='between(t,1.5,15)',
        drawtext=fontfile='${FONT}':text='実は、女性が「いいな」と思う返信には':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+140:enable='between(t,5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='パターンがある。':fontsize=${FONT_SIZE_MAIN}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)+200:enable='between(t,6.5,15)',
        drawtext=fontfile='${FONT}':text='正解は存在する。':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+300:enable='between(t,9,15)',
        drawtext=fontfile='${FONT_BOLD}':text='あなたには見えていなかっただけ。':fontsize=${FONT_SIZE_SUB}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+360:enable='between(t,11,15)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=14.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=15 \
    "${TEMP_DIR}/s03.mp4" 2>/dev/null

# =========================================
# セクション4: ブランドストーリー（60-100秒）
# =========================================
echo "[4/10] ブランドストーリー（60-100秒）"

# 4-A: 導入（60-70秒）
ffmpeg -y -f lavfi -i "color=c=0x1A1A1A:s=${WIDTH}x${HEIGHT}:d=10" \
    -vf "
        drawtext=fontfile='${FONT}':text='開発者の話を':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-60:enable='between(t,0.5,10)',
        drawtext=fontfile='${FONT_BOLD}':text='聞いてください':fontsize=${FONT_SIZE_XL}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+20:enable='between(t,1,10)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=9.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=10 \
    "${TEMP_DIR}/s04a.mp4" 2>/dev/null

# 4-B: ストーリー前半（70-85秒）
ffmpeg -y -f lavfi -i "color=c=0x2D2D2D:s=${WIDTH}x${HEIGHT}:d=15" \
    -vf "
        drawtext=fontfile='${FONT}':text='僕もかつては':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-160:enable='between(t,0.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='全く女性と話せませんでした':fontsize=${FONT_SIZE_SUB}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)-80:enable='between(t,1.5,15)',
        drawtext=fontfile='${FONT}':text='何十人とマッチしても':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+20:enable='between(t,4,15)',
        drawtext=fontfile='${FONT_BOLD}':text='全員に既読スルーされる':fontsize=${FONT_SIZE_SUB}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+80:enable='between(t,5.5,15)',
        drawtext=fontfile='${FONT}':text='「俺のどこがダメなんだ」':fontsize=${FONT_SIZE_SUB}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+180:enable='between(t,8,15)',
        drawtext=fontfile='${FONT}':text='毎晩、スマホを握りしめて悩んでいました':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+260:enable='between(t,10,15)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=14.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=15 \
    "${TEMP_DIR}/s04b.mp4" 2>/dev/null

# 4-C: ストーリー後半（85-100秒）
ffmpeg -y -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:c0=${PINK}:c1=${CORAL}:d=15" \
    -vf "
        drawtext=fontfile='${FONT}':text='でも、気づいたんです':fontsize=${FONT_SIZE_SUB}:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)-160:enable='between(t,0.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='「正解のパターン」は':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)-60:enable='between(t,2,15)',
        drawtext=fontfile='${FONT_BOLD}':text='存在する':fontsize=${FONT_SIZE_XL}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+30:enable='between(t,3,15)',
        drawtext=fontfile='${FONT}':text='それを体系化して実践した結果':fontsize=${FONT_SIZE_SM}:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)+140:enable='between(t,6,15)',
        drawtext=fontfile='${FONT_BOLD}':text='700人以上':fontsize=${FONT_SIZE_XL}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)+220:enable='between(t,8,15)',
        drawtext=fontfile='${FONT}':text='の女性と関係を築くことができました':fontsize=${FONT_SIZE_SM}:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)+300:enable='between(t,10,15)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=14.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=15 \
    "${TEMP_DIR}/s04c.mp4" 2>/dev/null

# =========================================
# セクション5: ソリューション提示（100-120秒）
# =========================================
echo "[5/10] ソリューション提示（100-120秒）"

# 5-A: 紹介（100-105秒）
ffmpeg -y -f lavfi -i "color=c=0xFFFFFF:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='SendRightとは？':fontsize=${FONT_SIZE_XL}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,0.5,5)',
        drawtext=fontfile='${FONT}':text='恋愛のプロが10秒で代わりに考えるAI':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+40:enable='between(t,1.5,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=5 \
    "${TEMP_DIR}/s05a.mp4" 2>/dev/null

# 5-B: 3ステップ（105-120秒）
ffmpeg -y -f lavfi -i "color=c=0xFFF5F7:s=${WIDTH}x${HEIGHT}:d=15" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='使い方は3ステップ':fontsize=${FONT_SIZE_MAIN}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-240:enable='between(t,0.5,15)',
        drawtext=fontfile='${FONT}':text='STEP 1':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)-140:enable='between(t,2,15)',
        drawtext=fontfile='${FONT_BOLD}':text='相手のメッセージをコピペ':fontsize=${FONT_SIZE_SUB}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-80:enable='between(t,2.5,15)',
        drawtext=fontfile='${FONT}':text='STEP 2':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2):enable='between(t,5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='AIが10秒で3つの候補を生成':fontsize=${FONT_SIZE_SUB}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,5.5,15)',
        drawtext=fontfile='${FONT}':text='STEP 3':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+140:enable='between(t,8,15)',
        drawtext=fontfile='${FONT_BOLD}':text='好きな返信を選んで送信':fontsize=${FONT_SIZE_SUB}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)+200:enable='between(t,8.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='たったこれだけ。':fontsize=${FONT_SIZE_MAIN}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+320:enable='between(t,11,15)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=14.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=15 \
    "${TEMP_DIR}/s05b.mp4" 2>/dev/null

# =========================================
# セクション6: ベネフィット（120-140秒）
# =========================================
echo "[6/10] ベネフィット（120-140秒）"

ffmpeg -y -f lavfi -i "color=c=0xFFFFFF:s=${WIDTH}x${HEIGHT}:d=20" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='SendRightを使うと':fontsize=${FONT_SIZE_MAIN}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-280:enable='between(t,0.5,20)',
        drawtext=fontfile='${FONT}':text='❌ 返信に30分悩む':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=100:y=(h/2)-160:enable='between(t,2,20)',
        drawtext=fontfile='${FONT_BOLD}':text='→ ⭕ 10秒で決まる':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=500:y=(h/2)-160:enable='between(t,3,20)',
        drawtext=fontfile='${FONT}':text='❌ 既読スルーの連続':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=100:y=(h/2)-80:enable='between(t,5,20)',
        drawtext=fontfile='${FONT_BOLD}':text='→ ⭕ 返信が来る':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=500:y=(h/2)-80:enable='between(t,6,20)',
        drawtext=fontfile='${FONT}':text='❌ 自信がない':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=100:y=(h/2):enable='between(t,8,20)',
        drawtext=fontfile='${FONT_BOLD}':text='→ ⭕ 自信がつく':fontsize=${FONT_SIZE_SM}:fontcolor=${PINK}:x=500:y=(h/2):enable='between(t,9,20)',
        drawtext=fontfile='${FONT}':text='朝起きてスマホを見たら':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+120:enable='between(t,12,20)',
        drawtext=fontfile='${FONT_BOLD}':text='「楽しみにしてます！」':fontsize=${FONT_SIZE_MAIN}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+200:enable='between(t,14,20)',
        drawtext=fontfile='${FONT}':text='その瞬間を、毎回味わえる':fontsize=${FONT_SIZE_SUB}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)+300:enable='between(t,16,20)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=19.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=20 \
    "${TEMP_DIR}/s06.mp4" 2>/dev/null

# =========================================
# セクション7: 社会的証明（140-155秒）
# =========================================
echo "[7/10] 社会的証明（140-155秒）"

ffmpeg -y -f lavfi -i "color=c=0xFFF5F7:s=${WIDTH}x${HEIGHT}:d=15" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='利用者の声':fontsize=${FONT_SIZE_XL}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-280:enable='between(t,0.5,15)',
        drawtext=fontfile='${FONT}':text='⭐⭐⭐⭐⭐':fontsize=${FONT_SIZE_SUB}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)-180:enable='between(t,1.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='「マジで返信に悩まなくなった」':fontsize=${FONT_SIZE_SUB}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-100:enable='between(t,3,15)',
        drawtext=fontfile='${FONT}':text='先月ついに彼女ができました':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,4.5,15)',
        drawtext=fontfile='${FONT}':text='- 28歳 会社員':fontsize=${FONT_SIZE_XS}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+20:enable='between(t,5.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='「解説が神」':fontsize=${FONT_SIZE_SUB}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)+120:enable='between(t,8,15)',
        drawtext=fontfile='${FONT}':text='自分でも判断できるようになった':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+180:enable='between(t,9.5,15)',
        drawtext=fontfile='${FONT}':text='- 34歳 エンジニア':fontsize=${FONT_SIZE_XS}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+240:enable='between(t,10.5,15)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=14.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=15 \
    "${TEMP_DIR}/s07.mp4" 2>/dev/null

# =========================================
# セクション8: 料金・オファー（155-170秒）
# =========================================
echo "[8/10] 料金・オファー（155-170秒）"

ffmpeg -y -f lavfi -i "color=c=0xFFFFFF:s=${WIDTH}x${HEIGHT}:d=15" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='まずは7日間':fontsize=${FONT_SIZE_MAIN}:fontcolor=${DARK}:x=(w-text_w)/2:y=(h/2)-200:enable='between(t,0.5,15)',
        drawtext=fontfile='${FONT_BOLD}':text='無料で試してください':fontsize=${FONT_SIZE_MAIN}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)-120:enable='between(t,1.5,15)',
        drawtext=fontfile='${FONT}':text='✓ 7日間は完全無料':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2):enable='between(t,4,15)',
        drawtext=fontfile='${FONT}':text='✓ 合わなければいつでも解約OK':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,5.5,15)',
        drawtext=fontfile='${FONT}':text='✓ 解約はワンクリック':fontsize=${FONT_SIZE_SM}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+120:enable='between(t,7,15)',
        drawtext=fontfile='${FONT_BOLD}':text='リスクはゼロです':fontsize=${FONT_SIZE_SUB}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+220:enable='between(t,10,15)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=14.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=15 \
    "${TEMP_DIR}/s08.mp4" 2>/dev/null

# =========================================
# セクション9: 最終CTA（170-180秒）
# =========================================
echo "[9/10] 最終CTA（170-180秒）"

ffmpeg -y -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:c0=${PINK}:c1=${CORAL}:d=10" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='次のマッチを':fontsize=${FONT_SIZE_MAIN}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)-120:enable='between(t,0.5,10)',
        drawtext=fontfile='${FONT_BOLD}':text='逃す前に':fontsize=${FONT_SIZE_XL}:fontcolor=${WHITE}:x=(w-text_w)/2:y=(h/2)-20:enable='between(t,1.5,10)',
        drawbox=x=(w-500)/2:y=(h/2)+100:w=500:h=100:color=white@1:t=fill:enable='between(t,4,10)',
        drawtext=fontfile='${FONT_BOLD}':text='7日間無料で始める':fontsize=${FONT_SIZE_SUB}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)+125:enable='between(t,4,10)',
        drawtext=fontfile='${FONT}':text='※クレカ登録不要':fontsize=${FONT_SIZE_XS}:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)+240:enable='between(t,6,10)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=9.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=10 \
    "${TEMP_DIR}/s09.mp4" 2>/dev/null

# =========================================
# セクション10: エンドカード（180-185秒）
# =========================================
echo "[10/10] エンドカード（180-185秒）"

ffmpeg -y -f lavfi -i "color=c=0xFFFFFF:s=${WIDTH}x${HEIGHT}:d=5" \
    -vf "
        drawtext=fontfile='${FONT_BOLD}':text='SendRight':fontsize=${FONT_SIZE_XL}:fontcolor=${PINK}:x=(w-text_w)/2:y=(h/2)-60:enable='between(t,0.3,5)',
        drawtext=fontfile='${FONT}':text='返信の正解を、10秒で。':fontsize=${FONT_SIZE_SUB}:fontcolor=${GRAY}:x=(w-text_w)/2:y=(h/2)+40:enable='between(t,0.8,5)',
        fade=t=in:st=0:d=0.3,
        fade=t=out:st=4.5:d=0.5
    " \
    -c:v libx264 -pix_fmt yuv420p -t=5 \
    "${TEMP_DIR}/s10.mp4" 2>/dev/null

# =========================================
# すべてのシーンを結合
# =========================================
echo "シーンを結合中..."

cat > "${TEMP_DIR}/concat.txt" << EOF
file 's01a.mp4'
file 's01b.mp4'
file 's01c.mp4'
file 's02a.mp4'
file 's02b.mp4'
file 's02c.mp4'
file 's02d.mp4'
file 's02e.mp4'
file 's03.mp4'
file 's04a.mp4'
file 's04b.mp4'
file 's04c.mp4'
file 's05a.mp4'
file 's05b.mp4'
file 's06.mp4'
file 's07.mp4'
file 's08.mp4'
file 's09.mp4'
file 's10.mp4'
EOF

OUTPUT_FILE="${OUTPUT_DIR}/vsl-3min-${FORMAT}.mp4"

ffmpeg -y -f concat -safe 0 -i "${TEMP_DIR}/concat.txt" \
    -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
    -movflags +faststart \
    "$OUTPUT_FILE" 2>/dev/null

# 一時ファイル削除
rm -rf "${TEMP_DIR}"

echo ""
echo "=== 完了 ==="
echo "出力: $OUTPUT_FILE"
echo "サイズ: $(du -h "$OUTPUT_FILE" | cut -f1)"

# ファイル情報表示
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null | cut -d. -f1)
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))
echo "長さ: ${MINUTES}分${SECONDS}秒"

echo ""
echo "プレビュー: open \"$OUTPUT_FILE\""
