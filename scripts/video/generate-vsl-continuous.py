#!/usr/bin/env python3
"""
SendRight VSL - モックアップ連続版
テキストのみシーンを最小限にして、モックアップが途切れない構成
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
C_GREEN = "#22C55E"

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
    comp = comp.with_effects([CrossFadeIn(0.2), CrossFadeOut(0.2)])
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
    comp = comp.with_effects([CrossFadeIn(0.2), CrossFadeOut(0.2)])
    return comp

def main():
    print(f"=== SendRight VSL（モックアップ連続版）===")
    print(f"フォーマット: {FORMAT} ({WIDTH}x{HEIGHT})\n")
    
    scenes = []
    
    # === [1] ファーストビュー (2シーン) ===
    print("[1/6] ファーストビュー")
    scenes.append(make_scene(2.5, C_LIGHT, [
        ("「また既読スルー…」", FS_L, C_DARK, -60), 
        ("を終わらせる", FS_M, C_GRAY, 20)
    ]))
    scenes.append(make_scene(2.5, C_WHITE, [
        ("返信の正解を", FS_L, C_DARK, -40), 
        ("10秒で", FS_XL, C_PINK, 60)
    ]))
    
    # === [2] 痛み：失敗パターン連続 (モックアップ3連続) ===
    print("[2/6] 失敗パターン（モックアップ連続）")
    
    # 痛みの可視化
    scenes.append(make_image_scene(
        3.5, C_WHITE, 
        MOCKUP_DIR / "pain-point.png",
        img_scale=0.9, img_y_offset=0
    ))
    
    # 失敗LINE 1
    scenes.append(make_image_scene(
        3.5, C_LIGHT, 
        MOCKUP_DIR / "line-chat-problem.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("「大丈夫？無理しないでね」", FS_S, C_DARK, 350),
            ("優しいだけじゃ続かない", FS_M, C_PINK, 420)
        ]
    ))
    
    # 失敗LINE 2
    scenes.append(make_image_scene(
        3.5, C_LIGHT, 
        MOCKUP_DIR / "line-problem-2.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("「いいですね！どこがお好きですか？」", FS_S, C_DARK, 350),
            ("真面目すぎて重い", FS_M, C_PINK, 420)
        ]
    ))
    
    # 失敗LINE 3
    scenes.append(make_image_scene(
        3.5, C_LIGHT, 
        MOCKUP_DIR / "line-problem-3.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("質問ばかりで疲れる", FS_M, C_PINK, 420)
        ]
    ))
    
    # === [3] ソリューション (モックアップ連続) ===
    print("[3/6] ソリューション（モックアップ連続）")
    
    # SendRight UI 1
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "sendright-ui.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("プロの返信候補が", FS_M, C_DARK, 380),
            ("10秒で届く", FS_L, C_PINK, 450)
        ]
    ))
    
    # 3ステップ
    scenes.append(make_image_scene(
        4, C_WHITE, 
        MOCKUP_DIR / "3step-diagram.png",
        img_scale=0.95, img_y_offset=-50,
        texts=[("たったこれだけ", FS_L, C_PINK, 380)]
    ))
    
    # SendRight UI 2
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "sendright-ui-2.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("別の会話パターンでも", FS_M, C_DARK, 380),
            ("即座に候補が出る", FS_M, C_PINK, 450)
        ]
    ))
    
    # === [4] 成功パターン連続 (モックアップ3連続) ===
    print("[4/6] 成功パターン（モックアップ連続）")
    
    # 成功LINE 1
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "line-chat-success.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("「忙しいアピールきた笑」", FS_S, C_DARK, 350),
            ("弄りで盛り上がる", FS_M, C_GREEN, 420)
        ]
    ))
    
    # 成功LINE 2
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "line-success-2.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("「奢ってくれるの?笑」", FS_S, C_DARK, 350),
            ("主導権を握る", FS_M, C_GREEN, 420)
        ]
    ))
    
    # 成功LINE 3
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "line-success-3.png",
        img_scale=0.7, img_y_offset=-100,
        texts=[
            ("「意識高いやつだ笑」", FS_S, C_DARK, 350),
            ("自然にデートに誘える", FS_M, C_GREEN, 420)
        ]
    ))
    
    # === [5] Before/After + 証拠 (モックアップ連続) ===
    print("[5/6] 証拠（モックアップ連続）")
    
    # Before/After
    scenes.append(make_image_scene(
        4, C_WHITE, 
        MOCKUP_DIR / "before-after.png",
        img_scale=0.95, img_y_offset=-50,
        texts=[("この差、わかりますか？", FS_M, C_DARK, 400)]
    ))
    
    # ユーザーの声
    scenes.append(make_image_scene(
        5, C_LIGHT, 
        MOCKUP_DIR / "testimonial.png",
        img_scale=0.95, img_y_offset=-50
    ))
    
    # === [6] CTA (最後だけテキスト+モックアップ) ===
    print("[6/6] CTA")
    
    # 成功画面で締め
    scenes.append(make_image_scene(
        4, C_LIGHT, 
        MOCKUP_DIR / "line-chat-success.png",
        img_scale=0.55, img_y_offset=-150,
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
    
    output_path = OUTPUT_DIR / f"vsl-continuous-{FORMAT}.mp4"
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
