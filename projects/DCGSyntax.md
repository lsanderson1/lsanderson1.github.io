---
layout: project
type: project
image: img/ProjectReap.png
title: "Project Reap"
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

Overview

This Prolog library implements a natural‑language question‑answering engine using Definite Clause Grammars (DCGs). It parses user queries of two main forms—Who and What—into internal predicates, looks up facts in its built‑in Star Wars movie database, and then either returns a direct answer or, when the query is false, generates helpful hints.

Key Features

DCG‑Based Parser

Recognizes yes/no questions (yesno/1), Who‑questions (who/1), and What‑questions (what/1).

Handles optional introductory or trailing phrasing (e.g., “Is it true that…?”, question marks, “right?”).

Semantic Mapping

Translates English phrases into Prolog goals (actor_for/3, director_of/2, title_of/2).

Uses helper predicates (actor_for/3, character_of/2, etc.) to structure queries and deliver human‑readable responses.

Built‑in Star Wars Fact Database

Contains plays/3, directs/2, and title_of/2 facts for Episodes I–IV.

Converts internal atoms (e.g., mark_hamill) into display names (“Mark Hamill”) via formatname/2.

Answer Generation

Who queries invoke answer_who/1, printing lines like:Mark Hamill plays as Luke Skywalker in A New Hope.

What queries invoke answer_what/1, e.g.:The title of Star Wars I is “The Phantom Menace.”

Hint System

On yes/no failures, hint/1 analyzes which semantic facts failed and issues targeted hints (e.g., “George Lucas is a director, not an actor.”).

Covers misclassifications between actors, characters, directors, and movies.

How It Works

Entry point: top/1 accepts a list of tokens (e.g. [who,plays,as,luke,skywalker,in,a,new,hope,?]).

Parsing: One of yesno/1, who/1, or what/1 DCG rules consumes tokens into a semantic term (e.g. plays(mark_hamill,luke_skywalker,star_wars_iv)).

Evaluation:

Yes/No: test/1 calls each fact; success prints “Yes, that is true.” or on failure “Sorry, that is false.” and hints.

Who/What: answer_who/1 or answer_what/1 formats and prints the answer.

Hints: hint_fact/1 inspects failed facts to suggest corrections (e.g., wrong movie title, character vs actor mix‑up).
