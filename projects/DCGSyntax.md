---
layout: project
type: project
image: img/ProjectReap.png
title: "Star Wars Database / Question-Answering Machine"
date: 2025
published: true
labels:
  - Prolog
  - Database Retrieval
  - Definite Clause Grammar (DCG)
  - Star Wars
  - User Implemented Queries
  - AI
summary: "A small database driven project that accepts user inquiries and outputs an answer based on the facts of the database. Produces a right answer, if the query is right and wrong answer with a solution otherwise."
---
**Overview**
---

A DCG‑powered question‑answering engine implemented in Prolog, using DCGs to parse natural-language queries into semantic predicates.

A built-in Star Wars movie database comprising `plays/3`, `directs/2`, and `title_of/2` facts, with `formatname/2` for human-readable output.

**Key Features:**
---

### DCG‑Based Parser

Recognizes yes/no queries `(yesno/1)`, Who‑questions `(who/1)`, and What‑questions `(what/1)`.

Handles optional phrasing `(is it true that..., right?, ?)`.

## Semantic Mapping
---
Maps tokens to Prolog goals `(actor_for/3, director_of/2, title_of/2)`.

Uses helper predicates for clean response formatting.

## Star Wars Fact Database

Stores facts for Episodes I–IV.

Converts internal atoms (e.g., `mark_hamill`) to display names (e.g., `"Mark Hamill"`).

## Answer Generation

Who queries `(answer_who/1)`:

Mark Hamill plays as Luke Skywalker in A New Hope.

What queries `(answer_what/1)`:

The title of Star Wars I is "The Phantom Menace."

## Hint System

On yes/no failures, `hint/1` and `hint_fact/1` analyze failed facts and suggest corrections (e.g., "George Lucas is a director, not an actor.").

**How It Works**

Entry point: top/1 takes a token list (e.g., `["who","plays","as","luke","skywalker","in","a","new","hope","?"]`).

Parsing: DCG rules `(yesno/1 `, `who/1`, `what/1`) produce a semantic term (e.g., `plays(mark_hamill,luke_skywalker,star_wars_iv)`).

## Evaluation:

Yes/No: `test/1` prints "Yes, that is true." or "Sorry, that is false." + hints.

Who/What: Calls `answer_who/1` or `answer_what/1` for direct answers.

Hints: `hint_fact/1` inspects failures to guide corrections.

**Usage Example**
---

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

Downloadable files:
[The Full DCG Syntax Source Code](/assets/files/dcglloyd.pl)
