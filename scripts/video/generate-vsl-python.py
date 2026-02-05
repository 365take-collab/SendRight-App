#!/usr/bin/env python3
"""
SendRight VSL 3分版 - Python + moviepy 2.x 版
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
        tc = TextClip(
            text=txt, 
            font_size=fs, 
            color=col, 
            font=FONT
        )
        tc = tc.with_position(('center', HEIGHT//2 + y)).with_duration(dur)
        clips.append(tc)
    comp = CompositeVideoClip(clips)
    # Apply fade effects using moviepy 2.x API
    comp = comp.with_effects([CrossFadeIn(0.3), CrossFadeOut(0.3)])
    return comp

def main():
    print(f"=== SendRight VSL 3分版 ===")
    print(f"フォーマット: {FORMAT} ({WIDTH}x{HEIGHT})\n")
    
    scenes = []
    
    print("[1/8] ファーストビュー")
    scenes.append(make_scene(5, C_LIGHT, [("「また既読スルー…」", FS_L, C_DARK, -80), ("を終わらせる。", FS_M, C_GRAY, 0)]))
    scenes.append(make_scene(5, C_WHITE, [("返信の正解を", FS_L, C_DARK, -40), ("10秒で。", FS_XL, C_PINK, 60)]))
    scenes.append(make_scene(5, C_DARK, [("700人斬りのナンパ師が教える「正解」を", FS_S, C_GRAY, -40), ("AIがあなたの代わりに考える", FS_M, C_WHITE, 40)]))
    
    print("[2/8] 共感・痛み")
    scenes.append(make_scene(5, C_WHITE, [("こんな経験、ありませんか？", FS_L, C_DARK, 0)]))
    scenes.append(make_scene(5, C_DARK, [("返信を考えすぎて", FS_M, C_GRAY, -40), ("気づいたら深夜2時", FS_L, C_WHITE, 40)]))
    scenes.append(make_scene(5, C_DARK, [("既読がついた瞬間", FS_M, C_GRAY, -40), ("祈るような気持ちで見つめている", FS_L, C_WHITE, 40)]))
    scenes.append(make_scene(5, C_DARK, [("アプリに毎月課金してるのに", FS_M, C_GRAY, -40), ("一度もデートできていない", FS_L, C_WHITE, 40)]))
    scenes.append(make_scene(10, C_DARK, [("返信を間違えるたびに", FS_M, C_GRAY, -80), ("彼女候補が消えていく", FS_L, C_PINK, 0), ("正解を知らなかっただけ", FS_S, C_GRAY, 100)]))
    
    print("[3/8] 敵の設定")
    scenes.append(make_scene(15, C_WHITE, [("「センスがないから」は嘘", FS_L, C_PINK, -80), ("正解のパターンがある", FS_L, C_DARK, 80)]))
    
    print("[4/8] ブランドストーリー")
    scenes.append(make_scene(5, C_DARK, [("開発者の話を聞いてください", FS_L, C_WHITE, 0)]))
    scenes.append(make_scene(15, C_DARK, [("僕もかつては", FS_M, C_GRAY, -100), ("全く話せませんでした", FS_L, C_WHITE, 0), ("全員に既読スルー", FS_M, C_PINK, 100)]))
    scenes.append(make_scene(20, C_LIGHT, [("でも気づいた", FS_M, C_GRAY, -120), ("正解のパターンは存在する", FS_L, C_PINK, 0), ("700人以上と関係を築いた", FS_S, C_GRAY, 120)]))
    
    print("[5/8] ソリューション")
    scenes.append(make_scene(5, C_WHITE, [("SendRightとは？", FS_XL, C_DARK, -40), ("プロが10秒で代わりに考えるAI", FS_S, C_GRAY, 60)]))
    scenes.append(make_scene(15, C_LIGHT, [("3ステップで完結", FS_L, C_DARK, -180), ("1. メッセージをコピペ", FS_S, C_PINK, -60), ("2. AIが10秒で候補生成", FS_S, C_PINK, 20), ("3. 選んで送信", FS_S, C_PINK, 100), ("たったこれだけ", FS_L, C_PINK, 200)]))
    
    print("[6/8] ベネフィット")
    scenes.append(make_scene(20, C_WHITE, [("SendRightを使うと", FS_L, C_DARK, -200), ("30分悩む → 10秒で決まる", FS_M, C_DARK, -80), ("既読スルー → 返信が来る", FS_M, C_DARK, 0), ("「楽しみにしてます！」", FS_L, C_PINK, 120), ("その瞬間を毎回味わえる", FS_M, C_DARK, 200)]))
    
    print("[7/8] 社会的証明")
    scenes.append(make_scene(15, C_LIGHT, [("利用者の声", FS_XL, C_DARK, -200), ("「悩まなくなった」", FS_M, C_DARK, -60), ("彼女ができた - 28歳", FS_S, C_GRAY, 20), ("「解説が神」- 34歳", FS_S, C_GRAY, 100)]))
    
    print("[8/8] CTA")
    scenes.append(make_scene(10, C_WHITE, [("まずは7日間", FS_L, C_DARK, -80), ("無料で試してください", FS_L, C_PINK, 0), ("リスクはゼロ", FS_M, C_PINK, 120)]))
    scenes.append(make_scene(10, C_LIGHT, [("次のマッチを逃す前に", FS_L, C_DARK, -80), ("7日間無料で始める", FS_L, C_WHITE, 20), ("クレカ登録不要", FS_S, C_GRAY, 120)]))
    scenes.append(make_scene(5, C_WHITE, [("SendRight", FS_XL, C_PINK, -40), ("返信の正解を、10秒で。", FS_M, C_GRAY, 60)]))
    
    print("\nシーンを結合中...")
    final = concatenate_videoclips(scenes, method="compose")
    
    output_path = OUTPUT_DIR / f"vsl-3min-{FORMAT}.mp4"
    print("エンコード中...")
    final.write_videofile(str(output_path), fps=30, codec='libx264', audio=False, preset='medium', threads=4, logger=None)
    
    print(f"\n=== 完了 ===")
    print(f"出力: {output_path}")
    print(f"サイズ: {output_path.stat().st_size / (1024*1024):.1f}MB")
    print(f"長さ: {int(final.duration)//60}分{int(final.duration)%60}秒")

if __name__ == "__main__":
    main()
