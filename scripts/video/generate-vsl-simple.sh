#!/bin/bash
# SendRight VSL動画生成スクリプト（簡易版・3分）
# gradientsフィルターの問題を回避した安定版

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../../public/videos"
TEMP_DIR="${SCRIPT_DIR}/temp_simple"

FORMAT="${1:-story}"

if [ "$FORMAT" = "story" ]; then
    WIDTH=1080
    HEIGHT=1920
    FS_XL=80
    FS_L=64
    FS_M=48
    FS_S=36
elif [ "$FORMAT" = "feed" ]; then
    WIDTH=1080
    HEIGHT=1080
    FS_XL=72
    FS_L=56
    FS_M=40
    FS_S=32
else
    echo "Error: Use 'story' or 'feed'"
    exit 1
fi

mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

# フォント（macOS標準）
FONT="/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
FONT_BOLD="/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc"

# 色（16進数）
C_PINK="FF6B8A"
C_CORAL="FF8B7B"
C_WHITE="FFFFFF"
C_DARK="1A1A1A"
C_GRAY="666666"
C_LIGHT="FFF5F7"

echo "=== SendRight VSL 3分版（簡易版）==="
echo "フォーマット: $FORMAT ($WIDTH x $HEIGHT)"

# ================================
# シーン生成関数
# ================================
make_scene() {
    local name=$1
    local dur=$2
    local bg=$3
    local filters=$4
    
    ffmpeg -y -f lavfi -i "color=c=0x${bg}:s=${WIDTH}x${HEIGHT}:d=${dur}" \
        -vf "${filters},fade=t=in:st=0:d=0.3,fade=t=out:st=$((dur-1)).5:d=0.5" \
        -c:v libx264 -pix_fmt yuv420p -t ${dur} \
        "${TEMP_DIR}/${name}.mp4" 2>/dev/null
    echo "  ✓ ${name}"
}

# グラデーション背景用（PNG生成→ループ）
make_gradient_bg() {
    local name=$1
    local dur=$2
    
    # グラデーションPNG生成
    ffmpeg -y -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:c0=${C_PINK}:c1=${C_CORAL}:n=2:d=1" \
        -frames:v 1 "${TEMP_DIR}/grad_bg.png" 2>/dev/null
    echo "  ✓ グラデーション背景生成"
}

# ================================
# 全シーン生成
# ================================
echo ""
echo "シーンを生成中..."

# --- セクション1: ファーストビュー（15秒）---
echo "[1/8] ファーストビュー"
make_scene "s01" 5 "${C_DARK}" \
    "drawtext=fontfile='${FONT_BOLD}':text='「また既読スルー…」':fontsize=${FS_XL}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-50,drawtext=fontfile='${FONT}':text='を終わらせる。':fontsize=${FS_L}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)+60"

make_scene "s02" 5 "${C_LIGHT}" \
    "drawtext=fontfile='${FONT}':text='返信の正解を':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT_BOLD}':text='10秒で。':fontsize=${FS_XL}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+20"

make_scene "s03" 5 "${C_DARK}" \
    "drawtext=fontfile='${FONT}':text='🔥 700人斬りのナンパ師が開発':fontsize=${FS_S}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT_BOLD}':text='SendRight':fontsize=${FS_XL}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)+40"

# --- セクション2: 共感（30秒）---
echo "[2/8] 共感・痛み"
make_scene "s04" 5 "2D2D2D" \
    "drawtext=fontfile='${FONT_BOLD}':text='こんな経験、ありませんか？':fontsize=${FS_L}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)"

make_scene "s05" 5 "${C_DARK}" \
    "drawtext=fontfile='${FONT}':text='☐ 返信を考えすぎて':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-40,drawtext=fontfile='${FONT_BOLD}':text='気づいたら深夜2時':fontsize=${FS_L}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)+40"

make_scene "s06" 5 "${C_DARK}" \
    "drawtext=fontfile='${FONT}':text='☐ 既読がついた瞬間':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT_BOLD}':text='祈るような気持ちで':fontsize=${FS_L}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)+20,drawtext=fontfile='${FONT}':text='スマホを見つめている':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+100"

make_scene "s07" 5 "${C_DARK}" \
    "drawtext=fontfile='${FONT}':text='☐ アプリに毎月課金してるのに':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-40,drawtext=fontfile='${FONT_BOLD}':text='一度もデートできていない':fontsize=${FS_L}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)+40"

make_scene "s08" 10 "${C_DARK}" \
    "drawtext=fontfile='${FONT}':text='返信を間違えるたびに':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-100,drawtext=fontfile='${FONT_BOLD}':text='彼女候補が1人ずつ消えていく':fontsize=${FS_L}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2),drawtext=fontfile='${FONT}':text='あなたのせいじゃない。正解を知らなかっただけ。':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+140"

# --- セクション3: 敵の設定（15秒）---
echo "[3/8] 敵の設定"
make_scene "s09" 15 "${C_WHITE}" \
    "drawtext=fontfile='${FONT_BOLD}':text='「センスがないから」は嘘です':fontsize=${FS_L}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-100,drawtext=fontfile='${FONT}':text='実は、女性が「いいな」と思う返信には':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+20,drawtext=fontfile='${FONT_BOLD}':text='パターンがある。':fontsize=${FS_L}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)+100"

# --- セクション4: ブランドストーリー（40秒）---
echo "[4/8] ブランドストーリー"
make_scene "s10" 5 "${C_DARK}" \
    "drawtext=fontfile='${FONT_BOLD}':text='開発者の話を聞いてください':fontsize=${FS_L}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)"

make_scene "s11" 15 "2D2D2D" \
    "drawtext=fontfile='${FONT}':text='僕もかつては':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-140,drawtext=fontfile='${FONT_BOLD}':text='全く女性と話せませんでした':fontsize=${FS_M}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT}':text='何十人とマッチしても':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+40,drawtext=fontfile='${FONT_BOLD}':text='全員に既読スルーされる':fontsize=${FS_M}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+100"

make_scene "s12" 20 "${C_LIGHT}" \
    "drawtext=fontfile='${FONT}':text='でも、気づいたんです':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)-160,drawtext=fontfile='${FONT_BOLD}':text='「正解のパターン」は':fontsize=${FS_L}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT_BOLD}':text='存在する':fontsize=${FS_XL}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+40,drawtext=fontfile='${FONT}':text='それを実践して700人以上と関係を築きました':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+160"

# --- セクション5: ソリューション（20秒）---
echo "[5/8] ソリューション"
make_scene "s13" 5 "${C_WHITE}" \
    "drawtext=fontfile='${FONT_BOLD}':text='SendRightとは？':fontsize=${FS_XL}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-40,drawtext=fontfile='${FONT}':text='恋愛のプロが10秒で代わりに考えるAI':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+40"

make_scene "s14" 15 "${C_LIGHT}" \
    "drawtext=fontfile='${FONT_BOLD}':text='使い方は3ステップ':fontsize=${FS_L}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-220,drawtext=fontfile='${FONT}':text='STEP 1: 相手のメッセージをコピペ':fontsize=${FS_S}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-100,drawtext=fontfile='${FONT}':text='STEP 2: AIが10秒で3つの候補を生成':fontsize=${FS_S}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2),drawtext=fontfile='${FONT}':text='STEP 3: 好きな返信を選んで送信':fontsize=${FS_S}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+100,drawtext=fontfile='${FONT_BOLD}':text='たったこれだけ。':fontsize=${FS_L}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+220"

# --- セクション6: ベネフィット（20秒）---
echo "[6/8] ベネフィット"
make_scene "s15" 20 "${C_WHITE}" \
    "drawtext=fontfile='${FONT_BOLD}':text='SendRightを使うと':fontsize=${FS_L}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-260,drawtext=fontfile='${FONT}':text='❌ 返信に30分悩む → ⭕ 10秒で決まる':fontsize=${FS_S}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-140,drawtext=fontfile='${FONT}':text='❌ 既読スルーの連続 → ⭕ 返信が来る':fontsize=${FS_S}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT}':text='❌ 自信がない → ⭕ 自信がつく':fontsize=${FS_S}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)+20,drawtext=fontfile='${FONT_BOLD}':text='「楽しみにしてます！」':fontsize=${FS_L}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+140,drawtext=fontfile='${FONT}':text='その瞬間を、毎回味わえる':fontsize=${FS_M}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)+220"

# --- セクション7: 社会的証明（15秒）---
echo "[7/8] 社会的証明"
make_scene "s16" 15 "${C_LIGHT}" \
    "drawtext=fontfile='${FONT_BOLD}':text='利用者の声':fontsize=${FS_XL}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-260,drawtext=fontfile='${FONT}':text='⭐⭐⭐⭐⭐':fontsize=${FS_M}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-160,drawtext=fontfile='${FONT_BOLD}':text='「マジで返信に悩まなくなった」':fontsize=${FS_M}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-60,drawtext=fontfile='${FONT}':text='先月ついに彼女ができました - 28歳 会社員':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+20,drawtext=fontfile='${FONT_BOLD}':text='「解説が神」':fontsize=${FS_M}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)+120,drawtext=fontfile='${FONT}':text='自分でも判断できるように - 34歳 エンジニア':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+200"

# --- セクション8: CTA（15秒）---
echo "[8/8] CTA"
make_scene "s17" 10 "${C_WHITE}" \
    "drawtext=fontfile='${FONT_BOLD}':text='まずは7日間':fontsize=${FS_L}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-120,drawtext=fontfile='${FONT_BOLD}':text='無料で試してください':fontsize=${FS_L}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-40,drawtext=fontfile='${FONT}':text='✓ 完全無料 ✓ いつでも解約OK ✓ ワンクリック解約':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+80,drawtext=fontfile='${FONT_BOLD}':text='リスクはゼロです':fontsize=${FS_M}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)+180"

make_scene "s18" 10 "${C_LIGHT}" \
    "drawtext=fontfile='${FONT_BOLD}':text='次のマッチを逃す前に':fontsize=${FS_L}:fontcolor=0x${C_DARK}:x=(w-text_w)/2:y=(h/2)-120,drawbox=x=(w-500)/2:y=(h/2):w=500:h=100:color=0x${C_PINK}:t=fill,drawtext=fontfile='${FONT_BOLD}':text='7日間無料で始める':fontsize=${FS_M}:fontcolor=0x${C_WHITE}:x=(w-text_w)/2:y=(h/2)+25,drawtext=fontfile='${FONT}':text='※クレカ登録不要':fontsize=${FS_S}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+160"

make_scene "s19" 5 "${C_WHITE}" \
    "drawtext=fontfile='${FONT_BOLD}':text='SendRight':fontsize=${FS_XL}:fontcolor=0x${C_PINK}:x=(w-text_w)/2:y=(h/2)-40,drawtext=fontfile='${FONT}':text='返信の正解を、10秒で。':fontsize=${FS_M}:fontcolor=0x${C_GRAY}:x=(w-text_w)/2:y=(h/2)+60"

# ================================
# シーン結合
# ================================
echo ""
echo "シーンを結合中..."

cat > "${TEMP_DIR}/concat.txt" << 'EOF'
file 's01.mp4'
file 's02.mp4'
file 's03.mp4'
file 's04.mp4'
file 's05.mp4'
file 's06.mp4'
file 's07.mp4'
file 's08.mp4'
file 's09.mp4'
file 's10.mp4'
file 's11.mp4'
file 's12.mp4'
file 's13.mp4'
file 's14.mp4'
file 's15.mp4'
file 's16.mp4'
file 's17.mp4'
file 's18.mp4'
file 's19.mp4'
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

# 長さ計算
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null | cut -d. -f1)
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))
echo "長さ: ${MINUTES}分${SECONDS}秒"

echo ""
echo "プレビュー: open \"$OUTPUT_FILE\""
