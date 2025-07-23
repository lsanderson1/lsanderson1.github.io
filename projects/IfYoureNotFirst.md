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

<div style="text-align: center;">
  <h3 style="margin-bottom: 0.5em;">Start screen to the game</h3>
  <h3 style="margin-bottom: 1.5em;">Prototype Model in Blender</h3>

  <div style="
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  ">
    <div style="text-align: center;">
      <div style="margin-bottom: 0.5em; font-weight: bold;">
        Start Screen
      </div>
      <img
        src="{{ '/img/IfYoureNotFirstDemo.png' | relative_url }}"
        alt="If Youre Not First"
        style="
          max-width: 700px;
          width: 100%;
          height: auto;
          display: block;
        "
      />
    </div>
    <div style="text-align: center;">
      <div style="margin-bottom: 0.5em; font-weight: bold;">
        Prototype Model
      </div>
      <img
        src="{{ '/img/Prototype.png' | relative_url }}"
        alt="Prototype Model"
        style="
          max-width: 700px;
          width: 100%;
          height: auto;
          display: block;
        "
      />
    </div>
  </div> 

  <div style="text-align: center; margin-top: 1em;">
    The executable to the game is exported on Unity Play through WebGL and can be directly located
    <a href="https://play.unity.com/en/games/f008e667-5c27-454c-ad07-19df6a7b2860/if-youre-not-first">here</a>.
  </div>
</div> 
