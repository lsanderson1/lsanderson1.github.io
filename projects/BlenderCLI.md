---
layout: project
type: project
image: img/BlenderLogo.png
title: "Blender CLI Integration"
date: 2025
published: true
labels:
  - Python
  - Common LISP
  - Blender / Assets
  - Socket and JSON Encapsulation
---

Overview
--------
This project is:
1. **A Python socket server** embedded in Blender (v4.2+) that listens on TCP port (default: 5000) for JSON commands.
2. **A Common Lisp client library** (`blender-ipc.lisp` + `blender-cli.lisp`) to send commands and an interactive menu.

What is used to execute this project
-------------
- **Blender 4.2+** with Python scripting enabled.
- **Common Lisp** with packages:
  - `usocket`
  - `cl-json`
- Network access between Lisp client and Blender (default `127.0.0.1:5000`).

Setup
-----
1. **In Blender**  
   - Open the `blender-python_script_lloyd` text file and paste the Python script into the Text Editor.  
   - Run the script or enable "Register" so it runs on file load.  
   - Confirm console shows:  
     
     Blender socket server listening on 127.0.0.1:5000
     

2. **In Lisp**  
   - Adjust `*blender-host*` and `*blender-port*` in `blender-ipc.lisp` if needed.  
   - Load `blender-ipc.lisp` then `blender-cli.lisp` in your REPL. (or call 'load' on top, then C-c C-l on blender-cli.lisp)  
   - Call `(blender-menu)` to access the interactive CLI.

Core Python Functions (action handlers)
---------------------------------------
- **ping**  
  Health check: replies “Get Pong'd!”

- **create**  
  Create mesh primitives (`cube`, `sphere`, `cylinder`, `torus`, `plane`) with optional location, size, rotation.

- **translate**, **rotate**, **scale**  
  Move, rotate (degrees), scale objects by given deltas or factors.

- **delete**  
  Remove a named object—or all objects if no name provided.

- **color**  
  Apply a solid RGBA color to an object’s material.

- **rainbow**  
  Create a procedural rainbow material with optional shader type and roughness.

- **emission**  
  Assign an emissive material with color and strength.

- **particles**  
  Add or update a particle system: count, lifetime, velocity, smoke/fire toggles, resolution.

- **light**  
  Add lights (`POINT`, `SUN`, `SPOT`, `AREA`) with location, energy, optional angle (°) & blend (0–1) for spot, source color sampling, and optional radius-based light linking.

- **add-camera**, **set-camera**  
  Create and set active camera with location & rotation.

- **get-info**  
  Query object transform and dimensions.

- **material**  
  Assign node-based materials: principled, glass, glossy, metallic, anisotropic, sss, transparent, sheen, wireframe; with color, roughness, anisotropy, scale, radius parameters.

- **animate**  
  Keyframe interpolate location, rotation_euler, or scale between start/end values over frames.

Core Lisp Functions
-------------------
- **blender-ping**
- **blender-create** NAME TYPE &key :location :size :rotation
- **blender-translate** NAME DX DY DZ
- **blender-rotate** NAME RX RY RZ
- **blender-scale** NAME SX SY SZ
- **blender-color** NAME R G B &optional A
- **blender-rainbow** NAME &key :base_type :roughness
- **blender-delete** NAME
- **blender-particles** NAME &key :count :lifetime :frame-start :frame-end :velocity :location :smoke :fire :resolution-max
- **blender-light** NAME TYPE &key :location :energy :source :radius :angle :blend
- **blender-add-camera** NAME &key :location :rotation
- **blender-set-camera** NAME
- **blender-emission** NAME &key :color :strength
- **blender-object-info** NAME
- **blender-material** NAME TYPE &key :color :roughness :anisotropy :scale :radius
- **blender-animate** NAME PROP &key :start-frame :end-frame :start-value :end-value
- **blender-menu**  
  Interactive menu driving all above commands.

**Usage Example**
-----------------
```txt
CL-USER> (blender-menu)
==== BLENDER-CLI MENU =====
Reminder: Please open your Blender Host and Port to connection before running payloads
1) Ping
2) Create Object
3) Translate
4) Rotate
5) Scale
6) Color
7) Add Emission (+ Color)
8) Apply Material
9) Add Animation
10) Add Particle System
11) Add Light
12) Add Camera
13) Set Camera
14) Delete Object
15) Get Information
16) Quit

Choice: 1

[Blender]:
Get Pong'd!

Choice: 2

======== CREATING OBJECT... ==========
Available Meshes:

  Cube  
  Sphere  
  Cylinder  
  Torus  
  Plane  

Please type in the mesh you wish to create: Cube  
How many Cube(s) would you like to create: 1  
======== Creating Cube #1... ==========
Name: Cube1  
Location (x y z): (0 0 0)  
Size: 9  
Rotation (Deg) (x y z): (0 0 0)  

[Blender]:  
You created a 'cube' named 'Cube1' at [0, 0, 0] with size 9 and rotation [0, 0, 0]  

Check your Blender Scene.

Choice: 6

======== APPLYING COLOR TO OBJECT... ==========
Name: Cube1  
Apply Rainbow? (Y/N): N  
Solid Color (r g b (alpha)): (1 0 1)  

[Blender]:  
Colored 'Cube1' with [1, 0, 1, 1.0]  

Check your Blender Scene.

Choice: 8

======== APPLYING MATERIAL TO OBJECT ==========
Name: Cube1  
Material Type:

  Principled  
  Glass  
  Glossy  
  Metallic  
  Anisotropic  
  SSS (Subsurface Scattering)  
  Transparent  
  Sheen  
  Wireframe  

Please input the material you wish to add to Cube1: Glossy  
Use existing object color? (Y/N): Y  
Roughness (0.0–1.0): 0  

[Blender]:  
Applied 'glossy' material to 'Cube1'  

Check your Blender Scene.

Choice: 14

======== DELETING OBJECT... ==========
Name to delete (or press Enter to delete ALL): Cube1  

[Blender]:  
Deleted object: 'Cube1'  

Check your Blender Scene

Choice: 16  
Goodbye.  
NIL

---
```
Download the file links here:

[Blender CLI File](/assets/files/blender-cli.lisp)  
[Blender IPC File](/assets/files/blender-ipc.lisp)  
[Blender-Python Integration and API Source Code](/assets/files/blender-python-lloyd.txt)
