---
layout: unreal-journey
type: unreal-journey
title: "Interactable Museum Room"
project_number: "Project 1"
days: "Days 1-10"
journey_order: 1
status: "Complete"
image: img/unreal-journey/project-1-museum-room.png
image_alt: "Overhead Unreal Editor view of the completed interactable museum room"
summary: "My first Unreal Engine portfolio project: a reusable museum interaction system with object-specific prompts, inspection UI, centralized input, and safe cleanup."
labels:
  - Unreal Engine 5.8
  - Blueprints
  - UMG
  - Blueprint Interfaces
  - Interaction Systems
download:
  url: "https://github.com/lsanderson1/lsanderson1.github.io/releases/download/unreal-projects-v1.0.0/Lloyd-Sanderson-Interactable-Museum-Windows.zip"
  platform: "Windows 10/11 · 64-bit"
  size: "364 MB"
  version: "Portfolio build 1.0"
  executable: "Project01.exe"
  controls:
    - "Move: W, A, S, D"
    - "Look: Mouse"
    - "Inspect or close an artifact: E"
    - "Exit: Alt+F4"
---

## Final Walkthrough

<video class="w-100 rounded border mb-4" controls preload="metadata" poster="{{ site.baseurl }}/img/unreal-journey/project-1-museum-room.png">
  <source src="{{ site.baseurl }}/assets/video/unreal-journey/project-1-interactable-museum.mp4" type="video/mp4">
  Your browser does not support embedded video.
</video>

## Project goal

The goal was to move from a blank Unreal project to a small museum room where every display object could share one interaction system while presenting its own name, description, and prompt. The final loop lets the player approach an artifact, see a contextual prompt, press E to inspect it, and safely clear the interface when leaving.

## What I built

- `BP_DisplayObject_Base`, a reusable Blueprint for museum artifacts.
- Collision-based proximity detection and stored near/far state.
- Instance-editable text for each artifact's name, description, and interaction prompt.
- `WBP_InteractionPrompt` and `WBP_InspectionPanel` UMG widgets.
- `BP_MuseumPlayerController` as the single owner of interaction input.
- `BPI_Interactable` so the controller can communicate through a reusable interface.
- Reference validation, duplicate-widget prevention, and safe UI cleanup.

## Development journey

| Milestone | Progress |
| --- | --- |
| Days 1-3 | Built the room and reusable display actor, added collision overlap detection, and stored whether the player was in interaction range. |
| Days 4-5 | Added E-key interaction and moved artifact-specific names and descriptions into instance-editable data. |
| Days 6-7 | Replaced debug output with an inspection panel and contextual interaction prompt. |
| Days 8-9 | Centralized input in the PlayerController and introduced a Blueprint Interface for reusable communication. |
| Day 10 | Added dynamic prompt text, validated references, prevented duplicate widgets, tested multiple objects, and completed final QA. |

## Key lessons

This project established the foundation of my Unreal workflow. I learned how Actor Blueprints, PlayerControllers, Blueprint Interfaces, and Widget Blueprints divide responsibility. The largest architectural improvement was moving input out of each artifact and into one controller, allowing display objects to focus on their own data and interaction behavior.

I also learned why object references need deliberate cleanup. A prompt or inspection panel is not only something visible on screen; it is a live widget reference that must be validated, removed, and cleared at the correct time.

## Result

The completed room supports multiple display objects using the same Blueprint logic. Each object can provide unique player-facing information without duplicating the interaction system, making the result suitable for reuse in later pickups, puzzle objects, dialogue targets, and inspectable items.

<p class="text-muted small mt-4">Documented from the Project 1 master lesson notebook, project README, final gameplay capture, and archived Unreal Engine 5.8 project files.</p>
