---
layout: project
type: project
image: img/ProjectReap.png
title: "Project Reap"
date: 2025
project_order: 1
published: true
labels:
  - C#
  - Unity Game Engine
  - Aseprite / Assets
  - Animation and Design
summary: "A collaboration team project that incorporates Unity Engine to create a platformer game in Post-War era Japan."
---

## Overview

This project was created in collaboration with a group of peers to build a functional 2D platformer. Players start as an indentured servant armed with a scythe and navigate through the forces of a rebellion that stands in the way. Fighting multiple enemies builds power until the player can unleash Flow, a state that makes the character an unstoppable force when used wisely.

## Gameplay

Basic movement for the player and enemies supports moving left and right and jumping. The player can attack with the left or right mouse button and activate the Flow state. Defeating five enemies fills the Flow meter. Once activated, Flow moves the player from one defeated target to the next until no enemies remain in sight. The state then ends, and the player must earn it again.

The experience is fast-paced while also presenting a puzzle about the order in which enemies should be defeated. This gives each encounter replayability based on how efficiently, quickly, or creatively the player clears the area.

<figure class="fp-project-media">
  <figcaption>The Beginning of the Adventure</figcaption>
  <img src="{{ 'img/BeginningShot.png' | relative_url }}" alt="Beginning shot from Project Reap">
</figure>

<figure class="fp-project-media">
  <figcaption>Pressing ‘K’ activates the Flow state to chain through enemies.</figcaption>
  <img src="{{ 'img/FlowStateExampleGif.gif' | relative_url }}" alt="Project Reap Flow state demonstration">
</figure>

Flow guides the player and provides the power to devastate enemy forces, drive back the rebellion, and carve out a new future. The player must succeed to earn amnesty or risk falling victim to the rebellion.

The demo, executable, and project references can be found on the [Project Reap website](https://ics485-project-reap.github.io/).
