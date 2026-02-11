#!/usr/bin/env python3
"""
SendRight VSL v4 - 最終版
- 字幕はモックアップの補足説明（重複しない）
- モックアップをさらに大きく
- 余白削減
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

SUBTITLE_Y = HEIGHT - 220

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def make_subtitle_bar(dur, text):
    bar = ColorClip(
        size=(WIDTH, 120), 
        color=(25, 25, 25), 
        duration=dur
    ).with_opacity(0.92).with_position((0, SUBTITLE_Y))
    
    txt = TextClip(
        text=text, 
        font_size=40, 
        color=C_WHITE, 
        font=FONT_BOLD
    ).with_position(('center', SUBTITLE_Y + 40)).with_duration(dur)
    
    return [bar, txt]

def make_scene(dur, bg, texts):
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    for txt, fs, col, y in texts:
        tc = TextClip(text=txt, font_size=fs, color=col, font=FONT_BOLD if fs > 50 else FONT)
        tc = tc.with_position(('center', HEIGHT//2 + y)).with_duration(dur)
        clips.append(tc)
    return CompositeVideoClip(clips)

def make_mockup_scene(dur, bg, image_path, subtitle_text, img_scale=0.8, img_y_offset=-150):
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    
    if image_path.exists():
        img_clip = ImageClip(str(image_path))
        img_w, img_h = img_clip.size
        max_w = int(WIDTH * img_scale)
        max_h = int(HEIGHT * 0.65)  # 65%まで使う
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
    print(f"=== SendRight VSL v4 ===")
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
    # 痛みの列挙 - 字幕で補足
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "pain-point.png",
        "あなただけじゃない", img_scale=0.95, img_y_offset=-80))
    
    # 失敗LINE - モックアップ内は会話、字幕は教訓
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "line-chat-problem.png",
        "「優しい」は印象に残らない", img_scale=0.8, img_y_offset=-130))
    
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "line-problem-2.png",
        "丁寧すぎると距離ができる", img_scale=0.8, img_y_offset=-130))
    
    scenes.append(make_mockup_scene(3, C_LIGHT, MOCKUP_DIR / "line-problem-3.png",
        "インタビューじゃないんだから", img_scale=0.8, img_y_offset=-130))
    
    print("[3/6] ソリューション")
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "sendright-ui.png",
        "弄り・切り返し・オファーを学習", img_scale=0.8, img_y_offset=-130))
    
    scenes.append(make_mockup_scene(3.5, C_WHITE, MOCKUP_DIR / "3step-diagram.png",
        "使い方はシンプル", img_scale=0.98, img_y_offset=-100))
    
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "sendright-ui-2.png",
        "解説付きだから上達する", img_scale=0.8, img_y_offset=-130))
    
    print("[4/6] 成功パターン")
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-chat-success.png",
        "弄りでツッコミを引き出す", img_scale=0.8, img_y_offset=-130))
    
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-success-2.png",
        "軽いノリで相手を試す", img_scale=0.8, img_y_offset=-130))
    
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-success-3.png",
        "デートに繋がる流れ", img_scale=0.8, img_y_offset=-130))
    
    print("[5/6] 証拠")
    scenes.append(make_mockup_scene(3.5, C_WHITE, MOCKUP_DIR / "before-after.png",
        "同じ状況、違う結果", img_scale=0.98, img_y_offset=-100))
    
    scenes.append(make_mockup_scene(4, C_LIGHT, MOCKUP_DIR / "testimonial.png",
        "実際に結果が出てる", img_scale=0.98, img_y_offset=-80))
    
    print("[6/6] CTA")
    scenes.append(make_mockup_scene(3.5, C_LIGHT, MOCKUP_DIR / "line-chat-success.png",
        "7日間無料で試せる", img_scale=0.65, img_y_offset=-180))
    
    scenes.append(make_scene(3, C_WHITE, [
        ("SendRight", 72, C_PINK, -40), 
        ("返信の正解を、10秒で。", 44, C_GRAY, 60)
    ]))
    
    print("\nシーンを結合中...")
    final = concatenate_videoclips(scenes, method="compose")
    
    output_path = OUTPUT_DIR / f"vsl-v4-{FORMAT}.mp4"
    print("エンコード中...")
    final.write_videofile(str(output_path), fps=30, codec='libx264', audio=False, preset='medium', threads=4, logger=None)
    
    print(f"\n=== 完了 ===")
    print(f"出力: {output_path}")
    print(f"サイズ: {output_path.stat().st_size / (1024*1024):.1f}MB")
    print(f"長さ: {int(final.duration)}秒")

if __name__ == "__main__":
    main()
