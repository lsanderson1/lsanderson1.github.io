---
layout: project
type: project
image: img/SpaceCommanderXcrop.png
title: "Space Commander X"
date: 2020
published: true
labels:
  - Game Development
  - Blender
  - C#
summary: "I developed a Nostalgic Asteroid-type game that is accessible on the site."
---


Space Commander X is a game developed on Unity where you control a ship in which you are to use to defeat oncoming forces. 
Basic controls are used, WASD for example along with support for arrow keys as well.
The game is never-ending, meaning that it will not stop until you as the player is defeated.

This project explained more about how the functions of C# work in Unity, along with pairing different platforms to create one project. It exercised the ability to produce
a single aspect game and bring it to fruition with many of the tools at Unity's disposal. I think with this, one would be able to create many other things aside from this.
Here is an example of the code.
```cpp
void Start()
    {
        playerRb = GetComponent<Rigidbody>();
        gameManager = GameObject.Find("Game Manager").GetComponent<GameManager>();
    }

    // Update is called once per frame
    void Update()
    {
        //rotates to a point around the y axis to where the player can control where they can shoot
        float step = degree * Time.deltaTime * rotationSpeed;

        horizontalInput = Input.GetAxisRaw("Horizontal");
        verticalInput = Input.GetAxisRaw("Vertical");

        //right button mouse click
        if(Input.GetMouseButton(1))
        {
            //if the mouse moves to the left, rotate to the left
            if (Input.GetAxis("Mouse X") < 0)
            {
                transform.Rotate(Vector3.down, step);
            }
            //if the mouse moves to the right, rotate to the right
            if (Input.GetAxis("Mouse X") > 0)
            {
                transform.Rotate(Vector3.up, step);
            }
        }
```

You can see more about this on the Space Commander X website: [Space Commander X Website](https://nostalgialabs.weebly.com/).
