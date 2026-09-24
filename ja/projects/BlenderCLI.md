---
layout: project
type: project
image: img/BlenderLogo.png
title: "Blender CLI Integration"
date: 2025
project_order: 4
published: true
labels:
  - "Python"
  - "Common LISP"
  - "Blender / アセット制作"
  - "ソケット通信と JSON"
summary: "Blender 内の Python ソケットサーバーと Common Lisp のクライアントを、JSON コマンドでつなぐ対話型の操作ツールです。"
lang: ja
---

## 概要

このプロジェクトは、次の二つで構成されています。

1. **Blender 4.2 以降で動作する Python ソケットサーバー**。TCP ポート（既定値：5000）で JSON コマンドを待ち受けます。
2. **Common Lisp のクライアントライブラリ**（`blender-ipc.lisp` と `blender-cli.lisp`）。コマンド送信と対話型メニューを担当します。

## 実行環境

- Python スクリプトを実行できる **Blender 4.2 以降**
- **Common Lisp** と `usocket`、`cl-json` パッケージ
- Lisp クライアントと Blender 間の接続環境（既定値：`127.0.0.1:5000`）

## セットアップ

1. **Blender 側**
   - `blender-python_script_lloyd` の Python スクリプトを Text Editor に貼り付けます。
   - スクリプトを実行するか、「Register」を有効にしてファイル読み込み時に実行します。
   - コンソールに `Blender socket server listening on 127.0.0.1:5000` と表示されることを確認します。
2. **Lisp 側**
   - 必要に応じて `blender-ipc.lisp` の `*blender-host*` と `*blender-port*` を変更します。
   - REPL で `blender-ipc.lisp`、続いて `blender-cli.lisp` を読み込みます。利用する環境によっては、`load` や `C-c C-l` でも読み込めます。
   - `(blender-menu)` を呼び出すと、対話型 CLI が開きます。

## Python 側の主な機能

- **ping**：接続確認。応答として「Get Pong'd!」を返します。
- **create**：`cube`、`sphere`、`cylinder`、`torus`、`plane` を生成します。位置、サイズ、回転も指定できます。
- **translate / rotate / scale**：移動量、回転角度、倍率を指定してオブジェクトを変形します。
- **delete**：指定したオブジェクトを削除します。名前を省略すると全オブジェクトが対象になります。
- **color**：マテリアルに RGBA カラーを設定します。
- **rainbow**：プロシージャルな虹色のマテリアルを生成します。シェーダーの種類と粗さを指定できます。
- **emission**：色と強度を指定した発光マテリアルを設定します。
- **particles**：パーティクルの数、寿命、速度、煙・炎の有無、解像度などを追加・更新します。
- **light**：`POINT`、`SUN`、`SPOT`、`AREA` ライトを追加します。位置、エネルギー、スポットの角度とブレンド値、色の参照、半径に基づくライトリンクにも対応します。
- **add-camera / set-camera**：位置と回転を指定してカメラを作成し、アクティブカメラを設定します。
- **get-info**：オブジェクトの変形情報と寸法を取得します。
- **material**：Principled、Glass、Glossy、Metallic、Anisotropic、SSS、Transparent、Sheen、Wireframe などのノードベースのマテリアルを設定します。色、粗さ、異方性、スケール、半径などを指定できます。
- **animate**：位置、`rotation_euler`、スケールを、指定した開始・終了フレームと値の間でキーフレーム補間します。

## Lisp 側の主な関数

関数名と引数は、実際に入力する表記のまま掲載しています。

- `blender-ping`
- `blender-create NAME TYPE &key :location :size :rotation`
- `blender-translate NAME DX DY DZ`
- `blender-rotate NAME RX RY RZ`
- `blender-scale NAME SX SY SZ`
- `blender-color NAME R G B &optional A`
- `blender-rainbow NAME &key :base_type :roughness`
- `blender-delete NAME`
- `blender-particles NAME &key :count :lifetime :frame-start :frame-end :velocity :location :smoke :fire :resolution-max`
- `blender-light NAME TYPE &key :location :energy :source :radius :angle :blend`
- `blender-add-camera NAME &key :location :rotation`
- `blender-set-camera NAME`
- `blender-emission NAME &key :color :strength`
- `blender-object-info NAME`
- `blender-material NAME TYPE &key :color :roughness :anisotropy :scale :radius`
- `blender-animate NAME PROP &key :start-frame :end-frame :start-value :end-value`
- `blender-menu`：上記の操作を対話型メニューから実行します。

## 使用例

以下は、接続確認からオブジェクトの生成、色・マテリアルの設定、削除までの操作例です。入力するコマンドと実際の出力は英語のまま残しています。

```txt
CL-USER> (blender-menu)
==== BLENDER-CLI MENU =====
Reminder: Please open your Blender Host and Port to connection before running payloads
1) Ping
2) Create Object
3) Translate
4) Rotate
5) Scale
6) Color
7) Add Emission (+ Color)
8) Apply Material
9) Add Animation
10) Add Particle System
11) Add Light
12) Add Camera
13) Set Camera
14) Delete Object
15) Get Information
16) Quit

Choice: 1

[Blender]:
Get Pong'd!

Choice: 2

======== CREATING OBJECT... ==========
Available Meshes:

  Cube  
  Sphere  
  Cylinder  
  Torus  
  Plane  

Please type in the mesh you wish to create: Cube  
How many Cube(s) would you like to create: 1  
======== Creating Cube #1... ==========
Name: Cube1  
Location (x y z): (0 0 0)  
Size: 9  
Rotation (Deg) (x y z): (0 0 0)  

[Blender]:  
You created a 'cube' named 'Cube1' at [0, 0, 0] with size 9 and rotation [0, 0, 0]  

Check your Blender Scene.

Choice: 6

======== APPLYING COLOR TO OBJECT... ==========
Name: Cube1  
Apply Rainbow? (Y/N): N  
Solid Color (r g b (alpha)): (1 0 1)  

[Blender]:  
Colored 'Cube1' with [1, 0, 1, 1.0]  

Check your Blender Scene.

Choice: 8

======== APPLYING MATERIAL TO OBJECT ==========
Name: Cube1  
Material Type:

  Principled  
  Glass  
  Glossy  
  Metallic  
  Anisotropic  
  SSS (Subsurface Scattering)  
  Transparent  
  Sheen  
  Wireframe  

Please input the material you wish to add to Cube1: Glossy  
Use existing object color? (Y/N): Y  
Roughness (0.0–1.0): 0  

[Blender]:  
Applied 'glossy' material to 'Cube1'  

Check your Blender Scene.

Choice: 14

======== DELETING OBJECT... ==========
Name to delete (or press Enter to delete ALL): Cube1  

[Blender]:  
Deleted object: 'Cube1'  

Check your Blender Scene

Choice: 16  
Goodbye.  
NIL

---
```

## ソースコード

[Blender CLI]({{ '/assets/files/blender-cli.lisp' | relative_url }})  
[Blender IPC]({{ '/assets/files/blender-ipc.lisp' | relative_url }})  
[Blender と Python の連携・API ソースコード]({{ '/assets/files/blender-python-lloyd.txt' | relative_url }})

