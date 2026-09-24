---
layout: unreal-journey
type: unreal-journey
lang: ja
title: "Interactable Museum Room"
project_number: "プロジェクト 1"
days: "1〜10 日目"
journey_order: 1
status: "完成"
image: img/unreal-journey/project-1-museum-room.png
image_alt: "完成した博物館の展示室を上から見た Unreal Editor の画面"
summary: "初めての Unreal Engine ポートフォリオ作品です。展示物ごとの案内表示、詳細確認 UI、入力の一元管理、安全な後処理を備えた、再利用可能なインタラクションシステムを制作しました。"
labels:
  - Unreal Engine 5.8
  - Blueprints
  - UMG
  - Blueprint Interfaces
  - インタラクション設計
download:
  url: "https://github.com/lsanderson1/lsanderson1.github.io/releases/download/unreal-projects-v1.0.0/Lloyd-Sanderson-Interactable-Museum-Windows.zip"
  platform: "Windows 10/11 · 64 ビット"
  size: "364 MB"
  version: "ポートフォリオ体験版 1.0"
  executable: "Project01.exe"
  controls:
    - "移動：W、A、S、D"
    - "視点操作：マウス"
    - "展示物の詳細を開く・閉じる：E"
    - "終了：Alt+F4"
---

## 完成版のプレイ動画

<video class="w-100 rounded border mb-4" controls preload="metadata" poster="{{ site.baseurl }}/img/unreal-journey/project-1-museum-room.png">
  <source src="{{ site.baseurl }}/assets/video/unreal-journey/project-1-interactable-museum.mp4" type="video/mp4">
  お使いのブラウザーは埋め込み動画に対応していません。
</video>

## 制作の目標

空の Unreal プロジェクトから小さな博物館をつくり、すべての展示物が一つの操作システムを共有しながら、それぞれ固有の名前、説明、案内文を表示できるようにすることが目標でした。完成版では、展示物に近づくと案内が現れ、E キーで詳細を確認でき、離れると UI が適切に消える一連の流れを実現しています。

## 実装したもの

- 展示物の共通基盤となる、再利用可能な Blueprint「`BP_DisplayObject_Base`」
- コリジョンによる接近検知と、操作範囲内・範囲外の状態管理
- 展示物ごとに編集できる名前、説明文、操作案内
- UMG ウィジェット「`WBP_InteractionPrompt`」と「`WBP_InspectionPanel`」
- 操作入力を一元管理する「`BP_MuseumPlayerController`」
- 共通インターフェースで処理を呼び出す「`BPI_Interactable`」
- 参照の有効性確認、ウィジェットの重複生成防止、UI の安全な削除・参照解除

## 開発の流れ

| 期間 | 取り組んだ内容 |
| --- | --- |
| 1〜3 日目 | 展示室と再利用可能な展示物 Actor を制作。コリジョンのオーバーラップを検知し、プレイヤーが操作範囲内にいるかを記録しました。 |
| 4〜5 日目 | E キーによる操作を追加。展示物の名前や説明をインスタンスごとに編集できるデータへ移しました。 |
| 6〜7 日目 | デバッグ表示を、詳細確認パネルと状況に応じた操作案内に置き換えました。 |
| 8〜9 日目 | 入力を PlayerController に集約し、再利用可能な通信のために Blueprint Interface を導入しました。 |
| 10 日目 | 案内文の動的な切り替え、参照の検証、ウィジェットの重複防止を実装。複数の展示物でテストし、最終確認を行いました。 |

## 学んだこと

この作品を通じて、Actor Blueprint、PlayerController、Blueprint Interface、Widget Blueprint の役割分担を学び、Unreal での開発の土台を築きました。特に大きな改善は、各展示物に分散していた入力処理を一つのコントローラーへ移したことです。展示物側は、自身のデータと操作時の振る舞いに集中できるようになりました。

また、オブジェクト参照の後処理を明確に設計する重要性も学びました。案内や詳細パネルは単なる画面上の表示ではなく、実体を持つウィジェットです。適切なタイミングで参照を検証し、画面から削除し、参照自体も解除する必要があります。

## 成果

完成した展示室では、共通の Blueprint ロジックで複数の展示物を扱えます。操作システムを複製せずに、展示物ごとに異なる情報を表示できるため、今後のアイテム取得、パズル、会話対象、調査可能なオブジェクトにも応用できる構成になりました。

<p class="text-muted small mt-4">プロジェクト 1 の学習ノート、README、完成版のプレイ動画、保存済みの Unreal Engine 5.8 プロジェクトファイルをもとにまとめています。</p>
