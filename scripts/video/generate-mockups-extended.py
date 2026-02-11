#!/usr/bin/env python3
"""
SendRight 追加モックアップ画像生成
- 会話パターン複数版
- UI詳細版
- ユーザーの声
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent.parent / "public" / "images" / "mockups"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

C_PINK = (255, 107, 138)
C_WHITE = (255, 255, 255)
C_DARK = (26, 26, 26)
C_LIGHT_BG = (255, 245, 247)
C_GRAY = (107, 114, 128)
C_LIGHT_GRAY = (229, 231, 235)
C_GREEN = (34, 197, 94)
C_RED = (239, 68, 68)
C_LINE_BG = (123, 184, 193)

FONT_CANDIDATES = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    "/System/Library/Fonts/Hiragino Sans W3.ttc",
    "/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    "/Library/Fonts/Hiragino Sans W3.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJKjp-Regular.otf",
    "/usr/share/fonts/truetype/ipafont-gothic/ipag.ttf",
]
FONT_BOLD_CANDIDATES = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/Hiragino Sans W6.ttc",
    "/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/Library/Fonts/Hiragino Sans W6.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/truetype/ipafont-gothic/ipagp.ttf",
]

def find_font_path(candidates):
    for path in candidates:
        if Path(path).exists():
            return path
    return None

FONT_PATH = find_font_path(FONT_CANDIDATES)
FONT_BOLD_PATH = find_font_path(FONT_BOLD_CANDIDATES)

def get_font(size, bold=False):
    font_path = FONT_BOLD_PATH if bold else FONT_PATH
    if font_path:
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            pass
    return ImageFont.load_default()

def draw_rounded_rect(draw, coords, radius, fill, outline=None):
    x1, y1, x2, y2 = coords
    if hasattr(draw, "rounded_rectangle"):
        draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill, outline=outline)
    else:
        draw.rectangle([x1, y1, x2, y2], fill=fill, outline=outline)

def create_iphone_frame(width=390, height=844):
    frame_width = width + 40
    frame_height = height + 40
    img = Image.new('RGBA', (frame_width, frame_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_rounded_rect(draw, (0, 0, frame_width, frame_height), 50, (30, 30, 30))
    draw_rounded_rect(draw, (20, 20, frame_width-20, frame_height-20), 40, C_WHITE)
    notch_width = 120
    notch_x = (frame_width - notch_width) // 2
    draw_rounded_rect(draw, (notch_x, 25, notch_x + notch_width, 60), 18, (30, 30, 30))
    return img, (20, 70, frame_width-20, frame_height-40)

def create_line_problem_2():
    """失敗パターン2: 真面目すぎる返信"""
    print("失敗パターン2を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    draw.rectangle([sx, sy, ex, sy + 60], fill=C_WHITE)
    draw.text((sx + 50, sy + 18), "<", font=get_font(24), fill=C_GRAY)
    draw.text((sx + screen_width//2 - 35, sy + 18), "みく", font=get_font(20, bold=True), fill=C_DARK)
    draw.rectangle([sx, sy + 60, ex, ey - 60], fill=C_LINE_BG)

    y_pos = sy + 100
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 280, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "今度ごはん行きたいな〜", font=get_font(16), fill=C_DARK)

    y_pos += 80
    draw_rounded_rect(draw, (ex - 280, y_pos, ex - 20, y_pos + 70), 15, (150, 230, 100))
    draw.text((ex - 265, y_pos + 10), "いいですね！どこが", font=get_font(15), fill=C_DARK)
    draw.text((ex - 265, y_pos + 35), "お好きですか？", font=get_font(15), fill=C_DARK)
    draw.text((ex - 315, y_pos + 50), "既読", font=get_font(11), fill=(100, 100, 100))

    y_pos += 120
    draw.text((sx + screen_width//2 - 30, y_pos), "3日後...", font=get_font(12), fill=(150, 150, 150))
    y_pos += 35
    draw.text((sx + screen_width//2 - 35, y_pos), "返信なし", font=get_font(16), fill=(180, 80, 80))

    draw.rectangle([sx, sy + 60, ex, sy + 95], fill=(255, 220, 220))
    draw.text((sx + screen_width//2 - 80, sy + 68), "真面目すぎて重い", font=get_font(14), fill=(180, 50, 50))

    draw.rectangle([sx, ey - 60, ex, ey], fill=C_WHITE)

    img.save(OUTPUT_DIR / "line-problem-2.png")
    print(f"  -> {OUTPUT_DIR / 'line-problem-2.png'}")

def create_line_problem_3():
    """失敗パターン3: 質問攻め"""
    print("失敗パターン3を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    draw.rectangle([sx, sy, ex, sy + 60], fill=C_WHITE)
    draw.text((sx + 50, sy + 18), "<", font=get_font(24), fill=C_GRAY)
    draw.text((sx + screen_width//2 - 35, sy + 18), "りな", font=get_font(20, bold=True), fill=C_DARK)
    draw.rectangle([sx, sy + 60, ex, ey - 60], fill=C_LINE_BG)

    y_pos = sy + 100
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 260, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "カフェ巡りが好きです", font=get_font(16), fill=C_DARK)

    y_pos += 70
    draw_rounded_rect(draw, (ex - 230, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 215, y_pos + 12), "どこのカフェが好き?", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 260, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "渋谷のあのお店とか", font=get_font(16), fill=C_DARK)

    y_pos += 65
    draw_rounded_rect(draw, (ex - 200, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 185, y_pos + 12), "へ〜いつ行くの?", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 160, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "休みの日...", font=get_font(16), fill=C_DARK)

    y_pos += 65
    draw_rounded_rect(draw, (ex - 210, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 195, y_pos + 12), "休みは何曜日?", font=get_font(15), fill=C_DARK)

    y_pos += 70
    draw.text((sx + screen_width//2 - 35, y_pos), "返信なし", font=get_font(16), fill=(180, 80, 80))

    draw.rectangle([sx, sy + 60, ex, sy + 95], fill=(255, 220, 220))
    draw.text((sx + screen_width//2 - 60, sy + 68), "質問ばかりで疲れる", font=get_font(14), fill=(180, 50, 50))

    draw.rectangle([sx, ey - 60, ex, ey], fill=C_WHITE)

    img.save(OUTPUT_DIR / "line-problem-3.png")
    print(f"  -> {OUTPUT_DIR / 'line-problem-3.png'}")

def create_line_success_2():
    """成功パターン2: 違う会話からデートへ"""
    print("成功パターン2を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    draw.rectangle([sx, sy, ex, sy + 60], fill=C_WHITE)
    draw.text((sx + 50, sy + 18), "<", font=get_font(24), fill=C_GRAY)
    draw.text((sx + screen_width//2 - 35, sy + 18), "みく", font=get_font(20, bold=True), fill=C_DARK)
    draw.rectangle([sx, sy + 60, ex, ey - 60], fill=C_LINE_BG)

    y_pos = sy + 100

    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 280, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "今度ごはん行きたいな〜", font=get_font(15), fill=C_DARK)

    y_pos += 60
    draw_rounded_rect(draw, (ex - 200, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 185, y_pos + 12), "奢ってくれるの?笑", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 200, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "逆に奢るし！笑", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw_rounded_rect(draw, (ex - 210, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 195, y_pos + 12), "じゃあ土曜どう?", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 250, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "いいよ！楽しみ〜", font=get_font(15), fill=C_DARK)

    draw.rectangle([sx, sy + 60, ex, sy + 95], fill=(200, 255, 200))
    draw.text((sx + screen_width//2 - 70, sy + 70), "デートの約束成立", font=get_font(14, bold=True), fill=(50, 150, 50))

    draw.rectangle([sx, ey - 60, ex, ey], fill=C_WHITE)

    img.save(OUTPUT_DIR / "line-success-2.png")
    print(f"  -> {OUTPUT_DIR / 'line-success-2.png'}")

def create_line_success_3():
    """成功パターン3: 質問を弄りに変換"""
    print("成功パターン3を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    draw.rectangle([sx, sy, ex, sy + 60], fill=C_WHITE)
    draw.text((sx + 50, sy + 18), "<", font=get_font(24), fill=C_GRAY)
    draw.text((sx + screen_width//2 - 35, sy + 18), "りな", font=get_font(20, bold=True), fill=C_DARK)
    draw.rectangle([sx, sy + 60, ex, ey - 60], fill=C_LINE_BG)

    y_pos = sy + 100
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 260, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "カフェ巡りが好きです", font=get_font(15), fill=C_DARK)

    y_pos += 60
    draw_rounded_rect(draw, (ex - 210, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 195, y_pos + 12), "意識高いやつだ笑", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 240, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "失礼な！違うし笑", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw_rounded_rect(draw, (ex - 240, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 225, y_pos + 12), "じゃあ俺にも教えてよ", font=get_font(15), fill=C_DARK)

    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 210, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "いいよ！いつ?", font=get_font(15), fill=C_DARK)

    draw.rectangle([sx, sy + 60, ex, sy + 95], fill=(200, 255, 200))
    draw.text((sx + screen_width//2 - 70, sy + 70), "デートの約束成立", font=get_font(14, bold=True), fill=(50, 150, 50))

    draw.rectangle([sx, ey - 60, ex, ey], fill=C_WHITE)

    img.save(OUTPUT_DIR / "line-success-3.png")
    print(f"  -> {OUTPUT_DIR / 'line-success-3.png'}")

def create_sendright_ui_2():
    """SendRight UI: 別の会話パターン"""
    print("SendRight UI 2を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    for i in range(ey - sy):
        ratio = i / (ey - sy)
        g = int(255 + (245 - 255) * ratio)
        b = int(255 + (247 - 255) * ratio)
        draw.line([(sx, sy + i), (ex, sy + i)], fill=(255, g, b))

    draw.text((sx + screen_width//2 - 50, sy + 20), "SendRight", font=get_font(22, bold=True), fill=C_PINK)

    y_pos = sy + 70
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 70), 15, C_WHITE, outline=C_LIGHT_GRAY)
    draw.text((sx + 35, y_pos + 10), "相手のメッセージ", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 35), "今度ごはん行きたいな〜", font=get_font(16), fill=C_DARK)

    y_pos += 95
    draw.text((sx + 25, y_pos), "返信候補", font=get_font(14, bold=True), fill=C_DARK)

    y_pos += 35
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 105), 15, C_WHITE, outline=C_PINK)
    draw.text((sx + 35, y_pos + 10), "候補 1", font=get_font(12, bold=True), fill=C_PINK)
    draw.text((sx + 35, y_pos + 35), "奢ってくれるの?笑", font=get_font(17), fill=C_DARK)
    draw.text((sx + 35, y_pos + 65), "軽い弄りで相手を試す", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 85), "主導権を握れる", font=get_font(11), fill=C_GRAY)

    y_pos += 120
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 105), 15, C_WHITE, outline=C_LIGHT_GRAY)
    draw.text((sx + 35, y_pos + 10), "候補 2", font=get_font(12, bold=True), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 35), "いいね、何食べたい?", font=get_font(17), fill=C_DARK)
    draw.text((sx + 35, y_pos + 65), "相手に選ばせる", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 85), "好みを知れる", font=get_font(11), fill=C_GRAY)

    y_pos += 120
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 105), 15, C_WHITE, outline=C_LIGHT_GRAY)
    draw.text((sx + 35, y_pos + 10), "候補 3", font=get_font(12, bold=True), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 35), "じゃあ土曜どう?", font=get_font(17), fill=C_DARK)
    draw.text((sx + 35, y_pos + 65), "具体的に誘う", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 85), "即アポを狙う", font=get_font(11), fill=C_GRAY)

    y_pos += 130
    draw_rounded_rect(draw, (sx + 60, y_pos, ex - 60, y_pos + 50), 25, C_PINK)
    draw.text((sx + screen_width//2 - 55, y_pos + 13), "コピーして送信", font=get_font(16, bold=True), fill=C_WHITE)

    img.save(OUTPUT_DIR / "sendright-ui-2.png")
    print(f"  -> {OUTPUT_DIR / 'sendright-ui-2.png'}")

def create_testimonial():
    """ユーザーの声"""
    print("ユーザーの声を生成中...")
    width, height = 900, 600
    img = Image.new('RGBA', (width, height), C_LIGHT_BG)
    draw = ImageDraw.Draw(img)

    draw.text((width//2 - 100, 30), "利用者の声", font=get_font(32, bold=True), fill=C_DARK)

    testimonials = [
        ("28歳 会社員", "マッチングアプリで3年彼女なし", "→ 2ヶ月で彼女できた", "「返信で悩まなくなった」"),
        ("34歳 エンジニア", "既読スルー連発で自信喪失", "→ 返信率が激変した", "「解説を読んで上達できた」"),
        ("25歳 営業", "デートまで行けない", "→ 毎週デートできる", "「自然に誘えるようになった」"),
    ]

    y = 100
    for age, before, after, quote in testimonials:
        draw_rounded_rect(draw, (40, y, 860, y + 140), 15, C_WHITE)

        draw.ellipse([60, y + 20, 120, y + 80], fill=C_PINK)
        draw.text((75, y + 35), age[:2], font=get_font(18, bold=True), fill=C_WHITE)

        draw.text((140, y + 20), age, font=get_font(16, bold=True), fill=C_DARK)
        draw.text((140, y + 50), before, font=get_font(14), fill=C_GRAY)
        draw.text((140, y + 75), after, font=get_font(16, bold=True), fill=C_GREEN)

        draw.text((500, y + 50), quote, font=get_font(18), fill=C_PINK)

        y += 160

    img.save(OUTPUT_DIR / "testimonial.png")
    print(f"  -> {OUTPUT_DIR / 'testimonial.png'}")

def create_pain_point():
    """痛みの可視化"""
    print("痛みの可視化を生成中...")
    width, height = 900, 500
    img = Image.new('RGBA', (width, height), C_WHITE)
    draw = ImageDraw.Draw(img)

    draw.text((width//2 - 130, 30), "こんな経験ありませんか？", font=get_font(28, bold=True), fill=C_DARK)

    pains = [
        ("返信を考えすぎて", "気づいたら深夜2時"),
        ("送った後も", "「これでよかったのか…」とモヤモヤ"),
        ("既読がついた瞬間", "祈るような気持ちでスマホを見つめる"),
        ("マッチするのに", "メッセージで関係が終わる"),
    ]

    y = 100
    for line1, line2 in pains:
        draw_rounded_rect(draw, (50, y, 850, y + 80), 10, C_LIGHT_BG)
        draw.text((80, y + 15), line1, font=get_font(18), fill=C_GRAY)
        draw.text((80, y + 45), line2, font=get_font(20, bold=True), fill=C_DARK)
        y += 95

    img.save(OUTPUT_DIR / "pain-point.png")
    print(f"  -> {OUTPUT_DIR / 'pain-point.png'}")

def main():
    print("=== SendRight 追加モックアップ生成 ===\n")
    create_line_problem_2()
    create_line_problem_3()
    create_line_success_2()
    create_line_success_3()
    create_sendright_ui_2()
    create_testimonial()
    create_pain_point()
    print(f"\n=== 完了 ===")
    print(f"出力先: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
