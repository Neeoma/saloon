import * as THREE from "three";
import copperCurlsUrl from "../images/copper-curls.jpg";

const hero = document.querySelector(".hero");
const canvas = document.querySelector("#salon-canvas");
const loading = document.querySelector("#scene-loading");
const hotspotLayer = document.querySelector("#scene-hotspots");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!hero || !canvas || !hotspotLayer) {
  throw new Error("The Crown Room 3D tour needs its salon canvas in the hero section.");
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (error) {
  console.warn("3D salon tour is unavailable; keeping the photo-led fallback.", error);
  hero.classList.add("scene-fallback");
  if (loading) loading.hidden = true;
}

if (renderer) {
  const scene = new THREE.Scene();
  const forestFog = new THREE.Color(0x1a2d27);
  scene.background = forestFog.clone();
  scene.fog = new THREE.Fog(forestFog.clone(), 15, 33);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const cameraTarget = new THREE.Vector3(0, 2.15, -2.65);
  const defaultCameraTarget = cameraTarget.clone();
  const panoramicCameraTarget = new THREE.Vector3(0, 2.18, -0.25);
  const defaultView = { yaw: 0.04, pitch: 0.1 };
  let in360View = false;
  let restoreTourAfter360 = false;
  let yaw = 0.04;
  let pitch = 0.1;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let distance = 14.8;
  let targetDistance = distance;
  let initialDistance = distance;
  let dragging = false;
  let hasInteracted = false;
  let previousPointer = { x: 0, y: 0 };
  let afterDark = false;
  let heroScrollProgress = 0;
  let sceneVisible = true;
  let pageVisible = !document.hidden;
  let lastFrame = performance.now();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(hero.clientWidth, hero.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;

  const materials = {
    forest: new THREE.MeshStandardMaterial({ color: 0x173a32, roughness: 0.88 }),
    forestLight: new THREE.MeshStandardMaterial({ color: 0x285146, roughness: 0.72 }),
    deepWood: new THREE.MeshStandardMaterial({ color: 0x36251f, roughness: 0.7 }),
    walnut: new THREE.MeshStandardMaterial({ color: 0x64452f, roughness: 0.53 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb27650, metalness: 0.72, roughness: 0.28 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd0ad72, metalness: 0.78, roughness: 0.23 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xd9c9b3, roughness: 0.93 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xece1d0, roughness: 0.72 }),
    upholstery: new THREE.MeshStandardMaterial({ color: 0x9b5a42, roughness: 0.88 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x223a37, metalness: 0.65, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x365c42, roughness: 0.86, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x6b8052, roughness: 0.84, side: THREE.DoubleSide }),
  };

  const makeBox = (width, height, depth, material, x, y, z, { cast = true, receive = true } = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  };

  const makeCylinder = (radiusTop, radiusBottom, height, material, x, y, z, segments = 24) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  function makeTileTexture() {
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = 512;
    tileCanvas.height = 512;
    const context = tileCanvas.getContext("2d");
    context.fillStyle = "#cbbba6";
    context.fillRect(0, 0, 512, 512);
    const tileSize = 128;
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        context.fillStyle = (x + y) % 2 === 0 ? "#dfd2c0" : "#d5c6b2";
        context.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
      }
    }
    context.strokeStyle = "rgba(112, 83, 59, .28)";
    context.lineWidth = 4;
    for (let i = 0; i <= 4; i += 1) {
      context.beginPath(); context.moveTo(i * tileSize, 0); context.lineTo(i * tileSize, 512); context.stroke();
      context.beginPath(); context.moveTo(0, i * tileSize); context.lineTo(512, i * tileSize); context.stroke();
    }
    for (let i = 0; i < 800; i += 1) {
      context.fillStyle = `rgba(80, 58, 43, ${Math.random() * 0.045})`;
      context.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const texture = new THREE.CanvasTexture(tileCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.8, 2.8);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  const tileMaterial = new THREE.MeshStandardMaterial({ map: makeTileTexture(), roughness: 0.54, metalness: 0.015 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 15), tileMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.015, -0.35);
  floor.receiveShadow = true;
  scene.add(floor);

  // Open-backed room shell lets the salon breathe like a small architectural model.
  makeBox(14, 6.6, 0.28, materials.forest, 0, 3.28, -6.62);
  makeBox(0.28, 6.6, 14.8, materials.plaster, -6.87, 3.28, -0.25);
  makeBox(0.28, 6.6, 14.8, materials.forestLight, 6.87, 3.28, -0.25);
  makeBox(14, 0.2, 0.22, materials.deepWood, 0, 0.13, -6.42);
  makeBox(14, 1.15, 0.16, materials.deepWood, 0, 0.77, -6.43);
  makeBox(14, 0.08, 0.2, materials.brass, 0, 1.38, -6.36, { cast: false });

  // Fine trim gives the back wall a paneled, crafted finish.
  for (let x = -6.25; x <= 6.3; x += 1.27) {
    makeBox(0.035, 1.05, 0.035, materials.walnut, x, 0.77, -6.32, { cast: false });
  }
  for (const y of [0.3, 1.22]) makeBox(13.8, 0.035, 0.04, materials.copper, 0, y, -6.3, { cast: false });

  // A small painted sign is a canvas texture, so the room has a real brand detail without a bitmap dependency.
  function makeSignTexture() {
    const sign = document.createElement("canvas");
    sign.width = 1024;
    sign.height = 260;
    const context = sign.getContext("2d");
    context.fillStyle = "#16382f";
    context.fillRect(0, 0, sign.width, sign.height);
    context.strokeStyle = "#b9865c";
    context.lineWidth = 4;
    context.strokeRect(16, 16, sign.width - 32, sign.height - 32);
    context.textAlign = "center";
    context.fillStyle = "#f2e8d8";
    context.font = "500 59px Georgia, serif";
    context.letterSpacing = "12px";
    context.fillText("THE CROWN ROOM", sign.width / 2, 121);
    context.fillStyle = "#d49a70";
    context.font = "600 19px Arial, sans-serif";
    context.letterSpacing = "7px";
    context.fillText("HAIR ATELIER · LAGOS", sign.width / 2, 177);
    const texture = new THREE.CanvasTexture(sign);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const wallSign = new THREE.Mesh(new THREE.PlaneGeometry(3.95, 1), new THREE.MeshBasicMaterial({ map: makeSignTexture() }));
  wallSign.position.set(0, 5.62, -6.42);
  scene.add(wallSign);

  const mirrorFrameMaterial = materials.brass;
  const mirrorGeometry = new THREE.CapsuleGeometry(0.65, 1.18, 6, 24);
  const mirrorInnerGeometry = new THREE.CapsuleGeometry(0.56, 1.1, 6, 24);
  const chairColors = [0x8b503d, 0x98724c, 0x5f7963];
  const chairMaterials = chairColors.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.83 }));

  function addBottle(x, y, z, color) {
    const bottleMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.08 });
    makeCylinder(0.095, 0.12, 0.36, bottleMaterial, x, y, z, 16);
    makeCylinder(0.045, 0.055, 0.11, materials.brass, x, y + 0.235, z, 12);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.07, 16), materials.cream);
    label.position.set(x, y, z);
    scene.add(label);
  }

  function addStylingStation(index, x) {
    const mirrorFrame = new THREE.Mesh(mirrorGeometry, mirrorFrameMaterial);
    mirrorFrame.position.set(x, 3.78, -6.37);
    mirrorFrame.castShadow = true;
    scene.add(mirrorFrame);
    const mirror = new THREE.Mesh(mirrorInnerGeometry, materials.glass);
    mirror.position.set(x, 3.78, -6.17);
    scene.add(mirror);

    const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xf7d9a5, emissive: 0xffbd72, emissiveIntensity: 0.75 });
    for (const side of [-1, 1]) {
      const bulbRail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.56, 0.035), materials.copper);
      bulbRail.position.set(x + side * 0.82, 3.8, -6.12);
      scene.add(bulbRail);
      for (const y of [3.25, 3.72, 4.19]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), bulbMaterial);
        bulb.position.set(x + side * 0.82, y, -6.08);
        scene.add(bulb);
      }
    }

    makeBox(2.38, 0.12, 0.68, materials.walnut, x, 1.53, -5.48);
    makeBox(1.12, 0.34, 0.54, materials.deepWood, x, 1.27, -5.48);
    makeBox(0.86, 0.025, 0.06, materials.brass, x, 1.28, -5.19, { cast: false });
    addBottle(x - 0.72, 1.76, -5.48, 0x785b42);
    addBottle(x - 0.39, 1.76, -5.43, 0x416355);
    addBottle(x + 0.62, 1.76, -5.49, 0xa46145);
    addBottle(x + 0.92, 1.76, -5.42, 0x373c35);

    // Padded hydraulic salon chair, angled toward the mirror.
    const chairZ = -3.27;
    makeCylinder(0.5, 0.52, 0.11, materials.deepWood, x, 0.18, chairZ, 32);
    makeCylinder(0.13, 0.16, 0.65, materials.copper, x, 0.55, chairZ, 20);
    makeCylinder(0.64, 0.59, 0.2, chairMaterials[index], x, 1.04, chairZ, 32);
    const chairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.42, 5, 18), chairMaterials[index]);
    chairBack.position.set(x, 1.74, chairZ + 0.48);
    chairBack.castShadow = true;
    scene.add(chairBack);
    makeBox(0.12, 0.12, 0.72, materials.brass, x - 0.65, 1.45, chairZ + 0.03);
    makeBox(0.12, 0.12, 0.72, materials.brass, x + 0.65, 1.45, chairZ + 0.03);
    makeBox(1.08, 0.1, 0.42, materials.copper, x, 0.48, chairZ - 0.67);

    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.23, 48), new THREE.MeshStandardMaterial({ color: index === 1 ? 0xb87554 : 0x6f7660, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(x, 0.025, chairZ);
    rug.receiveShadow = true;
    scene.add(rug);
  }

  addStylingStation(0, -3.8);
  addStylingStation(1, 0);
  addStylingStation(2, 3.8);

  // Three warm pendant lamps and soft pools of task light.
  const pendantLights = [];
  for (const x of [-3.8, 0, 3.8]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.92, 8), materials.deepWood);
    cord.position.set(x, 5.88, -3.7);
    scene.add(cord);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.24, 0.32, 28, 1, true), materials.copper);
    shade.position.set(x, 5.35, -3.7);
    scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd79e }));
    bulb.position.set(x, 5.11, -3.7);
    scene.add(bulb);
    const point = new THREE.PointLight(0xffce90, 50, 7.5, 2);
    point.position.set(x, 4.92, -3.55);
    point.castShadow = false;
    scene.add(point);
    pendantLights.push(point);
  }

  // Reception desk with slatted walnut front, stone top and branded plaque.
  makeBox(2.46, 1.08, 1.06, materials.deepWood, 4.4, 0.58, 1.2);
  makeBox(2.58, 0.1, 1.14, materials.cream, 4.4, 1.17, 1.2);
  for (let x = 3.32; x <= 5.48; x += 0.18) makeBox(0.035, 0.84, 0.035, materials.walnut, x, 0.57, 1.75, { cast: false });
  const deskLogoCanvas = document.createElement("canvas");
  deskLogoCanvas.width = 512; deskLogoCanvas.height = 160;
  const deskContext = deskLogoCanvas.getContext("2d");
  deskContext.fillStyle = "#183a32"; deskContext.fillRect(0, 0, 512, 160);
  deskContext.strokeStyle = "#d3b47e"; deskContext.lineWidth = 3; deskContext.strokeRect(8, 8, 496, 144);
  deskContext.fillStyle = "#f4efe5"; deskContext.textAlign = "center"; deskContext.font = "28px Georgia"; deskContext.fillText("CROWN ROOM", 256, 95);
  const deskLogo = new THREE.CanvasTexture(deskLogoCanvas); deskLogo.colorSpace = THREE.SRGBColorSpace;
  const deskPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshBasicMaterial({ map: deskLogo }));
  deskPlaque.position.set(4.4, 0.65, 1.74);
  scene.add(deskPlaque);

  // Waiting nook: soft bench, little table and oversized botanical leaves.
  makeBox(2.55, 0.42, 0.86, new THREE.MeshStandardMaterial({ color: 0x684739, roughness: 0.92 }), -4.55, 0.64, 1.3);
  makeBox(2.55, 0.55, 0.24, new THREE.MeshStandardMaterial({ color: 0x8b624a, roughness: 0.9 }), -4.55, 1.08, 1.63);
  for (const x of [-5.43, -3.67]) makeBox(0.12, 0.52, 0.12, materials.deepWood, x, 0.28, 1.38);
  const coffeeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.1, 36), materials.walnut);
  coffeeTop.position.set(-2.65, 0.68, 1.42); coffeeTop.castShadow = true; scene.add(coffeeTop);
  makeCylinder(0.12, 0.35, 0.58, materials.copper, -2.65, 0.35, 1.42, 20);
  makeCylinder(0.48, 0.48, 0.05, materials.deepWood, -2.65, 0.08, 1.42, 24);
  makeCylinder(0.17, 0.18, 0.31, materials.forestLight, -2.65, 0.89, 1.42, 20);
  makeCylinder(0.08, 0.1, 0.08, materials.brass, -2.65, 1.085, 1.42, 16);

  function addPlant(x, z, scale = 1) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.39 * scale, 0.68 * scale, 24), new THREE.MeshStandardMaterial({ color: 0xb1694e, roughness: 0.72 }));
    pot.position.set(x, 0.34 * scale, z); pot.castShadow = true; scene.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.29 * scale, 0.29 * scale, 0.04 * scale, 24), materials.deepWood);
    soil.position.set(x, 0.69 * scale, z); scene.add(soil);
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * Math.PI * 2;
      const height = (1.05 + (i % 3) * 0.23) * scale;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), i % 2 ? materials.leaf : materials.leafLight);
      leaf.scale.set(0.16 * scale, height * 0.51, 0.08 * scale);
      leaf.position.set(x + Math.cos(angle) * 0.34 * scale, 0.92 * scale + height * 0.35, z + Math.sin(angle) * 0.3 * scale);
      leaf.rotation.z = Math.cos(angle) * 0.53;
      leaf.rotation.x = Math.sin(angle) * 0.43;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      scene.add(leaf);
    }
  }
  addPlant(-5.8, -4.8, 1.24);
  addPlant(5.65, -4.55, 1.12);
  addPlant(5.92, 3.25, 1.35);
  addPlant(-5.8, 3.9, 0.95);

  // A framed editorial print adds a human scale to the left wall.
  const loader = new THREE.TextureLoader();
  const portraitTexture = loader.load(copperCurlsUrl);
  portraitTexture.colorSpace = THREE.SRGBColorSpace;
  const printFrame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.85, 1.38), materials.brass);
  printFrame.position.set(-6.68, 3.75, -1.65);
  scene.add(printFrame);
  const printMat = new THREE.MeshBasicMaterial({ map: portraitTexture });
  const print = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.58), printMat);
  print.rotation.y = Math.PI / 2;
  print.position.set(-6.61, 3.75, -1.65);
  scene.add(print);

  // A few soft, low-contrast dust motes catch the light in the open room.
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i += 1) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 12;
    dustPositions[i * 3 + 1] = Math.random() * 5.7 + 0.35;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xf6d9ae, size: 0.025, transparent: true, opacity: 0.42, depthWrite: false }));
  scene.add(dust);

  const hemisphere = new THREE.HemisphereLight(0xf3d9bb, 0x254239, 2.1);
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight(0xffd9ad, 3.25);
  keyLight.position.set(-4.8, 8, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -10; keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10; keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xff9b74, 1.15);
  fillLight.position.set(6, 4.5, 1);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0xd18158, 20, 14, 2);
  rimLight.position.set(-3, 4.4, -5.3);
  scene.add(rimLight);

  const serviceData = [
    {
      id: "braids", label: "BRAID STATION", number: "01", service: "Braids & protective styles",
      copy: "Knotless braids, cornrows, twists and thoughtful protective styles, finished with care and made to move with you.",
      price: "FROM ₦45K · 2–6 HOURS", point: new THREE.Vector3(-3.8, 3.05, -5.9),
    },
    {
      id: "ritual", label: "WASH & CARE", number: "02", service: "Natural hair rituals",
      copy: "A proper cleanse, deep treatment and a shape that lets your natural texture breathe. The soft reset your coils deserve.",
      price: "FROM ₦28K · 1.5–3 HOURS", point: new THREE.Vector3(0, 3.05, -5.9),
    },
    {
      id: "finish", label: "THE FINISH BAR", number: "03", service: "Colour, cut & finish",
      copy: "A fresh shape, thoughtful colour or polished finish. We’ll talk through what suits your hair and your life.",
      price: "FROM ₦30K · 1–3 HOURS", point: new THREE.Vector3(3.8, 3.05, -5.9),
    },
  ];

  const hotspotNodes = serviceData.map((station) => {
    const button = document.createElement("button");
    button.className = "scene-hotspot";
    button.type = "button";
    button.setAttribute("aria-label", `Explore ${station.label.toLowerCase()}`);
    button.innerHTML = `<span class="scene-hotspot-pulse" aria-hidden="true"></span><span class="scene-hotspot-copy"><small>${station.number} / STATION</small><b>${station.label}</b></span><span class="scene-hotspot-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      hasInteracted = true;
      showStation(station);
    });
    hotspotLayer.append(button);
    return { station, button };
  });

  const sceneInfo = document.querySelector("#scene-info");
  const sceneInfoTitle = document.querySelector("#scene-info-title");
  const sceneInfoCopy = document.querySelector("#scene-info-copy");
  const sceneInfoCategory = document.querySelector("#scene-info-category");
  const sceneInfoPrice = document.querySelector("#scene-info-price");
  const sceneInfoBook = document.querySelector("#scene-info-book");
  const sceneInfoClose = document.querySelector("#scene-info-close");

  function showStation(station) {
    if (!sceneInfo) return;
    sceneInfoTitle.textContent = station.service;
    sceneInfoCopy.textContent = station.copy;
    sceneInfoCategory.textContent = `${station.number} · ${station.label}`;
    sceneInfoPrice.textContent = station.price;
    if (sceneInfoBook) sceneInfoBook.dataset.service = station.service;
    sceneInfo.hidden = false;
    sceneInfo.classList.remove("is-entering");
    requestAnimationFrame(() => sceneInfo.classList.add("is-entering"));
    playUiChime(740);
  }

  function closeStation() {
    if (!sceneInfo) return;
    sceneInfo.hidden = true;
    sceneInfo.classList.remove("is-entering");
  }
  sceneInfoClose?.addEventListener("click", closeStation);

  const tourToggle = document.querySelector("#scene-tour-toggle");
  const tourLabel = document.querySelector("#scene-tour-label");
  const hint = document.querySelector("#scene-hint");
  const moodToggle = document.querySelector("#scene-mood-toggle");
  const moodLabel = document.querySelector("#scene-mood-label");
  const audioToggle = document.querySelector("#scene-audio");
  const audioLabel = document.querySelector("#scene-audio-label");
  const narrationToggle = document.querySelector("#scene-narration");
  const narrationLabel = document.querySelector("#scene-narration-label");
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let roomToneGain = null;
  let roomToneOn = false;
  let narrationOn = false;
  const speechAvailable = "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";

  if (!AudioContextClass && audioToggle) audioToggle.hidden = true;
  if (!speechAvailable && narrationToggle) narrationToggle.hidden = true;

  function createRoomTone() {
    if (!AudioContextClass || audioContext) return;
    audioContext = new AudioContextClass();
    roomToneGain = audioContext.createGain();
    roomToneGain.gain.value = 0;
    roomToneGain.connect(audioContext.destination);

    const bed = audioContext.createGain();
    bed.gain.value = 0.34;
    bed.connect(roomToneGain);
    const lowPass = audioContext.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 520;
    lowPass.Q.value = 0.55;
    lowPass.connect(bed);
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < noiseData.length; i += 1) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      noiseData[i] = brown * 3.4;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noise.connect(lowPass);
    noise.start();

    [[110, 0.021], [164.81, 0.012]].forEach(([frequency, volume]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(roomToneGain);
      oscillator.start();
    });
  }

  async function toggleRoomTone() {
    if (!AudioContextClass) return;
    createRoomTone();
    if (audioContext.state === "suspended") await audioContext.resume();
    roomToneOn = !roomToneOn;
    roomToneGain.gain.cancelScheduledValues(audioContext.currentTime);
    roomToneGain.gain.setTargetAtTime(roomToneOn ? 0.65 : 0, audioContext.currentTime, 0.38);
    audioToggle?.setAttribute("aria-pressed", String(roomToneOn));
    audioToggle?.setAttribute("aria-label", roomToneOn ? "Mute optional ambient room tone" : "Enable optional ambient room tone");
    if (audioLabel) audioLabel.textContent = roomToneOn ? "ROOM TONE ON" : "ROOM TONE OFF";
    if (roomToneOn) playUiChime(620);
  }

  function playUiChime(frequency = 620) {
    if (!roomToneOn || !audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.018, audioContext.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  audioToggle?.addEventListener("click", toggleRoomTone);

  function stopNarration() {
    if (!speechAvailable) return;
    window.speechSynthesis.cancel();
    narrationOn = false;
    narrationToggle?.setAttribute("aria-pressed", "false");
    narrationToggle?.setAttribute("aria-label", "Listen to the salon story");
    if (narrationLabel) narrationLabel.textContent = "HEAR THE STORY";
  }

  narrationToggle?.addEventListener("click", () => {
    if (!speechAvailable) return;
    if (narrationOn) { stopNarration(); return; }
    const story = new SpeechSynthesisUtterance("Welcome to The Crown Room, a Lagos hair house made for care, good energy and every kind of crown. To your left, the braid station for protective styles. In the centre, wash and care for your natural texture. To your right, the finish bar for fresh cuts and colour. Take your time, explore the room, and choose a ritual that feels like you.");
    story.lang = "en-NG";
    story.rate = 0.92;
    story.pitch = 1.02;
    const voices = window.speechSynthesis.getVoices();
    story.voice = voices.find((voice) => /^en[-_]NG/i.test(voice.lang)) || voices.find((voice) => /^en[-_]GB/i.test(voice.lang)) || null;
    story.onend = stopNarration;
    story.onerror = stopNarration;
    narrationOn = true;
    narrationToggle.setAttribute("aria-pressed", "true");
    narrationToggle.setAttribute("aria-label", "Stop the salon story narration");
    if (narrationLabel) narrationLabel.textContent = "STOP THE STORY";
    window.speechSynthesis.speak(story);
    playUiChime(710);
  });

  const scene360Toggle = document.querySelector("#scene-360");
  function setTourState(exploring) {
    hero.classList.toggle("is-exploring", exploring);
    tourToggle?.setAttribute("aria-pressed", String(exploring));
    tourToggle?.setAttribute("aria-label", exploring ? (in360View ? "Exit panoramic salon view" : "Exit the 3D salon tour") : "Start the 3D salon tour");
    if (tourLabel) tourLabel.textContent = exploring ? (in360View ? "Exit 360° view" : "Exit the salon tour") : "Explore the salon";
    if (hint) hint.innerHTML = in360View
      ? "DRAG TO LOOK ALL AROUND <i>·</i> 360° SALON VIEW"
      : exploring ? "SELECT A STATION TO TAKE A CLOSER LOOK <i>·</i> DRAG TO ORBIT" : "DRAG TO LOOK AROUND <i>·</i> WHEEL TO ZOOM";
    if (!exploring) closeStation();
  }

  tourToggle?.addEventListener("click", () => {
    hasInteracted = true;
    if (in360View) { exit360View(); return; }
    setTourState(!hero.classList.contains("is-exploring"));
    playUiChime(590);
  });

  moodToggle?.addEventListener("click", () => {
    hasInteracted = true;
    afterDark = !afterDark;
    hero.classList.toggle("is-after-dark", afterDark);
    moodToggle.setAttribute("aria-pressed", String(afterDark));
    moodToggle.setAttribute("aria-label", afterDark ? "Switch to daylight lighting" : "Switch to after-dark lighting");
    if (moodLabel) moodLabel.textContent = afterDark ? "AFTER DARK" : "DAYLIGHT";
    const targetColor = new THREE.Color(afterDark ? 0x111c25 : 0x1a2d27);
    scene.background.copy(targetColor);
    scene.fog.color.copy(targetColor);
    keyLight.color.setHex(afterDark ? 0xd0b0dc : 0xffd9ad);
    keyLight.intensity = afterDark ? 2.15 : 3.25;
    fillLight.color.setHex(afterDark ? 0xd0769d : 0xff9b74);
    fillLight.intensity = afterDark ? 2.1 : 1.15;
    hemisphere.color.setHex(afterDark ? 0xaaa4cf : 0xf3d9bb);
    pendantLights.forEach((light) => {
      light.color.setHex(afterDark ? 0xff9cb0 : 0xffce90);
      light.intensity = afterDark ? 68 : 50;
    });
    playUiChime(afterDark ? 510 : 660);
  });

  function exit360View() {
    if (!in360View) return;
    in360View = false;
    hero.classList.remove("is-360");
    scene360Toggle?.setAttribute("aria-pressed", "false");
    scene360Toggle?.setAttribute("aria-label", "Enter 360-degree salon view");
    cameraTarget.copy(defaultCameraTarget);
    targetYaw = defaultView.yaw;
    targetPitch = defaultView.pitch;
    targetDistance = initialDistance;
    setTourState(restoreTourAfter360);
    playUiChime(480);
  }

  function enter360View() {
    if (in360View) return;
    restoreTourAfter360 = hero.classList.contains("is-exploring");
    in360View = true;
    hasInteracted = true;
    hero.classList.add("is-360");
    scene360Toggle?.setAttribute("aria-pressed", "true");
    scene360Toggle?.setAttribute("aria-label", "Exit 360-degree salon view");
    cameraTarget.copy(panoramicCameraTarget);
    targetYaw = 0;
    targetPitch = 0.04;
    targetDistance = 5.5;
    setTourState(true);
    closeStation();
    playUiChime(480);
  }

  scene360Toggle?.addEventListener("click", () => in360View ? exit360View() : enter360View());

  function resetView() {
    if (in360View) exit360View();
    hasInteracted = false;
    cameraTarget.copy(defaultCameraTarget);
    targetYaw = defaultView.yaw;
    targetPitch = defaultView.pitch;
    targetDistance = initialDistance;
    closeStation();
  }
  document.querySelector("#scene-reset")?.addEventListener("click", resetView);
  function clampZoom(value) {
    return THREE.MathUtils.clamp(value, in360View ? 3.7 : 9.2, in360View ? 8.2 : 20.5);
  }
  document.querySelector("#scene-zoom-in")?.addEventListener("click", () => {
    hasInteracted = true;
    targetDistance = clampZoom(targetDistance - 1.2);
  });
  document.querySelector("#scene-zoom-out")?.addEventListener("click", () => {
    hasInteracted = true;
    targetDistance = clampZoom(targetDistance + 1.2);
  });

  const fullscreenButton = document.querySelector("#scene-fullscreen");
  function syncFullscreenState() {
    const isFull = document.fullscreenElement === hero || hero.classList.contains("is-immersive");
    document.body.classList.toggle("immersive-open", isFull);
    fullscreenButton?.setAttribute("aria-pressed", String(isFull));
    fullscreenButton?.setAttribute("aria-label", isFull ? "Exit immersive full-screen view" : "Enter immersive full-screen view");
    if (fullscreenButton) fullscreenButton.textContent = isFull ? "⤢" : "⛶";
    updateRenderLoop();
  }
  fullscreenButton?.addEventListener("click", async () => {
    hasInteracted = true;
    if (document.fullscreenElement === hero) {
      await document.exitFullscreen?.();
      return;
    }
    if (hero.classList.contains("is-immersive")) {
      hero.classList.remove("is-immersive");
      syncFullscreenState();
      return;
    }
    try {
      if (hero.requestFullscreen) await hero.requestFullscreen();
      else throw new Error("Fullscreen API unavailable");
    } catch {
      hero.classList.add("is-immersive");
      syncFullscreenState();
    }
  });
  document.addEventListener("fullscreenchange", syncFullscreenState);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && hero.classList.contains("is-immersive")) {
      hero.classList.remove("is-immersive");
      syncFullscreenState();
    }
  });

  const vrButton = document.querySelector("#scene-vr");
  if (!navigator.xr?.isSessionSupported) {
    if (vrButton) vrButton.hidden = true;
  } else {
    navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
      if (vrButton) vrButton.hidden = !supported;
    }).catch(() => { if (vrButton) vrButton.hidden = true; });
    vrButton?.addEventListener("click", async () => {
      try {
        if (!in360View) enter360View();
        const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
        renderer.xr.setReferenceSpaceType("local-floor");
        await renderer.xr.setSession(session);
        updateRenderLoop();
        session.addEventListener("end", () => {
          if (in360View) exit360View();
          updateRenderLoop();
        });
      } catch (error) {
        console.warn("VR is not available in this browser session.", error);
      }
    });
  }

  function resizeScene() {
    const width = Math.max(1, hero.clientWidth);
    const height = Math.max(1, hero.clientHeight);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < 0.7 ? 49 : aspect < 1.15 ? 46 : 42;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, aspect < 0.7 ? 1.25 : 1.6));
    renderer.setSize(width, height, false);
    initialDistance = aspect < 0.7 ? 17.2 : aspect < 1.15 ? 16.3 : 14.8;
    if (!hasInteracted) {
      distance = initialDistance;
      targetDistance = initialDistance;
    }
  }

  const resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(hero);
  window.addEventListener("resize", resizeScene, { passive: true });
  const updateCinematicScroll = () => {
    heroScrollProgress = THREE.MathUtils.clamp(-hero.getBoundingClientRect().top / Math.max(1, hero.clientHeight), 0, 1);
  };
  window.addEventListener("scroll", updateCinematicScroll, { passive: true });
  updateCinematicScroll();
  resizeScene();

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    hasInteracted = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture?.(event.pointerId);
  });
  function wrap360(angle) {
    return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
  }
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - previousPointer.x;
    const deltaY = event.clientY - previousPointer.y;
    targetYaw = in360View ? wrap360(targetYaw + deltaX * 0.0045) : THREE.MathUtils.clamp(targetYaw + deltaX * 0.0045, -0.78, 0.78);
    targetPitch = THREE.MathUtils.clamp(targetPitch + deltaY * 0.0023, in360View ? -0.42 : -0.08, in360View ? 0.58 : 0.33);
    previousPointer = { x: event.clientX, y: event.clientY };
  });
  const endDrag = () => {
    dragging = false;
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    hasInteracted = true;
    targetDistance = clampZoom(targetDistance + event.deltaY * 0.008);
  }, { passive: false });
  canvas.addEventListener("keydown", (event) => {
    const step = 0.08;
    if (event.key === "ArrowLeft") targetYaw = in360View ? wrap360(targetYaw - step) : THREE.MathUtils.clamp(targetYaw - step, -0.78, 0.78);
    else if (event.key === "ArrowRight") targetYaw = in360View ? wrap360(targetYaw + step) : THREE.MathUtils.clamp(targetYaw + step, -0.78, 0.78);
    else if (event.key === "ArrowUp") targetPitch = THREE.MathUtils.clamp(targetPitch - step, in360View ? -0.42 : -0.08, in360View ? 0.58 : 0.33);
    else if (event.key === "ArrowDown") targetPitch = THREE.MathUtils.clamp(targetPitch + step, in360View ? -0.42 : -0.08, in360View ? 0.58 : 0.33);
    else if (event.key === "+" || event.key === "=") targetDistance = clampZoom(targetDistance - 1);
    else if (event.key === "-") targetDistance = clampZoom(targetDistance + 1);
    else if (event.key === "Home") resetView();
    else return;
    event.preventDefault();
    hasInteracted = true;
  });

  function positionHotspots() {
    const bounds = hero.getBoundingClientRect();
    const projections = hotspotNodes.map(({ station, button }) => {
      const projected = station.point.clone().project(camera);
      const x = (projected.x * 0.5 + 0.5) * bounds.width;
      const y = (-projected.y * 0.5 + 0.5) * bounds.height;
      const visible = projected.z > -1 && projected.z < 1 && projected.x > -0.78 && projected.x < 0.78 && projected.y > -0.84 && projected.y < 0.84;
      return { button, x, y, visible };
    });
    const inFrame = projections.filter((item) => item.visible);
    const mobileFocus = bounds.width < 650
      ? inFrame.sort((a, b) => Math.abs(a.x - bounds.width / 2) - Math.abs(b.x - bounds.width / 2))[0]
      : null;
    for (const item of projections) {
      const visible = item.visible && (bounds.width >= 650 || item === mobileFocus);
      item.button.hidden = !visible;
      if (visible) {
        item.button.style.left = `${item.x}px`;
        item.button.style.top = `${item.y}px`;
      }
    }
  }

  function animate(now = performance.now()) {
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!hasInteracted && !reducedMotion.matches) {
      if (heroScrollProgress > 0.025) {
        targetYaw = defaultView.yaw + heroScrollProgress * 0.24 + Math.sin(now * 0.00012) * 0.018;
        targetPitch = defaultView.pitch + heroScrollProgress * 0.065;
      } else {
        targetYaw = defaultView.yaw + Math.sin(now * 0.00018) * 0.115;
        targetPitch = defaultView.pitch + Math.sin(now * 0.00012) * 0.018;
      }
    }
    yaw = THREE.MathUtils.damp(yaw, targetYaw, dragging ? 12 : 3.5, delta);
    pitch = THREE.MathUtils.damp(pitch, targetPitch, 3.5, delta);
    distance = THREE.MathUtils.damp(distance, targetDistance, 3.2, delta);
    if (renderer.xr.isPresenting) {
      // In local-floor VR, keep the viewer at floor level in the salon so headset height feels natural.
      camera.position.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
    } else {
      const sinPhi = Math.sin(Math.PI / 2 - pitch);
      camera.position.set(
        cameraTarget.x + distance * Math.sin(yaw) * sinPhi,
        cameraTarget.y + distance * Math.sin(pitch),
        cameraTarget.z + distance * Math.cos(yaw) * sinPhi,
      );
      camera.lookAt(cameraTarget);
    }
    dust.rotation.y += delta * 0.004;
    positionHotspots();
    renderer.render(scene, camera);
  }

  function updateRenderLoop() {
    const immersiveVisible = renderer.xr.isPresenting || document.fullscreenElement === hero || hero.classList.contains("is-immersive");
    renderer.setAnimationLoop((sceneVisible || immersiveVisible) && pageVisible ? animate : null);
  }
  if ("IntersectionObserver" in window) {
    const sceneVisibilityObserver = new IntersectionObserver((entries) => {
      sceneVisible = entries.some((entry) => entry.isIntersecting);
      updateRenderLoop();
    }, { threshold: 0.01 });
    sceneVisibilityObserver.observe(hero);
  }
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden || renderer.xr.isPresenting;
    updateRenderLoop();
  });

  requestAnimationFrame(() => {
    hero.classList.add("scene-ready");
    if (loading) loading.hidden = true;
    updateRenderLoop();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    hero.classList.add("scene-fallback");
  });
}
