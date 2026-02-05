#!/usr/bin/env python3
"""
SendRight VSL 15秒版 - 広告用ショート動画
"""

import sys
from pathlib import Path

try:
    from moviepy import ColorClip, TextClip, CompositeVideoClip, concatenate_videoclips
    from moviepy.video.fx import CrossFadeIn, CrossFadeOut
except ImportError:
    print("moviepyをインストールしてください: pip install moviepy")
    sys.exit(1)

FORMAT = sys.argv[1] if len(sys.argv) > 1 else "story"
FORMATS = {"story": (1080, 1920), "feed": (1080, 1080)}
WIDTH, HEIGHT = FORMATS.get(FORMAT, FORMATS["story"])

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent.parent / "public" / "videos"
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
    comp = comp.with_effects([CrossFadeIn(0.2), CrossFadeOut(0.2)])
    return comp

def main():
    print(f"=== SendRight VSL 15秒版 ===")
    print(f"フォーマット: {FORMAT} ({WIDTH}x{HEIGHT})\n")
    
    scenes = []
    
    # シーン1: フック (3秒)
    print("[1/5] フック")
    scenes.append(make_scene(3, C_DARK, [
        ("「また既読スルー…」", FS_L, C_WHITE, 0)
    ]))
    
    # シーン2: 問題提起 (3秒)
    print("[2/5] 問題提起")
    scenes.append(make_scene(3, C_DARK, [
        ("返信で悩む30分", FS_M, C_GRAY, -40),
        ("もう終わりにしませんか？", FS_L, C_PINK, 40)
    ]))
    
    # シーン3: ソリューション (4秒)
    print("[3/5] ソリューション")
    scenes.append(make_scene(4, C_WHITE, [
        ("SendRight", FS_XL, C_PINK, -60),
        ("返信の正解を10秒で", FS_M, C_DARK, 40)
    ]))
    
    # シーン4: ベネフィット (3秒)
    print("[4/5] ベネフィット")
    scenes.append(make_scene(3, C_LIGHT, [
        ("700人斬りのプロが監修", FS_S, C_GRAY, -60),
        ("AIがあなたの代わりに考える", FS_M, C_DARK, 20)
    ]))
    
    # シーン5: CTA (2秒)
    print("[5/5] CTA")
    scenes.append(make_scene(2, C_WHITE, [
        ("7日間無料", FS_XL, C_PINK, -40),
        ("今すぐ試す →", FS_M, C_DARK, 60)
    ]))
    
    print("\nシーンを結合中...")
    final = concatenate_videoclips(scenes, method="compose")
    
    output_path = OUTPUT_DIR / f"vsl-15sec-{FORMAT}.mp4"
    print("エンコード中...")
    final.write_videofile(str(output_path), fps=30, codec='libx264', audio=False, preset='medium', threads=4, logger=None)
    
    print(f"\n=== 完了 ===")
    print(f"出力: {output_path}")
    print(f"サイズ: {output_path.stat().st_size / (1024*1024):.2f}MB")
    print(f"長さ: {int(final.duration)}秒")

if __name__ == "__main__":
    main()
