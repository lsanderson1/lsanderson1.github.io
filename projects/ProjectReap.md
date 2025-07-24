---
layout: project
type: project
image: img/ProjectReap.png
title: "Project Reap"
date: 2025
published: true
labels:
  - C#
  - Unity Game Engine
  - Aseprite / Assets
  - Animation and Design
summary: "A collaboration team project that incorporates Unity Engine to create a platformer game with a Post-War Japanese Feel."
---

<style>
  /* Darken and Enhance the Background*/
  body { 
    background-image: url('{{ "/img/Sakura.jpg" | relative_url }}');
    background-repeat: no-repeat;
    background-attachment: fixed;
    background-position: center center;
    background-size: cover;
    filter: brightness(80%) contrast(120%) saturate(90%)
  }
  /* Translucent overly for better clarity */
  body::before {
    content: "";
    position: fixed;
    top: 0; left: 0;
    width:100%; height:100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: -1;
  }
  /* Light "paper" background for content */
  .content {
    rgba(255, 255, 255, 0.85);
    margin: 2rem, auto;
    max-width: 900px;
    padding: 2rem;
    border-radius: 8px;
  }
  /* Gives text deeper hue, sharpening each character */
  h2, h3, p, li {
    text-shadow: 1px, 1px, 2px, rgba(0, 0, 0, 0.7);
  }
</style>


## Overview
---
This project is a was in collaboration with a group of peers to create a functional 2D Platformer. 
Players start off as a identured servant, armed only with your trusty scythe, one must navigate through the forces of the rebellion, which are planted in your way
to stop your advances. Fight your way through multiple enemies to build up your power, to which upon maximum unleashes your inner potential; the power of flow.
Within the flow you become unstoppable, a more powerful force than anyone can even fathom, use it wisely to your advantage!

## Gameplay Mechanics
---
Basic movement on both the player and enemies are scripted to move left and right and jump. Multiple actions can be taken to attack, whether it be the left or right mouse button and
activate your flow state. As you defeat enemies, you build up your flow upon killing 5 enemies which the player is able to use flow. After activating flow, you will move to your next
target upon defeating the last one in a chain until there are no more enemies in sight. When that happens, the flow state is canceled and the player will have to regain their flow again.
Fast and quick paced, but also a puzzle in how you defeat all your enemies is presented to the player, granting a replayability factor as to how efficient, fast (or how sloppily) one is
able to defeat all the enemies in sight.

<div style="display: flex; justify-content: center; margin: 0 auto; flex-wrap: wrap;">
  <div style="text-align: center; width: 700px">
    <div style="margin-bottom: 0.5em; font-weight: bold;">
  The Beginning of the Adventure
  </div>
  <img
    src="{{ 'img/BeginningShot.png' | relative_url }}"
    alt="Beginning Shot"
    style="width: 100%; height: auto; display: block; margin: 0 auto;"
  />
</div>
<div style="text-align: center; width: 700px">
    <div style="margin-bottom: 0.5em; font-weight: bold;">
  Pressing 'K' will activate your flow state, which will allow you to ruthlessly slaughter any enemies in your path until you run out of enemies!
  </div>
  <img
    src="{{ 'img/FlowStateExampleGif.gif' | relative_url }}"
    alt="Flow State"
    style="width: 100%; height: auto; display: block; margin: 0 auto;"
  />
</div>
</div>
Flow is what guides us all, what gives us power, unleash it upon your foes to devastate their forces and drive back the rebellion as you carve your new future and your new life.
Will you succeed and be granted the amnesty you deserve, or fall victim to the rebellion and become their next puppet?
<div style="text-align: center; margin-top: 1.5em;">
  The website along with the demo drive and executable along with project references can be found
  <a href="https://ics485-project-reap.github.io/">here</a>.
</div>
