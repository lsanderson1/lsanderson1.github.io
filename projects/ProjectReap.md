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
summary: "A collaboration team project that incorporates Unity Engine to create a platformer game in Post-War Japan era."
---

<style>
  /* Sakura background */
  body {
    position: relative; /* establish stacking content */
    z-index:0;
  }
  body::before {
    content: "";
    position: fixed;
    top: 0; left: 0;
    width:100%; height:100%;
    background-image: url('{{ "/img/Sakura.jpg" | relative_url }}');
    background-repeat: no-repeat;
    background-attachment: fixed;
    background-position: center center;
    background-size: cover;
    filter: brightness(120%) contrast(100%) saturate(100%);
    z-index:-2;
  }
  /* Translucent dark overlay on another layer, so able to change the background without any child elements */
  body::after {
    content: "";
    position: fixed;
    top: 0; left: 0;
    width:100%; height:100%;
    background-color: rgba(0,0,0,0.4);
    z-index:-1;
  }
  /* Dark box + white bold text + shadow */
  .dark-wrapper {
    background: rgba(0,0,0,0.6);
    padding: 2rem;
    border-radius: 8px;
    max-width: 900px;
    margin: 2rem auto;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }
  /* Ensure links stand out */
  .dark-wrapper a {
    color: #ffebaa;
    text-decoration: underline;
  }
</style>

<div class="dark-wrapper">
    <h2> Overview </h2>
    <hr>
    <p>This project is a was in collaboration with a group of peers to create a functional 2D Platformer. 
    Players start off as a identured servant, armed only with your trusty scythe, one must navigate through the forces of the rebellion, which are planted in your way
    to stop your advances. Fight your way through multiple enemies to build up your power, to which upon maximum unleashes your inner potential; the power of flow.
    Within the flow you become unstoppable, a more powerful force than anyone can even fathom, use it wisely to your advantage!</p>
    <h2> Gameplay </h2>
    <hr>
    <p>Basic movement on both the player and enemies are scripted to move left and right and jump. Multiple actions can be taken to attack, whether it be the left or right mouse button and
    activate your flow state. As you defeat enemies, you build up your flow upon killing 5 enemies which the player is able to use flow. After activating flow, you will move to your next
    target upon defeating the last one in a chain until there are no more enemies in sight. When that happens, the flow state is canceled and the player will have to regain their flow again. </p>
    Fast and quick paced, but also a puzzle in how you defeat all your enemies is presented to the player, granting a replayability factor as to how efficient, fast (or how sloppily) one is
    able to defeat all the enemies in sight.
    <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 1rem;">
      <div style="text-align: center; width: 60%; max-width: 900px;">
        <div style="margin-bottom: 0.5em; color: red;">The Beginning of the Adventure</div>
        <img
          src="{{ 'img/BeginningShot.png' | relative_url }}"
          alt="Beginning Shot"
          style="width: 100%; height: auto; display: block; margin: 0 auto;"
        />
      </div>
      <div style="text-align: center; width: 60%; max-width: 900px;">
        <div style="margin-bottom: 0.5em; color: red;">
          Pressing ‘K’ activates your flow state to chain through enemies!
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
      The demo, executable, and project references can be found
      <a href="https://ics485-project-reap.github.io/">here</a>.
    </div>
  </div>
