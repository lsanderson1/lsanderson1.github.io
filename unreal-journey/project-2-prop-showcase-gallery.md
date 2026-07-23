---
layout: unreal-journey
type: unreal-journey
title: "Prop Showcase Gallery"
project_number: "Project 2"
days: "Days 11-16"
journey_order: 2
status: "Complete"
image: img/unreal-journey/project-2-gallery-hero.png
image_alt: "Hero camera view of three finished relic showcases in Unreal Engine"
summary: "A Blender-to-Unreal prop pipeline and reusable gallery presentation system with material variants, Blueprint families, cinematic cameras, lighting, and UMG controls."
labels:
  - Unreal Engine 5.8
  - Blender
  - Blueprints
  - Materials
  - Cinematic Cameras
  - UMG
download:
  url: "https://github.com/lsanderson1/lsanderson1.github.io/releases/download/unreal-projects-v1.0.0/Lloyd-Sanderson-Prop-Showcase-Gallery-Windows.zip"
  platform: "Windows 10/11 · 64-bit"
  size: "365 MB"
  version: "Portfolio build 1.0"
  executable: "Project02.exe"
  controls:
    - "Move: W, A, S, D"
    - "Look: Mouse"
    - "Walking view: 0"
    - "Hero camera: 1"
    - "Detail cameras: 2, 3, and 4"
    - "Exit: Alt+F4"
---

## Final Walkthrough

<video class="w-100 rounded border mb-4" controls preload="metadata" poster="{{ site.baseurl }}/img/unreal-journey/project-2-gallery-hero.png">
  <source src="{{ site.baseurl }}/assets/video/unreal-journey/project-2-prop-showcase.mp4" type="video/mp4">
  Your browser does not support embedded video.
</video>

## Project Goal

Project 2 expanded the museum foundation into a focused asset and presentation pipeline. I modeled props in Blender, imported and validated them in Unreal, built reusable material and showcase systems, and finished with an interactive camera tour of three relic variants.

## What I Built

- A Blender-to-Unreal workflow covering scale, rotation, pivot placement, FBX export, collision, and import validation.
- Parameterized material instances for stone, metal, frame, and emissive core treatments.
- `BP_PropShowcase_Base`, with editable mesh, material, label, height, rotation, and presentation-light settings.
- Three reusable child Blueprint presets for the Recovered Stone Relic, Archive Beacon, and Forged Archive Relic.
- Key, fill, rim, and optional accent lights with controlled exposure.
- One hero Cine Camera and three detail cameras.
- `BP_GalleryCameraDirector`, which caches player references and switches views with a reusable blend function.
- `WBP_GalleryCameraControls`, including a timed fade animation and one-time viewport creation.

## Development Journey

| Milestone | Progress |
| --- | --- |
| Day 11 | Modeled the first relic in Blender, corrected scale and pivot, exported it, and established a clean Unreal gallery baseline. |
| Day 12 | Tested UV behavior, created reusable material instances, and introduced the base showcase Blueprint. |
| Day 13 | Built the Archive Beacon, added a second material path, emissive core, and optional cyan accent light. |
| Day 14 | Added controlled gallery lighting, fixed exposure, performance checks, and cinematic composition. |
| Day 15 | Refactored the display system into a parent-and-child Blueprint family with three specialized presets. |
| Day 16 | Completed the four-camera tour, reusable view-target blending, walking-view return, hidden pawn cleanup, controls widget, timed fade, and final QA. |

## Gallery

<div class="row g-3 mb-4">
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-recovered-stone.png" alt="Recovered Stone Relic detail camera view">
  </div>
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-archive-beacon.png" alt="Archive Beacon detail camera view">
  </div>
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-forged-relic.png" alt="Forged Archive Relic detail camera view">
  </div>
  <div class="col-md-6">
    <img class="img-fluid rounded border" src="{{ site.baseurl }}/img/unreal-journey/project-2-day-13-progress.png" alt="Archive Beacon gallery progress during Day 13">
  </div>
</div>

## Key Lessons

This project connected asset creation with maintainable gameplay architecture. A successful prop was not only a model; it needed correct scale, pivot, UVs, collision, materials, import settings, and a reusable way to present variations in Unreal.

The Blueprint family became the central design decision. Shared behavior remained in the parent while child classes stored presentation defaults for each relic. The same separation carried into the camera system: the showcase Blueprints controlled content, Cine Cameras controlled composition, the Director controlled view changes, and UMG controlled player guidance.

## Result

The completed gallery presents three distinct relics using one reusable system. Keyboard controls switch smoothly among a hero view, three detail views, and the normal walking camera. The controls panel appears once, remains readable, fades without blocking interaction, and the project passes final movement, lighting, rotation, reference, and cleanup checks.

<p class="text-muted small mt-4">Documented from the Project 2 living master, project README, final gameplay capture, screenshots, Blender assets, and archived Unreal Engine 5.8 project files.</p>
