#!/usr/bin/env python3
"""
SendRight VSL v3 - 最終改善版
- フェードなし（真っ黒フレーム防止）
- モックアップを大きく表示
- 字幕の重複解消
"""

import sys
from pathlib import Path

try:
    from moviepy import (
        ColorClip, TextClip, ImageClip, CompositeVideoClip, 
        concatenate_videoclips
    )
except ImportError:
    print("moviepyをインストールしてください: pip install moviepy")
    sys.exit(1)

FORMAT = sys.argv[1] if len(sys.argv) > 1 else "story"
FORMATS = {"story": (1080, 1920), "feed": (1080, 1080)}
WIDTH, HEIGHT = FORMATS.get(FORMAT, FORMATS["story"])

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent.parent / "public" / "videos"
MOCKUP_DIR = SCRIPT_DIR.parent.parent / "public" / "images" / "mockups"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

C_PINK = "#FF6B8A"
C_WHITE = "#FFFFFF"
C_DARK = "#1A1A1A"
C_LIGHT = "#FFF5F7"
C_GRAY = "#6B7280"

FONT = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"
FONT_BOLD = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"

SUBTITLE_Y = HEIGHT - 250

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def make_subtitle_bar(dur, text, text_color=C_WHITE):
    bar = ColorClip(
        size=(WIDTH, 140), 
        color=(30, 30, 30), 
        duration=dur
    ).with_opacity(0.9).with_position((0, SUBTITLE_Y - 10))
    
    txt = TextClip(
        text=text, 
        font_size=44, 
        color=text_color, 
        font=FONT_BOLD
    ).with_position(('center', SUBTITLE_Y + 35)).with_duration(dur)
    
    return [bar, txt]

def make_scene(dur, bg, texts):
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    for txt, fs, col, y in texts:
        tc = TextClip(text=txt, font_size=fs, color=col, font=FONT_BOLD if fs > 50 else FONT)
        tc = tc.with_position(('center', HEIGHT//2 + y)).with_duration(dur)
        clips.append(tc)
    return CompositeVideoClip(clips)

def make_mockup_scene(dur, bg, image_path, subtitle_text, img_scale=0.75, img_y_offset=-200):
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    
    if image_path.exists():
        img_clip = ImageClip(str(image_path))
        img_w, img_h = img_clip.size
        max_w = int(WIDTH * img_scale)
        max_h = int(HEIGHT * 0.6)
        scale = min(max_w / img_w, max_h / img_h)
        new_w, new_h = int(img_w * scale), int(img_h * scale)
        img_clip = img_clip.resized((new_w, new_h))
        img_clip = img_clip.with_position(('center', HEIGHT//2 - new_h//2 + img_y_offset))
        img_clip = img_clip.with_duration(dur)
        clips.append(img_clip)
    
    if subtitle_text:
        clips.extend(make_subtitle_bar(dur, subtitle_text))
    
    return CompositeVideoClip(clips)

def main():
    print(f"=== SendRight VSL v3 ===")
    print(f"フォーマット: {FORMAT} ({WIDTH}x{HEIGHT})\n")
    
    scenes = []
    
    print("[1/6] ファーストビュー")
    scenes.append(make_scene(2.5, C_LIGHT, [
        ("「また既読スルー…」", 56, C_DARK, -60), 
        ("を終わらせる", 44, C_GRAY, 20)
    ]))
    scenes.append(make_scene(2.5, C_WHITE, [
        ("返信の正解を", 56, C_DARK, -40), 
        ("10秒で", 72, C_PINK, 60)
    ]))
    
    print("[2/6] 失敗パターン")
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "pain-point.png",
        "", img_scale=0.9, img_y_offset=-100))  # モックアップ内にテキストあるので字幕なし
    
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "line-chat-problem.png",
        "優しいだけじゃ返信は来ない", img_scale=0.75))
    
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "line-problem-2.png",
        "真面目すぎると重い", img_scale=0.75))
    
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "line-problem-3.png",
        "質問攻めは嫌われる", img_scale=0.75))
    
    print("[3/6] ソリューション")
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "sendright-ui.png",
        "プロの返信が10秒で届く", img_scale=0.75))
    
    scenes.append(make_mockup_scene(3.5, C_WHITE, MOCKUP_DIR / "3step-diagram.png",
        "貼り付け → 生成 → 送信", img_scale=0.95, img_y_offset=-150))
    
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "sendright-ui-2.png",
        "どんな会話でも即対応", img_scale=0.75))
    
    print("[4/6] 成功パターン")
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-chat-success.png",
        "弄りで会話が盛り上がる", img_scale=0.75))
    
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-success-2.png",
        "主導権を握れる", img_scale=0.75))
    
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-success-3.png",
        "自然にデートに誘える", img_scale=0.75))
    
    print("[5/6] 証拠")
    scenes.append(make_mockup_scene(3.5, C_WHITE, MOCKUP_DIR / "before-after.png",
        "この差、たった10秒", img_scale=0.95, img_y_offset=-150))
    
    scenes.append(make_mockup_scene(4, C_LIGHT, MOCKUP_DIR / "testimonial.png",
        "使った人から結果が出てる", img_scale=0.95, img_y_offset=-120))
    
    print("[6/6] CTA")
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-chat-success.png",
        "7日間無料で試せる", img_scale=0.6, img_y_offset=-220))
    
    scenes.append(make_scene(3, C_WHITE, [
        ("SendRight", 72, C_PINK, -40), 
        ("返信の正解を、10秒で。", 44, C_GRAY, 60)
    ]))
    
    print("\nシーンを結合中...")
    final = concatenate_videoclips(scenes, method="compose")
    
    output_path = OUTPUT_DIR / f"vsl-v3-{FORMAT}.mp4"
    print("エンコード中...")
    final.write_videofile(str(output_path), fps=30, codec='libx264', audio=False, preset='medium', threads=4, logger=None)
    
    print(f"\n=== 完了 ===")
    print(f"出力: {output_path}")
    print(f"サイズ: {output_path.stat().st_size / (1024*1024):.1f}MB")
    print(f"長さ: {int(final.duration)}秒")

if __name__ == "__main__":
    main()
