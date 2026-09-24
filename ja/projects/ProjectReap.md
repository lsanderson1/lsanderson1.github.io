---
layout: project
type: project
image: img/ProjectReap.png
title: "Project Reap"
date: 2025
project_order: 1
published: true
labels:
  - "C#"
  - "Unity Game Engine"
  - "Aseprite / アセット制作"
  - "アニメーションとデザイン"
summary: "戦後の日本をモチーフに、Unity でチーム制作した 2D プラットフォームゲームです。"
lang: ja
---

## 概要

仲間と協力して、実際に遊べる 2D プラットフォームゲームを制作しました。プレイヤーは鎌を手にした奉公人となり、行く手を阻む反乱勢力と戦います。敵を倒して力を蓄えると「Flow」が発動可能になり、使いどころを見極めることで一気に戦況を変えられます。

## ゲームプレイ

プレイヤーと敵には、左右への移動とジャンプを実装しています。プレイヤーはマウスの左右ボタンで攻撃でき、敵を 5 体倒すと Flow メーターが満タンになります。Flow を発動すると、敵を倒しながら次の標的へ連続して移動し、視界内の敵がいなくなると終了します。再び使用するには、戦闘で力を蓄え直す必要があります。

スピード感のあるアクションに加え、「どの順番で敵を倒すか」を考えるパズル性もあります。効率、速さ、工夫によって攻略の仕方が変わり、同じ場面でも繰り返し挑戦できる設計です。

<figure class="fp-project-media">
  <figcaption>冒険の始まり</figcaption>
  <img src="{{ 'img/BeginningShot.png' | relative_url }}" alt="Project Reap の冒頭シーン">
</figure>

<figure class="fp-project-media">
  <figcaption>K キーで Flow を発動し、敵を連続して倒します。</figcaption>
  <img src="{{ 'img/FlowStateExampleGif.gif' | relative_url }}" alt="Project Reap の Flow アビリティの実演">
</figure>

Flow の力で反乱勢力を押し戻し、新たな未来を切り開くことがプレイヤーの目標です。恩赦を勝ち取れるか、それとも反乱の犠牲となるか。その行方はプレイヤーの戦い方にかかっています。

デモ、実行ファイル、関連資料は [Project Reap の公式サイト](https://ics485-project-reap.github.io/)に掲載しています。

