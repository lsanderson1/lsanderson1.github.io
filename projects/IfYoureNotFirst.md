---
layout: project
type: project
image: img/IfYoureNotFirst.png
title: "If You're Not First"
date: 2025
published: true
labels:
  - C#
  - Unity Game Engine
  - Blender / Assets
  - Animation and Design
summary: "A checkpoint-based simple AI racing game that incorporates the qualities of Unity Game Engine and Blender."
---

This project is a lightweight checkpoint-based racing prototype built in Unity using C# and Blender assets. 
Players or AI navigate through a series of incremental waypoints, with the game calculating distancing and ordering via checkpoint triggers.
The core is focus on clean, object-oriented C# design - each racing element (cars, checkpoints, laps) encapsulates its own data and behavior, showcasing
both movement mechanics and simple AI for competitive racing.

Each lap is tracked and shown based on your distance between the opponent and the next checkpoint. If the opponent is closer, it calculates the AI in the lead and
places the player in second. Also health and boost were implemented for a better, more immersive experience to where ultimately, if recklessly done, the player can destroy themselves and
lose the race.
