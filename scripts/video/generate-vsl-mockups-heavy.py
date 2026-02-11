#!/usr/bin/env python3
"""
SendRight VSL - モックアップ大量版
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
    bg_clip = ColorClip(size=(WIDTH, HEIGHT), color=hex_to_rgb(bg), duration=dur)
    clips = [bg_clip]
    
    if image_path.exists():
        img_clip = ImageClip(str(image_path))
        img_w, img_h = img_clip.size
        max_w = int(WIDTH * img_scale)
        max_h = int(HEIGHT * 0.65)
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
    print(f"=== SendRight VSL（モックアップ大量版）===")
    print(f"フォーマット: {FORMAT} ({WIDTH}x{HEIGHT})\n")
    
    scenes = []
    
    # === [1] ファーストビュー ===
    print("[1/10] ファーストビュー")
    scenes.append(make_scene(3, C_LIGHT, [
        ("「また既読スルー…」", FS_L, C_DARK, -60), 
        ("を終わらせる", FS_M, C_GRAY, 20)
    ]))
    scenes.append(make_scene(3, C_WHITE, [
        ("返信の正解を", FS_L, C_DARK, -40), 
        ("10秒で", FS_XL, C_PINK, 60)
    ]))
    
    # === [2] 痛み：失敗パターン（モックアップ） ===
    print("[2/10] 痛み：失敗パターン")
    scenes.append(make_scene(2, C_WHITE, [
        ("こんな経験ありませんか？", FS_L, C_DARK, 0)
    ]))
    # 失敗LINE画面
    scenes.append(make_image_scene(
        5, C_LIGHT, 
        MOCKUP_DIR / "line-chat-problem.png",
        img_scale=0.75, img_y_offset=-100,
        texts=[
            ("「大丈夫？無理しないでね」", FS_S, C_DARK, 350),
            ("→ 翌日...返信なし", FS_M, C_PINK, 420)
        ]
    ))
    
    # === [3] 痛みの言語化 ===
    print("[3/10] 痛みの言語化")
    scenes.append(make_scene(3, C_DARK, [
        ("優しいだけじゃ", FS_M, C_GRAY, -40), 
        ("印象に残らない", FS_L, C_WHITE, 40)
    ]))
    scenes.append(make_scene(3, C_DARK, [
        ("返信を考えすぎて", FS_M, C_GRAY, -40), 
        ("気づいたら深夜2時", FS_L, C_WHITE, 40)
    ]))
    scenes.append(make_scene(4, C_DARK, [
        ("返信を間違えるたびに", FS_M, C_GRAY, -60), 
        ("彼女候補が消えていく", FS_L, C_PINK, 20)
    ]))
    
    # === [4] 敵の設定 ===
    print("[4/10] 敵の設定")
    scenes.append(make_scene(4, C_WHITE, [
        ("「センスがないから」は嘘", FS_L, C_PINK, -60), 
        ("正解のパターンがある", FS_L, C_DARK, 60)
    ]))
    
    # === [5] ソリューション紹介 ===
    print("[5/10] ソリューション紹介")
    scenes.append(make_scene(2, C_WHITE, [
        ("SendRightとは？", FS_XL, C_PINK, 0)
    ]))
    
    # SendRight UI画面
    scenes.append(make_image_scene(
        6, C_LIGHT, 
        MOCKUP_DIR / "sendright-ui.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("プロの返信候補が", FS_M, C_DARK, 380),
            ("10秒で届く", FS_L, C_PINK, 450)
        ]
    ))
    
    # === [6] 3ステップ説明 ===
    print("[6/10] 3ステップ説明")
    scenes.append(make_image_scene(
        5, C_WHITE, 
        MOCKUP_DIR / "3step-diagram.png",
        img_scale=0.95, img_y_offset=-50,
        texts=[("たったこれだけ", FS_L, C_PINK, 380)]
    ))
    
    # === [7] 成功パターン（モックアップ） ===
    print("[7/10] 成功パターン")
    scenes.append(make_scene(2, C_WHITE, [
        ("SendRightを使うと", FS_L, C_DARK, 0)
    ]))
    
    # 成功LINE画面
    scenes.append(make_image_scene(
        6, C_LIGHT, 
        MOCKUP_DIR / "line-chat-success.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("「忙しいアピールきた笑」", FS_S, C_DARK, 350),
            ("→ デートの約束成立", FS_M, C_GREEN, 420)
        ]
    ))
    
    # === [8] Before/After比較 ===
    print("[8/10] Before/After比較")
    scenes.append(make_image_scene(
        6, C_WHITE, 
        MOCKUP_DIR / "before-after.png",
        img_scale=0.95, img_y_offset=-50,
        texts=[("この差、わかりますか？", FS_M, C_DARK, 400)]
    ))
    
    # === [9] 再度UI強調 ===
    print("[9/10] UI再強調")
    scenes.append(make_image_scene(
        5, C_LIGHT, 
        MOCKUP_DIR / "sendright-ui.png",
        img_scale=0.65, img_y_offset=-120,
        texts=[
            ("弄りで興味を引く", FS_S, C_GRAY, 350),
            ("解説付きだから上達する", FS_S, C_GRAY, 400),
            ("使うほど自信がつく", FS_M, C_PINK, 470)
        ]
    ))
    
    # === [10] CTA ===
    print("[10/10] CTA")
    scenes.append(make_scene(3, C_WHITE, [
        ("まずは7日間", FS_L, C_DARK, -80), 
        ("無料で試してください", FS_L, C_PINK, 0),
        ("リスクはゼロ", FS_M, C_GRAY, 80)
    ]))
    
    # 最終：成功画面で締め
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "line-chat-success.png",
        img_scale=0.6, img_y_offset=-150,
        texts=[
            ("次のマッチを逃す前に", FS_M, C_DARK, 350),
            ("7日間無料で始める", FS_L, C_PINK, 430)
        ]
    ))
    
    scenes.append(make_scene(3, C_WHITE, [
        ("SendRight", FS_XL, C_PINK, -40), 
        ("返信の正解を、10秒で。", FS_M, C_GRAY, 60)
    ]))
    
    print("\nシーンを結合中...")
    final = concatenate_videoclips(scenes, method="compose")
    
    output_path = OUTPUT_DIR / f"vsl-mockups-heavy-{FORMAT}.mp4"
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

# 緑色の定義を追加
C_GREEN = "#22C55E"

if __name__ == "__main__":
    main()
