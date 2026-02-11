#!/usr/bin/env python3
"""
SendRight VSL - モックアップ画像付きバージョン
"""

import sys
from pathlib import Path

try:
    from moviepy import (
        ColorClip, TextClip, ImageClip, CompositeVideoClip, 
        concatenate_videoclips
    )
    from moviepy.video.fx import CrossFadeIn, CrossFadeOut
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
FS_XL, FS_L, FS_M, FS_S = 72, 56, 44, 32

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def make_scene(dur, bg, texts):
    """テキストのみのシーン"""
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    for txt, fs, col, y in texts:
        tc = TextClip(text=txt, font_size=fs, color=col, font=FONT)
        tc = tc.with_position(('center', HEIGHT//2 + y)).with_duration(dur)
        clips.append(tc)
    comp = CompositeVideoClip(clips)
    comp = comp.with_effects([CrossFadeIn(0.3), CrossFadeOut(0.3)])
    return comp

def make_image_scene(dur, bg, image_path, img_scale=0.8, img_y_offset=0, texts=None):
    """画像+テキストのシーン"""
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    
    if image_path.exists():
        img_clip = ImageClip(str(image_path))
        # 画像をリサイズ
        img_w, img_h = img_clip.size
        max_w = int(WIDTH * img_scale)
        max_h = int(HEIGHT * 0.6)
        scale = min(max_w / img_w, max_h / img_h)
        new_w, new_h = int(img_w * scale), int(img_h * scale)
        img_clip = img_clip.resized((new_w, new_h))
        img_clip = img_clip.with_position(('center', HEIGHT//2 - new_h//2 + img_y_offset))
        img_clip = img_clip.with_duration(dur)
        clips.append(img_clip)
    
    if texts:
        for txt, fs, col, y in texts:
            tc = TextClip(text=txt, font_size=fs, color=col, font=FONT)
            tc = tc.with_position(('center', HEIGHT//2 + y)).with_duration(dur)
            clips.append(tc)
    
    comp = CompositeVideoClip(clips)
    comp = comp.with_effects([CrossFadeIn(0.3), CrossFadeOut(0.3)])
    return comp

def main():
    print(f"=== SendRight VSL（モックアップ付き）===")
    print(f"フォーマット: {FORMAT} ({WIDTH}x{HEIGHT})\n")
    
    scenes = []
    
    # [1] ファーストビュー
    print("[1/8] ファーストビュー")
    scenes.append(make_scene(4, C_LIGHT, [
        ("「また既読スルー…」", FS_L, C_DARK, -80), 
        ("を終わらせる", FS_M, C_GRAY, 0)
    ]))
    scenes.append(make_scene(4, C_WHITE, [
        ("返信の正解を", FS_L, C_DARK, -40), 
        ("10秒で", FS_XL, C_PINK, 60)
    ]))
    
    # [2] 痛みの提示（失敗モックアップ）
    print("[2/8] 痛みの提示")
    scenes.append(make_scene(3, C_WHITE, [
        ("こんな経験ありませんか？", FS_L, C_DARK, 0)
    ]))
    scenes.append(make_image_scene(
        6, C_LIGHT, 
        MOCKUP_DIR / "line-chat-problem.png",
        img_scale=0.7, img_y_offset=-50,
        texts=[("優しいだけじゃ続かない", FS_M, C_DARK, 380)]
    ))
    scenes.append(make_scene(4, C_DARK, [
        ("返信を考えすぎて", FS_M, C_GRAY, -40), 
        ("気づいたら深夜2時", FS_L, C_WHITE, 40)
    ]))
    scenes.append(make_scene(4, C_DARK, [
        ("返信を間違えるたびに", FS_M, C_GRAY, -60), 
        ("彼女候補が消えていく", FS_L, C_PINK, 20),
        ("正解を知らなかっただけ", FS_S, C_GRAY, 100)
    ]))
    
    # [3] 敵の設定
    print("[3/8] 敵の設定")
    scenes.append(make_scene(5, C_WHITE, [
        ("「センスがないから」は嘘", FS_L, C_PINK, -60), 
        ("正解のパターンがある", FS_L, C_DARK, 60)
    ]))
    
    # [4] ソリューション（SendRight UI）
    print("[4/8] ソリューション")
    scenes.append(make_scene(3, C_WHITE, [
        ("SendRightとは？", FS_XL, C_DARK, 0)
    ]))
    scenes.append(make_image_scene(
        8, C_LIGHT, 
        MOCKUP_DIR / "sendright-ui.png",
        img_scale=0.65, img_y_offset=-80,
        texts=[("プロの返信が10秒で届く", FS_M, C_DARK, 400)]
    ))
    
    # [5] 3ステップ
    print("[5/8] 3ステップ")
    scenes.append(make_image_scene(
        6, C_WHITE, 
        MOCKUP_DIR / "3step-diagram.png",
        img_scale=0.9, img_y_offset=0
    ))
    
    # [6] 成功パターン
    print("[6/8] 成功パターン")
    scenes.append(make_image_scene(
        8, C_LIGHT, 
        MOCKUP_DIR / "line-chat-success.png",
        img_scale=0.65, img_y_offset=-80,
        texts=[("弄り→ノリ→デート成立", FS_M, C_PINK, 400)]
    ))
    
    # [7] Before/After
    print("[7/8] Before/After")
    scenes.append(make_image_scene(
        6, C_WHITE, 
        MOCKUP_DIR / "before-after.png",
        img_scale=0.95, img_y_offset=0
    ))
    
    # [8] CTA
    print("[8/8] CTA")
    scenes.append(make_scene(4, C_WHITE, [
        ("まずは7日間", FS_L, C_DARK, -80), 
        ("無料で試してください", FS_L, C_PINK, 0),
        ("リスクはゼロ", FS_M, C_GRAY, 100)
    ]))
    scenes.append(make_scene(4, C_LIGHT, [
        ("次のマッチを逃す前に", FS_L, C_DARK, -80), 
        ("7日間無料で始める", FS_L, C_PINK, 20),
        ("クレカ登録不要", FS_S, C_GRAY, 120)
    ]))
    scenes.append(make_scene(3, C_WHITE, [
        ("SendRight", FS_XL, C_PINK, -40), 
        ("返信の正解を、10秒で。", FS_M, C_GRAY, 60)
    ]))
    
    print("\nシーンを結合中...")
    final = concatenate_videoclips(scenes, method="compose")
    
    output_path = OUTPUT_DIR / f"vsl-mockups-{FORMAT}.mp4"
    print("エンコード中...")
    final.write_videofile(
        str(output_path), 
        fps=30, 
        codec='libx264', 
        audio=False, 
        preset='medium', 
        threads=4, 
        logger=None
    )
    
    print(f"\n=== 完了 ===")
    print(f"出力: {output_path}")
    print(f"サイズ: {output_path.stat().st_size / (1024*1024):.1f}MB")
    print(f"長さ: {int(final.duration)}秒")

if __name__ == "__main__":
    main()
