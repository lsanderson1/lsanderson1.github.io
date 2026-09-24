---
layout: project
type: project
image: img/IfYoureNotFirst.png
title: "If You're Not First"
date: 2025
project_order: 2
published: true
labels:
  - "C#"
  - "Unity Game Engine"
  - "Blender / アセット制作"
  - "アニメーションとデザイン"
summary: "Unity と Blender を用いて制作した、チェックポイント方式でプレイヤーと AI が競うレースゲームです。"
lang: ja
---

C# と Blender のアセットを使い、Unity で制作したレースゲームのプロトタイプです。プレイヤーと AI が順番にチェックポイントを通過し、トリガーへの接触と次の地点までの距離をもとに進行状況や順位を判定します。

設計では、車、チェックポイント、周回などの要素が、それぞれのデータと振る舞いを持つオブジェクト指向の構成を重視しました。移動の仕組みとシンプルな対戦 AI を組み合わせ、競走として成立する体験を目指しています。

各周の順位は、対戦相手との位置関係や次のチェックポイントまでの距離から更新されます。相手が先行していれば、プレイヤーは 2 位と判定されます。また、車両の耐久値とブーストを追加し、速さだけでなく操作の判断も求められるようにしました。無謀な走行を続けると車両が壊れ、敗北することもあります。

<div style="text-align: center;">
  <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
    <div style="text-align: center;">
      <div style="margin-bottom: 0.5em; font-weight: bold; font-size: 3rem; color: blue;">スタート画面</div>
      <img src="{{ '/img/IfYoureNotFirstDemo.png' | relative_url }}" alt="If You're Not First のスタート画面" style="max-width: 700px; width: 100%; height: auto; display: block;">
    </div>
    <div style="text-align: center;">
      <div style="margin-bottom: 0.5em; font-weight: bold; font-size: 3rem; color: blue;">試作モデル</div>
      <img src="{{ '/img/Prototype.png' | relative_url }}" alt="レースゲーム用に制作した試作モデル" style="max-width: 700px; width: 100%; height: auto; display: block;">
    </div>
  </div>
  <div style="text-align: center; margin-top: 1em;">ゲームは WebGL 形式で Unity Play に公開しています。<a href="https://play.unity.com/en/games/f008e667-5c27-454c-ad07-19df6a7b2860/if-youre-not-first">こちらからプレイできます</a>。</div>
</div>

