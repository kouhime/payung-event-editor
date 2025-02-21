import * as THREE from 'three';

const canvas = document.getElementById('sceneCanvas');
const canvasContainer = document.getElementById('canvasContainer');
const baseWidth = 1280;
const baseHeight = 720;
const continuitySprites = {};

let currentDialogue = null;

const camera = new THREE.OrthographicCamera(0, baseWidth, baseHeight, 0, -1000, 1000);

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(baseWidth, baseHeight);

let nextScene = null;
const scene = new THREE.Scene();

let backgroundMesh = null;
let sprites = [];
let currentSprite = null;

let lastDialogue = null;
let selectionOutline = null;
const choiceBox = document.getElementById('choiceBox')

export function resizeCanvas() {
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    const scale = Math.min(containerWidth / baseWidth, containerHeight / baseHeight);
    canvas.style.width = baseWidth * scale + 'px';
    canvas.style.height = baseHeight * scale + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
loadSceneForNode(window.firstNode)

function animate() {
    resizeCanvas();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

function updateSpriteMesh(sprite) {
    if (sprite.mesh) {
        sprite.mesh.position.set(
            sprite.x + sprite.width / 2,
            sprite.y + sprite.height / 2,
            sprite.zIndex !== undefined ? sprite.zIndex : 0
        );
        const scaleX = sprite.flip ? -sprite.width : sprite.width;
        sprite.mesh.scale.set(scaleX, sprite.height, 1);
        sprite.mesh.material.color.setScalar(sprite.focus ? 1.0 : 0.5);


        if (sprite.animationClass) {
            applyAnimations(sprite);
        }
    }
}

window.addEventListener("mouseup", () => {
    if (!window.multiChoice && !window.currentlyTyping) {
        loadSceneForNode(nextScene);
    }
})

function typeDialogue(dialogueText, actor = '', color = 'white', dialogueBoxId = 'dialogueBox', typingSpeed = 10) {
    const dialogueBox = document.getElementById(dialogueBoxId);
    const nameBox = document.getElementById("nameBox");
    if (!dialogueBox) {
        console.error(`Dialogue box element with id '${dialogueBoxId}' not found.`);
        return;
    }

    dialogueBox.textContent = '';
    nameBox.textContent = actor;
    nameBox.classList.add(`text-[${color}]`)
    let charIndex = 0;
    window.addEventListener('click', () => {
        if (window.currentlyTyping) {
            dialogueBox.textContent = dialogueText
            charIndex = dialogueText.length
        }
    })

    function typeCharacter() {
        window.currentlyTyping = true
        if (charIndex < dialogueText.length && window.currentlyTyping) {
            dialogueBox.textContent += dialogueText.charAt(charIndex);
            charIndex++;
            setTimeout(typeCharacter, typingSpeed);
        } else {
            window.removeEventListener('mouseup', () => {
                if (window.currentlyTyping) {
                    dialogueBox.textContent = dialogueText
                    charIndex = dialogueText.length
                }
            })
            window.currentlyTyping = false;

        }
    }

    typeCharacter();
    window.removeEventListener('mouseup', () => {
        if (window.currentlyTyping) {
            dialogueBox.textContent = dialogueText
            charIndex = dialogueText.length
        }
    })
    window.currentlyTyping = false;


}

export function loadSceneForNode(nodeData) {
    console.log(nodeData)
    lastDialogue = currentDialogue;
    currentDialogue = nodeData;
    window.multiChoice = true

    if (nodeData.rows.length > 0) {
        if (nodeData.rows.length == 1 && nodeData.rows[0].row.itemDetails.title == "PRE_CONT") {
            window.multiChoice = false
            nextScene = window.nodes.filter(e => e.id == nodeData.rows[0].row.itemDetails.connectionTarget)[0]
        } else {

            if (choiceBox) {
                nodeData.rows.forEach(choice => {
                    const choiceEl = document.createElement('div');
                    choiceEl.id = choice.row.itemDetails.connectionTarget;
                    choiceEl.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0) 100%)";
                    choiceEl.className = "text-center bg-opacity-50 px-4 py-2 w-[80%] cursor-pointer hover:bg-opacity-70 transition-bg duration-300";
                    choiceEl.textContent = choice.row.itemDetails.title;

                    choiceEl.addEventListener('click', () => {
                        const targetNodeId = choice.row.itemDetails.connectionTarget;
                        nextScene = window.nodes.find(node => node.id === targetNodeId);
                        if (nextScene) {
                            window.multiChoice = false;
                            choiceBox.innerHTML = '';
                            loadSceneForNode(nextScene);
                        } else {
                            console.error(`Node with id '${targetNodeId}' not found.`);
                        }
                    });
                    choiceBox.appendChild(choiceEl);
                });
            } else {
                console.error('Choice box element with id "choiceBox" not found.');
            }
        }
    }

    if (nodeData.dialogue == '') {
        document.getElementById('dialogueBox').parentElement.classList.add('hidden');
    } else {
        document.getElementById('dialogueBox').parentElement.classList.remove('hidden');
        typeDialogue(nodeData.dialogue, nodeData.speaker, nodeData.speakerColor);
    }




    let lastBG = '';
    let lastSprites = [];
    if (!!lastDialogue) {
        lastBG = lastDialogue.scene.background;
        lastSprites = lastDialogue.scene.sprites
    }

    if (nodeData.scene.background != lastBG && backgroundMesh) {
        scene.remove(backgroundMesh);
        backgroundMesh = null;
    }

    if (nodeData.scene.background != lastBG && nodeData.scene.background) {
        const texture = new THREE.TextureLoader().load(nodeData.scene.background);
        texture.flipY = true;
        texture.colorSpace = THREE.SRGBColorSpace
        const geo = new THREE.PlaneGeometry(baseWidth, baseHeight);
        const mat = new THREE.MeshBasicMaterial({
            map: texture
        });
        backgroundMesh = new THREE.Mesh(geo, mat);
        backgroundMesh.position.set(baseWidth / 2, baseHeight / 2, -1);
        scene.add(backgroundMesh);
    }




    const newContinuityIDs = new Set();
    nodeData.scene.sprites.forEach(spriteData => {
        if (spriteData.continuityIdentifier) {
            newContinuityIDs.add(spriteData.continuityIdentifier);
        }
    });


    for (const id in continuitySprites) {
        if (!newContinuityIDs.has(id)) {
            const oldSprite = continuitySprites[id];
            scene.remove(oldSprite.mesh);
            sprites = sprites.filter(s => s !== oldSprite);
            delete continuitySprites[id];
        }
    }

    sprites.forEach(sprite => {
        if (!sprite.continuityIdentifier) {
            scene.remove(sprite.mesh);
        }
    });
    sprites = sprites.filter(sprite => sprite.continuityIdentifier);

    nodeData.scene.sprites.forEach(spriteData => {

        if (spriteData.continuityIdentifier && continuitySprites[spriteData.continuityIdentifier]) {
            const sprite = continuitySprites[spriteData.continuityIdentifier];

            const targetProps = {
                x: spriteData.x,
                y: spriteData.y,
                width: spriteData.width,
                height: spriteData.height,
                focus: spriteData.focus !== false,
                flip: spriteData.flip !== undefined ? spriteData.flip : false,
                animationClass: spriteData.animationClass || ''
            };

            if (spriteData.src !== sprite.image.src) {
                crossFadeTexture(sprite, spriteData.src, 100, spriteData.animationClass);
            }



            tween({
                from: sprite.x,
                to: targetProps.x,
                duration: 500,
                onUpdate: (value) => {
                    sprite.x = value;
                    updateSpriteMesh(sprite);
                }
            });
            tween({
                from: sprite.y,
                to: targetProps.y,
                duration: 500,
                onUpdate: (value) => {
                    sprite.y = value;
                    updateSpriteMesh(sprite);
                }
            });
            tween({
                from: sprite.width,
                to: targetProps.width,
                duration: 500,
                onUpdate: (value) => {
                    sprite.width = value;
                    updateSpriteMesh(sprite);
                }
            });
            tween({
                from: sprite.height,
                to: targetProps.height,
                duration: 500,
                onUpdate: (value) => {
                    sprite.height = value;
                    updateSpriteMesh(sprite);
                }
            });


            sprite.focus = targetProps.focus;
            sprite.flip = targetProps.flip;
            sprite.animationClass = targetProps.animationClass;


            if (!sprites.includes(sprite)) {
                sprites.push(sprite);
            }

        } else {

            const img = new Image();
            img.onload = () => {
                const sprite = {
                    id: Date.now() + Math.random(),
                    image: img,
                    x: spriteData.x,
                    y: spriteData.y,
                    width: spriteData.width,
                    height: spriteData.height,
                    focus: spriteData.focus !== false,
                    animationClass: spriteData.animationClass || '',
                    continuityIdentifier: spriteData.continuityIdentifier || '',
                    sfx: spriteData.sfx || [],
                    zIndex: spriteData.zIndex !== undefined ? spriteData.zIndex : 0,
                    flip: spriteData.flip !== undefined ? spriteData.flip : false
                };
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                texture.flipY = true;
                texture.colorSpace = THREE.SRGBColorSpace;
                const geometry = new THREE.PlaneGeometry(1, 1);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(sprite.x + sprite.width / 2, sprite.y + sprite.height / 2, 0);
                mesh.scale.set(sprite.width, sprite.height, 1);
                sprite.mesh = mesh;
                scene.add(mesh);
                sprites.push(sprite);
                updateSpriteMesh(sprite);


                if (sprite.continuityIdentifier) {
                    continuitySprites[sprite.continuityIdentifier] = sprite;
                }
            };
            img.src = spriteData.src;
        }
    });
}


function crossFadeTexture(sprite, newSrc, duration, animationClass) {
    const loader = new THREE.TextureLoader();
    loader.load(newSrc, (newTexture) => {
        newTexture.flipY = true;
        newTexture.colorSpace = THREE.SRGBColorSpace;
        sprite.image = newTexture.image;
        sprite.mesh.material.map = newTexture;
        sprite.mesh.material.needsUpdate = true;
    });
}


function tween({
    from,
    to,
    duration,
    onUpdate,
    onComplete
}) {
    const start = performance.now();

    function animate(now) {
        const t = Math.min((now - start) / duration, 1);
        const value = from + (to - from) * easeOutQuad(t);
        onUpdate(value);
        if (t < 1) {
            requestAnimationFrame(animate);
        } else if (onComplete) {
            onComplete();
        }
    }
    requestAnimationFrame(animate);
}

function easeOutQuad(t) {
    return t * (2 - t);
}


function applyAnimations(sprite) {
    const classes = (sprite.animationClass || "").split(' ');

    if (classes.includes("enter_fade")) {
        sprite.mesh.material.transparent = true;
        sprite.mesh.material.opacity = 0;
        tween({
            from: 0,
            to: 1,
            duration: 200,
            onUpdate: (value) => {
                sprite.mesh.material.opacity = value;
            }
        });
    }

    if (classes.includes("fx_surprised")) {
        const originalY = sprite.mesh.position.y;
        tween({
            from: originalY,
            to: originalY + 20,
            duration: 100,
            onUpdate: (value) => {
                sprite.mesh.position.y = value;
            },
            onComplete: () => {
                tween({
                    from: sprite.mesh.position.y,
                    to: originalY,
                    duration: 100,
                    onUpdate: (value) => {
                        sprite.mesh.position.y = value;
                    }
                });
            }
        });
    }
}