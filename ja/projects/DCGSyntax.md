---
layout: project
type: project
image: img/StarWars.webp
title: "Star Wars Database / Question-Answering Machine"
date: 2025
project_order: 3
published: true
labels:
  - "Prolog"
  - "データベース検索"
  - "確定節文法（DCG）"
  - "Star Wars"
  - "ユーザー入力による問い合わせ"
  - "AI"
summary: "スター・ウォーズの事実データベースを参照し、自然言語の質問に答える Prolog 製のシステムです。誤った前提には修正のヒントを返します。"
lang: ja
---

## 概要

Prolog の確定節文法（DCG）を使い、自然言語の質問を意味を持つ述語へ変換する質問応答システムです。

スター・ウォーズの映画に関する事実を、`plays/3`、`directs/2`、`title_of/2` で管理しています。`formatname/2` により、内部の識別子を読みやすい名前に整形して表示します。

## 主な機能

### DCG による構文解析

Yes/No 形式の質問（`yesno/1`）、Who の質問（`who/1`）、What の質問（`what/1`）を認識します。`is it true that...`、`right?`、`?` など、任意の言い回しにも対応しています。

### 意味への変換

単語列を `actor_for/3`、`director_of/2`、`title_of/2` などの Prolog のゴールへ変換し、補助述語で回答を整形します。

### 事実データベース

エピソード I〜IV の情報を収録しています。`mark_hamill` のような内部アトムは、表示時には `Mark Hamill` のような名前へ変換されます。

### 回答の生成

Who の質問には `answer_who/1` が回答します。たとえば「『新たなる希望』でルーク・スカイウォーカーを演じるのはマーク・ハミル」といった情報を返します。

What の質問には `answer_what/1` が回答し、エピソード I のタイトルが `The Phantom Menace` であることなどを示します。

### ヒントの提示

Yes/No の質問が事実と合わない場合、`hint/1` と `hint_fact/1` が不一致を分析します。「ジョージ・ルーカスは俳優ではなく監督」といった修正の手がかりを返し、単に否定するだけで終わらないようにしました。

## 処理の流れ

1. **入力**：`top/1` に単語のリストを渡します。たとえば `["who","plays","as","luke","skywalker","in","a","new","hope","?"]` です。
2. **解析**：`yesno/1`、`who/1`、`what/1` の DCG 規則から、`plays(mark_hamill,luke_skywalker,star_wars_iv)` のような意味表現を生成します。
3. **評価**：Yes/No の質問では `test/1` が真偽を表示します。Who/What の質問では、それぞれの回答用述語を呼び出します。
4. **補助**：条件が合わない場合は `hint_fact/1` が調べ、質問を直すためのヒントを提示します。

## 使用例

正しい文法の質問、文法が合わない質問、前提に誤りがある質問を掲載しています。プログラムの入力と出力は、実際の英語表記を保っています。

```txt
Grammatical Queries:
?- top([did, mark, hamill, play, luke, skywalker, ?]).
Yes, that is true.
true.

?- top([mark, hamill, plays, luke, skywalker, ',', right, ?]).
Yes, that is true.
true.

?- top([frank, oz, plays, yoda, ',', right, ?]).
Yes, that is true.
true.

?- top([did, mark, hamill, play, han, solo, in, star, wars, iii, ?]).
Sorry, that is false.
Han Solo is a character in Star Wars IV.
true.

?- top([did, mark, hamill, direct, star, wars, i, ?]).
Sorry, that is false.
You might be looking for George Lucas who directed Star Wars I.
true.

?- top([is, it, true, that, liam, neeson, is, an, actor, ?]).
Yes, that is true.
true.

?- top([is, it, true, that, han, solo, is, a, character, in, star, wars, iii]).
Sorry, that is false.
Han Solo is a character in Star Wars IV.
true.

?- top([is, it, true, that, obi, wan, kenobi, is, an, actor, and, natalie, portman, is, a, director, ?]).
Sorry, that is false.
Obi Wan Kenobi is a character, not an actor or director.
Natalie Portman is an actor, not a director.
true.

?- top([george, lucas, is, a, director, ',', mark, hamill, is, an, actor, ',', padme, amidala, is, a, character, ',', liam, neeson, is, an, actor, and, mace, windu, is, a, character, ',', right, ?]).
Yes, that is true.
true.

?- top([who, is, the, actor, for, anakin, skywalker, ?]).
Jake Lloyd plays as Anakin Skywalker in Star Wars I.
true ;
Hayden Christensen plays as Anakin Skywalker in Star Wars II.
true ;
Hayden Christensen plays as Anakin Skywalker in Star Wars III.
true.

?- ?- top([what, is, the, title, of, star, wars, i, ?]).
The title of Star Wars I is "The Phantom Menace".
true.

?- top([who, is, the, character, of, ewan, mcgregor, ?]).
Ewan McGregor is the character of Obi Wan Kenobi in Star Wars I.
true ;
Ewan McGregor is the character of Obi Wan Kenobi in Star Wars II.
true ;
Ewan McGregor is the character of Obi Wan Kenobi in Star Wars III.
true.

?- top([who, is, the, character, of, samuel, l, jackson, ?]).
Samuel L. Jackson is the character of Mace Windu in Star Wars II.
true.

?- top([who, is, the, director, of, star, wars, i, ?]).
The director of Star Wars I is George Lucas.
true.

?- top([who, acts, in, star, wars, iii, ?]).
Hayden Christensen acts in Star Wars III.
true ;
Jimmy Smits acts in Star Wars III.
true ;
Frank Oz acts in Star Wars III.
true ;
Kenny Baker acts in Star Wars III.
true ;
Ewan McGregor acts in Star Wars III.
true.

?- top([george, lucas, is, a, character, ',', right, ?]).
Sorry, that is false.
George Lucas is a director, not a character
true.

?- top([george, lucas, is, an, actor, ',', right, ?]).
Sorry, that is false.
George Lucas is a director, not an actor.
true.

?- top([mark, hamill, is, a, director, ',', right, ?]).
Sorry, that is false.
Mark Hamill is an actor, not a director.
true.

Ungrammatical Queries:
?- top([did, mark, hamill, plays, luke, skywalker, ?]).
I dont get it.
true.

?-  top([is, it, true, that, liam, neeson, is, a, actor, ?]).
I dont get it.
true.

?-  top([frank, oz, play, yoda, ',', right, ?]).
I dont get it.
true.

?- top([george, lucas, is, an, director, ',', right, ?]).
I dont get it.
true.

Bogus Query: (shows negative response, but offers hint)
?- top([did, star, wars, iv, play, r2d2, ?]).
Sorry, that is false.
You might be looking for Kenny Baker who played R2-D2 in Star Wars III.
true.
```

[DCG の全ソースコードをダウンロード]({{ '/assets/files/dcglloyd.pl' | relative_url }})

