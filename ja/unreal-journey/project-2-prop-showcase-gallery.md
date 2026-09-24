---
layout: unreal-journey
type: unreal-journey
lang: ja
title: "Prop Showcase Gallery"
project_number: "プロジェクト 2"
days: "11〜16 日目"
journey_order: 2
status: "完成"
image: img/unreal-journey/project-2-gallery-hero.png
image_alt: "Unreal Engine で完成した三つの遺物を映すメインカメラの画面"
summary: "Blender から Unreal へのアセット制作工程と、再利用可能な展示システムを構築しました。マテリアルのバリエーション、Blueprint の親子構成、シネマティックカメラ、照明、UMG の操作案内を組み合わせています。"
labels:
  - Unreal Engine 5.8
  - Blender
  - Blueprints
  - マテリアル
  - シネマティックカメラ
  - UMG
download:
  url: "https://github.com/lsanderson1/lsanderson1.github.io/releases/download/unreal-projects-v1.0.0/Lloyd-Sanderson-Prop-Showcase-Gallery-Windows.zip"
  platform: "Windows 10/11 · 64 ビット"
  size: "365 MB"
  version: "ポートフォリオ体験版 1.0"
  executable: "Project02.exe"
  controls:
    - "移動：W、A、S、D"
    - "視点操作：マウス"
    - "歩行時の視点に戻る：0"
    - "メインカメラ：1"
    - "詳細カメラ：2、3、4"
    - "終了：Alt+F4"
---

## 完成版のプレイ動画

<video class="w-100 rounded border mb-4" controls preload="metadata" poster="{{ site.baseurl }}/img/unreal-journey/project-2-gallery-hero.png">
  <source src="{{ site.baseurl }}/assets/video/unreal-journey/project-2-prop-showcase.mp4" type="video/mp4">
  お使いのブラウザーは埋め込み動画に対応していません。
</video>

## 制作の目標

プロジェクト 1 の博物館を土台に、アセットの制作から見せ方までを一貫して設計しました。Blender で小道具をモデリングし、Unreal に取り込んで検証。再利用できるマテリアルと展示の仕組みを構築し、三種類の遺物をカメラ操作で鑑賞できるギャラリーとして仕上げました。

## 実装したもの

- スケール、回転、ピボット、FBX 出力、コリジョン、読み込み後の検証を含む、Blender から Unreal への制作工程
- 石、金属、フレーム、発光するコアの表現を調整できるマテリアルインスタンス
- メッシュ、マテリアル、ラベル、高さ、回転、展示用照明を編集できる「`BP_PropShowcase_Base`」
- Recovered Stone Relic、Archive Beacon、Forged Archive Relic 用の、再利用可能な三つの子 Blueprint
- 露出を管理したキーライト、フィルライト、リムライト、必要に応じたアクセントライト
- 全体を見せる Cine Camera 1 台と、細部を見せるカメラ 3 台
- プレイヤー参照を保持し、共通のブレンド関数で視点を切り替える「`BP_GalleryCameraDirector`」
- 時間経過によるフェードと、一度だけのビューポート生成を備えた「`WBP_GalleryCameraControls`」

## 開発の流れ

| 期間 | 取り組んだ内容 |
| --- | --- |
| 11 日目 | Blender で最初の遺物を制作。スケールとピボットを修正して出力し、Unreal 側のギャラリーの基盤を整えました。 |
| 12 日目 | UV の挙動を確認し、再利用できるマテリアルインスタンスと展示用の基底 Blueprint を制作しました。 |
| 13 日目 | Archive Beacon を制作。別のマテリアル構成、発光するコア、任意で使えるシアン色のアクセントライトを追加しました。 |
| 14 日目 | ギャラリーの照明、固定露出、性能確認、シネマティックな構図を調整しました。 |
| 15 日目 | 展示システムを親子の Blueprint 構成へ整理し、三つの専用プリセットを作成しました。 |
| 16 日目 | 4 台のカメラによる鑑賞機能、視点のブレンド、歩行視点への復帰、非表示 Pawn の後処理、操作案内、フェードを実装し、最終確認を行いました。 |

## ギャラリー

<div class="row g-3 mb-4">
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-recovered-stone.png" alt="Recovered Stone Relic を詳細カメラで見た様子">
  </div>
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-archive-beacon.png" alt="Archive Beacon を詳細カメラで見た様子">
  </div>
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-forged-relic.png" alt="Forged Archive Relic を詳細カメラで見た様子">
  </div>
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-day-13-progress.png" alt="13 日目の Archive Beacon とギャラリーの制作状況">
  </div>
</div>

## 学んだこと

アセット制作と、保守しやすいゲーム側の設計をつなぐことが、この作品の中心でした。小道具はモデルが完成すれば終わりではありません。スケール、ピボット、UV、コリジョン、マテリアル、読み込み設定を整え、Unreal 上でバリエーションを再利用可能な形で表現する必要があります。

特に重要だった設計判断は、Blueprint を親子構成にしたことです。共通の処理は親に置き、子には各遺物の見た目の初期設定を持たせました。同じ役割分担をカメラ側にも適用し、展示物の内容は展示用 Blueprint、構図は Cine Camera、視点変更は Director、プレイヤーへの案内は UMG が担当するようにしました。

## 成果

一つの再利用可能な仕組みで、特徴の異なる三つの遺物を展示できました。キーボード操作により、全体表示、三つの詳細表示、通常の歩行視点を滑らかに切り替えられます。操作パネルは一度だけ表示され、読みやすさを保ちながら、操作を妨げずにフェードします。移動、照明、回転、参照、後処理の最終確認を終えた状態で、体験版としてまとめました。

<p class="text-muted small mt-4">プロジェクト 2 の開発ノート、README、完成版のプレイ動画、スクリーンショット、Blender アセット、保存済みの Unreal Engine 5.8 プロジェクトファイルをもとにまとめています。</p>
