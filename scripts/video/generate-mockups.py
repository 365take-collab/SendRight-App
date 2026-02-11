#!/usr/bin/env python3
"""
SendRight UI モックアップ画像生成
TAV/うめ杉崎スタイルの自然な返信を反映
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

FONT_PATH = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"
FONT_BOLD_PATH = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"

def get_font(size, bold=False):
    try:
        return ImageFont.truetype(FONT_BOLD_PATH if bold else FONT_PATH, size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, coords, radius, fill, outline=None):
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill, outline=outline)

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

def create_line_chat_mockup():
    """失敗パターン: ありきたりな返信で会話終了"""
    print("LINE会話画面を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    draw.rectangle([sx, sy, ex, sy + 60], fill=C_WHITE)
    draw.text((sx + 50, sy + 18), "<", font=get_font(24), fill=C_GRAY)
    draw.text((sx + screen_width//2 - 40, sy + 18), "あやか", font=get_font(20, bold=True), fill=C_DARK)
    draw.rectangle([sx, sy + 60, ex, ey - 60], fill=(123, 184, 193))

    y_pos = sy + 100
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 300, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "最近バタバタしてて疲れた〜", font=get_font(16), fill=C_DARK)
    draw.text((sx + 305, y_pos + 30), "22:14", font=get_font(11), fill=(100, 100, 100))

    y_pos += 80
    draw_rounded_rect(draw, (ex - 200, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 185, y_pos + 12), "大丈夫？無理しないでね", font=get_font(15), fill=C_DARK)
    draw.text((ex - 235, y_pos + 25), "既読", font=get_font(11), fill=(100, 100, 100))

    y_pos += 100
    draw.text((sx + screen_width//2 - 30, y_pos), "翌日...", font=get_font(12), fill=(150, 150, 150))
    y_pos += 35
    draw.text((sx + screen_width//2 - 35, y_pos), "返信なし", font=get_font(16), fill=(180, 80, 80))

    draw.rectangle([sx, ey - 60, ex, ey], fill=C_WHITE)
    draw_rounded_rect(draw, (sx + 50, ey - 50, ex - 50, ey - 15), 18, C_LIGHT_GRAY)

    draw.rectangle([sx, sy + 60, ex, sy + 95], fill=(255, 220, 220))
    draw.text((sx + screen_width//2 - 90, sy + 68), "優しいだけじゃ続かない", font=get_font(14), fill=(180, 50, 50))

    img.save(OUTPUT_DIR / "line-chat-problem.png")
    print(f"  -> {OUTPUT_DIR / 'line-chat-problem.png'}")

def create_sendright_ui_mockup():
    """SendRight UI: TAV/うめ杉崎スタイルの返信候補"""
    print("SendRight UI画面を生成中...")
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
    draw.text((sx + 35, y_pos + 35), "最近バタバタしてて疲れた〜", font=get_font(16), fill=C_DARK)

    y_pos += 95
    draw.text((sx + 25, y_pos), "返信候補", font=get_font(14, bold=True), fill=C_DARK)

    # 候補1: 弄り+共感（TAVスタイル）
    y_pos += 35
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 105), 15, C_WHITE, outline=C_PINK)
    draw.text((sx + 35, y_pos + 10), "候補 1", font=get_font(12, bold=True), fill=C_PINK)
    draw.text((sx + 35, y_pos + 35), "忙しいアピールきた笑", font=get_font(17), fill=C_DARK)
    draw.text((sx + 35, y_pos + 65), "弄りつつ興味を引く", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 85), "相手がツッコミやすい", font=get_font(11), fill=C_GRAY)

    # 候補2: 切り返し+誘導
    y_pos += 120
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 105), 15, C_WHITE, outline=C_LIGHT_GRAY)
    draw.text((sx + 35, y_pos + 10), "候補 2", font=get_font(12, bold=True), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 35), "何そんな頑張ってんの", font=get_font(17), fill=C_DARK)
    draw.text((sx + 35, y_pos + 65), "理由を聞き出す自然な流れ", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 85), "話題が広がりやすい", font=get_font(11), fill=C_GRAY)

    # 候補3: 軽いノリでオファー
    y_pos += 120
    draw_rounded_rect(draw, (sx + 20, y_pos, ex - 20, y_pos + 105), 15, C_WHITE, outline=C_LIGHT_GRAY)
    draw.text((sx + 35, y_pos + 10), "候補 3", font=get_font(12, bold=True), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 35), "息抜きに飯でも行く?", font=get_font(17), fill=C_DARK)
    draw.text((sx + 35, y_pos + 65), "自然な流れでオファー", font=get_font(11), fill=C_GRAY)
    draw.text((sx + 35, y_pos + 85), "断られても軽く流せる", font=get_font(11), fill=C_GRAY)

    y_pos += 130
    draw_rounded_rect(draw, (sx + 60, y_pos, ex - 60, y_pos + 50), 25, C_PINK)
    draw.text((sx + screen_width//2 - 55, y_pos + 13), "コピーして送信", font=get_font(16, bold=True), fill=C_WHITE)

    draw.ellipse([ex - 80, sy + 130, ex - 30, sy + 180], fill=C_PINK)
    draw.text((ex - 70, sy + 142), "10", font=get_font(18, bold=True), fill=C_WHITE)
    draw.text((ex - 62, sy + 162), "秒", font=get_font(10), fill=C_WHITE)

    img.save(OUTPUT_DIR / "sendright-ui.png")
    print(f"  -> {OUTPUT_DIR / 'sendright-ui.png'}")

def create_line_chat_success_mockup():
    """成功パターン: 弄りから会話が盛り上がりデートへ"""
    print("LINE成功画面を生成中...")
    width, height = 390, 844
    img, (sx, sy, ex, ey) = create_iphone_frame(width, height)
    draw = ImageDraw.Draw(img)
    screen_width = ex - sx

    draw.rectangle([sx, sy, ex, sy + 60], fill=C_WHITE)
    draw.text((sx + 50, sy + 18), "<", font=get_font(24), fill=C_GRAY)
    draw.text((sx + screen_width//2 - 40, sy + 18), "あやか", font=get_font(20, bold=True), fill=C_DARK)
    draw.rectangle([sx, sy + 60, ex, ey - 60], fill=(123, 184, 193))

    y_pos = sy + 100

    # 相手1
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 300, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "最近バタバタしてて疲れた〜", font=get_font(15), fill=C_DARK)

    # 自分1（弄り）
    y_pos += 60
    draw_rounded_rect(draw, (ex - 190, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 175, y_pos + 12), "忙しいアピールきた笑", font=get_font(15), fill=C_DARK)

    # 相手2（ノッてくる）
    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 220, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "ちがうし！笑", font=get_font(15), fill=C_DARK)

    # 自分2
    y_pos += 55
    draw_rounded_rect(draw, (ex - 180, y_pos, ex - 20, y_pos + 45), 15, (150, 230, 100))
    draw.text((ex - 165, y_pos + 12), "まあ息抜きに飯いく?", font=get_font(15), fill=C_DARK)

    # 相手3（デート成立）
    y_pos += 55
    draw.ellipse([sx + 15, y_pos, sx + 55, y_pos + 40], fill=C_PINK)
    draw_rounded_rect(draw, (sx + 65, y_pos, sx + 200, y_pos + 50), 15, C_WHITE)
    draw.text((sx + 80, y_pos + 13), "いいね！いつ?", font=get_font(15), fill=C_DARK)

    draw.rectangle([sx, sy + 60, ex, sy + 95], fill=(200, 255, 200))
    draw.text((sx + screen_width//2 - 70, sy + 70), "デートの約束成立", font=get_font(14, bold=True), fill=(50, 150, 50))

    draw.rectangle([sx, ey - 60, ex, ey], fill=C_WHITE)

    img.save(OUTPUT_DIR / "line-chat-success.png")
    print(f"  -> {OUTPUT_DIR / 'line-chat-success.png'}")

def create_before_after():
    """Before/After比較"""
    print("Before/After比較画像を生成中...")
    width, height = 900, 500
    img = Image.new('RGBA', (width, height), C_LIGHT_BG)
    draw = ImageDraw.Draw(img)

    draw.rectangle([30, 30, 420, 470], fill=C_WHITE, outline=C_LIGHT_GRAY)
    draw.text((180, 50), "Before", font=get_font(24, bold=True), fill=C_GRAY)
    draw.text((60, 130), "「大丈夫？無理しないでね」", font=get_font(17, bold=True), fill=C_DARK)
    draw.text((60, 170), "→ 優しいだけで印象に残らない", font=get_font(14), fill=C_GRAY)
    draw.text((60, 220), "返信に30分悩む", font=get_font(16), fill=C_DARK)
    draw.text((60, 255), "既読スルーされる", font=get_font(16), fill=C_DARK)
    draw.text((60, 290), "デートに誘えない", font=get_font(16), fill=C_DARK)
    draw.text((130, 400), "自信がない", font=get_font(20, bold=True), fill=C_RED)

    draw.text((435, 220), "→", font=get_font(48, bold=True), fill=C_PINK)

    draw.rectangle([480, 30, 870, 470], fill=C_WHITE, outline=C_PINK)
    draw.text((640, 50), "After", font=get_font(24, bold=True), fill=C_PINK)
    draw.text((510, 130), "「忙しいアピールきた笑」", font=get_font(17, bold=True), fill=C_DARK)
    draw.text((510, 170), "→ 弄りで興味を引く", font=get_font(14), fill=C_PINK)
    draw.text((510, 220), "10秒で返信できる", font=get_font(16), fill=C_DARK)
    draw.text((510, 255), "会話が盛り上がる", font=get_font(16), fill=C_DARK)
    draw.text((510, 290), "自然にデートに誘える", font=get_font(16), fill=C_DARK)
    draw.text((590, 400), "自信がつく", font=get_font(20, bold=True), fill=C_GREEN)

    img.save(OUTPUT_DIR / "before-after.png")
    print(f"  -> {OUTPUT_DIR / 'before-after.png'}")

def create_3step():
    """3ステップ図解"""
    print("3ステップ図解を生成中...")
    width, height = 1000, 400
    img = Image.new('RGBA', (width, height), C_WHITE)
    draw = ImageDraw.Draw(img)

    draw.text((width//2 - 100, 20), "かんたん3ステップ", font=get_font(28, bold=True), fill=C_DARK)

    step_y = 100
    steps = [
        ("1", "貼り付け", "相手のメッセージを", "コピペするだけ"),
        ("2", "10秒で生成", "プロの返信候補が", "3つ届く"),
        ("3", "送信", "選んでタップ", "これだけ"),
    ]

    for i, (num, title, sub1, sub2) in enumerate(steps):
        x = 60 + i * 320
        draw.ellipse([x + 100, step_y, x + 180, step_y + 80], fill=C_PINK)
        draw.text((x + 128, step_y + 22), num, font=get_font(36, bold=True), fill=C_WHITE)
        draw.text((x + 100, step_y + 100), title, font=get_font(22, bold=True), fill=C_DARK)
        draw.text((x + 80, step_y + 140), sub1, font=get_font(14), fill=C_GRAY)
        draw.text((x + 80, step_y + 165), sub2, font=get_font(14), fill=C_GRAY)
        if i < 2:
            draw.text((x + 250, step_y + 30), "→", font=get_font(36), fill=C_PINK)

    img.save(OUTPUT_DIR / "3step-diagram.png")
    print(f"  -> {OUTPUT_DIR / '3step-diagram.png'}")

def main():
    print("=== SendRight モックアップ生成 ===\n")
    create_line_chat_mockup()
    create_sendright_ui_mockup()
    create_line_chat_success_mockup()
    create_before_after()
    create_3step()
    print(f"\n=== 完了 ===")
    print(f"出力先: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
