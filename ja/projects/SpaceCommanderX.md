---
layout: project
type: project
image: img/SpaceCommanderXcrop.png
title: "Space Commander X"
date: 2020
project_order: 6
published: true
labels:
  - "ゲーム開発"
  - "Blender"
  - "C#"
summary: "Unity と C# で制作した、懐かしいアステロイド風の宇宙シューティングゲームです。"
lang: ja
---

Space Commander X は、宇宙船を操作して迫りくる敵を倒す Unity 製のゲームです。WASD キーに加え、矢印キーでの操作にも対応しています。ゲームに終点はなく、プレイヤーが倒されるまで戦いが続きます。

制作を通じて、Unity における C# の動作や、複数のツールを一つのプロジェクトに組み合わせる方法を学びました。一つのゲーム体験に焦点を絞り、Unity の機能を活用して遊べる形まで仕上げた経験は、その後の制作にもつながっています。以下は操作処理のコード例です。

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

詳細は [Space Commander X の公式サイト](https://nostalgialabs.weebly.com/)をご覧ください。

