import React from "https://esm.sh/react@18.2.0";
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls";
import { generateOrbitVertices } from "../data/orbitMath.js";

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 8, 24);

function ensureBodyMesh(body, context) {
  let mesh = context.meshes.get(body.name);
  if (mesh) {
    return mesh;
  }

  const geometry = new THREE.SphereGeometry(body.radius || 0.05, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(body.color || "#ffffff"),
    emissive: body.isLightSource
      ? new THREE.Color(body.color || "#ffffff")
      : new THREE.Color("#000000"),
    emissiveIntensity: body.isLightSource ? 0.6 : 0.05,
    roughness: 0.65,
    metalness: 0.1,
  });

  mesh = new THREE.Mesh(geometry, material);
  mesh.name = body.name;
  context.scene.add(mesh);
  context.meshes.set(body.name, mesh);

  if (body.isLightSource && context.sunLight) {
    context.sunLight.color = new THREE.Color(body.color || "#ffffff");
  }

  return mesh;
}

function ensureOrbitLine(body, context, scale) {
  if (!body.orbit) {
    return null;
  }
  let line = context.orbits.get(body.name);
  if (line) {
    return line;
  }

  const vertices = generateOrbitVertices(body.orbit, 256).flatMap((point) => [
    point.x * scale,
    point.y * scale,
    point.z * scale,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(body.color || "#aaaaaa"),
    transparent: true,
    opacity: 0.35,
  });
  line = new THREE.LineLoop(geometry, material);
  context.scene.add(line);
  context.orbits.set(body.name, line);
  return line;
}

export default function OrbitScene({ bodies, scale = 10, viewTarget }) {
  const containerRef = React.useRef(null);
  const contextRef = React.useRef(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return () => {};
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b1a);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      5000
    );
    camera.position.copy(INITIAL_CAMERA_POSITION);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 600;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 4, 0, 2);
    scene.add(sunLight);

    const grid = new THREE.PolarGridHelper(200, 16, 8, 64, 0x0c1b3a, 0x0f2c52);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    const meshes = new Map();
    const orbits = new Map();

    contextRef.current = {
      scene,
      renderer,
      camera,
      controls,
      ambientLight,
      sunLight,
      meshes,
      orbits,
      frameId: null,
    };

    function handleResize() {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", handleResize);

    function animate() {
      controls.update();
      renderer.render(scene, camera);
      contextRef.current.frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (contextRef.current?.frameId) {
        cancelAnimationFrame(contextRef.current.frameId);
      }
      renderer.dispose();
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      orbits.forEach((line) => {
        line.geometry.dispose();
        line.material.dispose();
      });
      container.removeChild(renderer.domElement);
      contextRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    bodies.forEach((body) => {
      const mesh = ensureBodyMesh(body, context);
      mesh.position.set(
        body.position.x * scale,
        body.position.y * scale,
        body.position.z * scale
      );
      if (body.isLightSource && context.sunLight) {
        context.sunLight.position.copy(mesh.position);
        context.sunLight.intensity = 6;
      }
    });

    bodies.forEach((body) => {
      if (!body.orbit) {
        return;
      }
      const line = ensureOrbitLine(body, context, scale);
      const parentMesh = context.meshes.get(body.orbit.parent);
      if (line) {
        if (parentMesh) {
          line.position.copy(parentMesh.position);
        } else {
          line.position.set(0, 0, 0);
        }
      }
    });
  }, [bodies, scale]);

  React.useEffect(() => {
    const context = contextRef.current;
    if (!context) {
      return;
    }
    const mesh = context.meshes.get(viewTarget);
    if (mesh) {
      context.controls.target.copy(mesh.position);
    }
  }, [viewTarget, bodies]);

  return React.createElement("div", { ref: containerRef, className: "scene-container" });
}
