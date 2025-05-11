// Basic Three.JS scene from documentation, importing Three.JS through a CDN 
// https://threejs.org/docs/#manual/en/introduction/Creating-a-scene


//~~~~~~~Import Three.js (also linked to as import map in HTML)~~~~~~
import * as THREE from 'three';

// Import add-ons
import { OrbitControls } from 'https://unpkg.com/three@0.162.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.162.0/examples/jsm/loaders/GLTFLoader.js'; // to load 3d models



// ~~~~~~~~~~~~~~~~Create scene here~~~~~~~~~~~~~~~~

let SpaceShip;

let mixer;

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene();




const camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector("#three-container").appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(new THREE.Color('#17172f'),1);


// const controls = new OrbitControls(camera, renderer.domElement);
const loader = new THREE.TextureLoader(); // to load 3d models

//#region  Particle System

    const particlesGeometry = new THREE.BufferGeometry;
    const particleCount = 500;

    const posArray = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++){
        posArray[i] = (Math.random() - 0.5) * (Math.random() * 10);
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesGeometryTwo = new THREE.BufferGeometry;
    const posArrayTwo = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++){
        posArrayTwo[i] = (Math.random() - 0.5) * (Math.random() * 10);
    }
    particlesGeometryTwo.setAttribute('position', new THREE.BufferAttribute(posArrayTwo, 3));

    const particlesGeometryThree = new THREE.BufferGeometry;
    const posArrayThree = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++){
        posArrayThree[i] = (Math.random() - 0.5) * (Math.random() * 10);
    }
    particlesGeometryThree.setAttribute('position', new THREE.BufferAttribute(posArrayThree, 3));

//#endregion



//#region Cube initialization

    const particleTexture = loader.load('images/Square.png');

    const geometry = new THREE.BoxGeometry(3,3,3);
    const material = new THREE.PointsMaterial({
        size: 0.1
    });
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.01,
        map: particleTexture,
        color: "yellow",
        transparent: true
    });
    const cube = new THREE.Points(geometry,material);

    const particlesMesh = new THREE.Points(particlesGeometry,particleMaterial);
    scene.add(particlesMesh);



    const particleTextureTwo = loader.load('images/Stare.png');
    const particleMaterialTwo = new THREE.PointsMaterial({
        size: 0.01,
        map: particleTextureTwo,
        color: "white",
        transparent: true
    });
    const particlesMeshTwo = new THREE.Points(particlesGeometryTwo,particleMaterialTwo);
    scene.add(particlesMeshTwo);

    const particleTextureThree = loader.load('images/Plus.png');
    const particleMaterialThree = new THREE.PointsMaterial({
        size: 0.01,
        map: particleTextureThree,
        color: "#8fc9ff",
        transparent: true
    });
    const particlesMeshThree = new THREE.Points(particlesGeometryThree,particleMaterialThree);
    scene.add(particlesMeshThree);


    const secondTexture = new THREE.TextureLoader().load('images/game-board_1000px.png');
    const secondMaterial = new THREE.MeshBasicMaterial({map: secondTexture});
    const cubeTwo = new THREE.Mesh(geometry,secondMaterial);
    // scene.add(cubeTwo);

//#endregion




camera.position.z = 0;
camera.rotation.z = 180

function init(){
    
    cube.position.set(0,0,-9)
    cubeTwo.position.set(0,0,-15)

    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(1,1,5);
    scene.add(light);

    const second_light = new THREE.DirectionalLight(0xffffff, 2)
    second_light.position.set(1,1,-5);
    scene.add(second_light);
   

}


const clock = new THREE.Clock();

document.addEventListener("mousemove", animateParticles);
let mouseX = 0;
let mouseY = 0;

function animateParticles(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
}


function animate(){
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    if(mouseX == 0 && mouseY == 0){
        particlesMesh.rotation.x = Math.sin(Date.now() / 5000) * 4 - 2;
        particlesMesh.rotation.y = Math.sin(Date.now() / 3000) * 4 - 2;
        particlesMesh.rotation.z = Math.sin(Date.now() / 4000) * 4 - 2;
        particlesMeshTwo.rotation.x = Math.sin(Date.now() / 5000) * 2 - 2;
        particlesMeshTwo.rotation.y = Math.sin(Date.now() / 3000) * 2 - 2;
        particlesMeshTwo.rotation.z = Math.sin(Date.now() / 4000) * 2 - 2;
        particlesMeshThree.rotation.x = Math.sin(Date.now() / 5000) * 1 - 2;
        particlesMeshThree.rotation.y = Math.sin(Date.now() / 3000) * 1 - 2;
        particlesMeshThree.rotation.z = Math.sin(Date.now() / 4000) * 1 - 2;



    }


    // cube.rotation.x = Math.sin(Date.now() / 5000) * 4 - 2;
    // cube.rotation.y = Math.sin(Date.now() / 3000) * 4 - 2;
    // cube.rotation.z = Math.sin(Date.now() / 4000) * 4 - 2;

    particlesMesh.rotation.y = -mouseY * (elapsedTime * 0.00005)
    particlesMesh.rotation.x = -mouseX * (elapsedTime * 0.00005)
    particlesMeshTwo.rotation.y = -mouseY * (elapsedTime * 0.000025)
    particlesMeshTwo.rotation.x = -mouseX * (elapsedTime * 0.000025)
    particlesMeshThree.rotation.y = -mouseY * (elapsedTime * 0.000035)
    particlesMeshThree.rotation.x = -mouseX * (elapsedTime * 0.000035)
    // cubeTwo.rotation.y = Math.sin(Date.now() / 3000) * 4 - 2;
    // cubeTwo.rotation.x = Math.sin(Date.now() / 5000) * 4 - 2;
    // cubeTwo.rotation.z = Math.sin(Date.now() / 4000) * 4 - 2;



    // if(SpaceShip){

    //     SpaceShip.position.x = Math.sin(Date.now() / 5000) * 4;
    //     SpaceShip.position.y = Math.sin(Date.now() / 3000) * 4;
    //     SpaceShip.position.z = Math.sin(Date.now() / 4000) * 4;
    //     // SpaceShip.rotation.x = Math.sin(Date.now() / 5000) * -2;
    //     // SpaceShip.rotation.y = Math.sin(Date.now() / 3000) * -2;
    //     // SpaceShip.rotation.z = Math.sin(Date.now() / 4000) * -2;
    //     mixer.update(clock.getDelta());
    // }

    renderer.render(scene,camera);
}



function onWindowResize() {
    camera.aspect =  window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new THREE.Color('#17172f'),1);
}

window.addEventListener('resize', onWindowResize, false);

init();
animate();
// ~~~~~~~~~~~~~~~~ Initiate add-ons ~~~~~~~~~~~~~~~~




// loader.load('assets/SpaceShip.gltf', function (gltf){
//     SpaceShip = gltf.scene
//     scene.add(SpaceShip);
//     // SpaceShip.scale.set(2,2,2);
//     SpaceShip.position.y = -2;
//     mixer = new THREE.AnimationMixer(SpaceShip);
//     clips = gltf.animations;
// })

// // event Listener

// document.querySelector("body").addEventListener("mousedown", () => {
//     clips.forEach(function(clip) {
//         const action = mixer.clipAction(clip);
//         action.play();
//         action.paused = false;
//     })
// })
// document.querySelector("body").addEventListener("mouseup", () => {
//     clips.forEach(function(clip) {
//         const action = mixer.clipAction(clip);
//         action.paused = true;
//     })
// })
// document.querySelector("body").addEventListener("mousemove", () => {
//     cube.rotation.x += 0.01;
//     cube.rotation.z += 0.01;
//     cube.position.x = Math.sin(Date.now() / 5000) * 4 - 2;
//     cube.position.y = Math.sin(Date.now() / 3000) * 4 - 2;
//     cube.position.z = Math.sin(Date.now() / 4000) * 4 - 2;
// })



// →→→→→→ Follow next steps in tutorial: // https://threejs.org/docs/#manual/en/introduction/Creating-a-scene


