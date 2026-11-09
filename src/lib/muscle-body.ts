import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface MuscleMesh { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; target: string; }
async function loadAsset() {
  const response = await fetch("/models/anatomy/body-optimized.glb");
  if (!response.ok) throw Error("Anatomy model unavailable");
  return response.arrayBuffer();
}
const tissueColors = ["#822a36", "#932d3e", "#9b3442", "#872633", "#a33c48", "#8d3040", "#96313b"];

// Map the asset's named structures to training regions. No skin-coordinate approximations.
const targets: Record<string, string> = {
  deltoid_anterior: "front-delts", deltoid_lateral: "side-delts", deltoid_posterior: "rear-delts",
  pectoralis_major_clavicular: "upper-chest", pectoralis_major_sternocostal: "middle-chest", pectoralis_major_abdominal: "lower-chest",
  trapezius_upper: "upper-traps", trapezius_middle: "middle-back", trapezius_lower: "middle-back",
  rhomboid_major: "middle-back", rhomboid_minor: "middle-back", latissimus_dorsi: "lats",
  iliocostalis_lumborum: "lower-back", iliocostalis_thoracis: "lower-back", longissimus_thoracis: "lower-back",
  spinalis_thoracis: "lower-back", multifidus_lumborum: "lower-back", quadratus_lumborum: "lower-back",
  rectus_abdominis: "rectus-abdominis", external_oblique: "obliques", internal_oblique: "obliques",
  biceps_brachii_long: "biceps-long-head", biceps_brachii_short: "biceps-short-head", brachialis: "brachialis",
  triceps_long: "triceps-long-head", triceps_lateral: "triceps-lateral-head", triceps_medial: "triceps-medial-head",
  rectus_femoris: "quads", vastus_lateralis: "quads", vastus_medialis: "quads", vastus_intermedius: "quads",
  biceps_femoris_long: "hamstrings", biceps_femoris_short: "hamstrings", semitendinosus: "hamstrings", semimembranosus: "hamstrings",
  adductor_magnus: "hip-adductors", adductor_longus: "hip-adductors", adductor_brevis: "hip-adductors", gracilis: "hip-adductors", pectineus: "hip-adductors",
  gluteus_maximus: "glute-max", gluteus_medius: "hip-abductors", gluteus_minimus: "hip-abductors", tensor_fasciae_latae: "hip-abductors",
  gastrocnemius_lateral: "gastrocnemius", gastrocnemius_medial: "gastrocnemius", soleus: "soleus",
};
function targetFor(key: string, region: string) {
  if (targets[key]) return targets[key];
  if (region === "forearms") return /extensor|supinator|abductor/.test(key) ? "forearm-extensors" : "forearm-flexors";
  return "";
}
const rearTargets = new Set(["upper-traps", "middle-back", "lower-back", "lats", "rear-delts", "triceps-long-head", "triceps-lateral-head", "triceps-medial-head", "forearm-extensors", "glute-max", "hamstrings", "gastrocnemius", "soleus"]);

function prepareMuscleBody() {
  const body = new THREE.Group(), anchors = new Map<string, THREE.Vector3>();
  const ready = loadAsset().then(async buffer => {
    const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, "");
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene), size = bounds.getSize(new THREE.Vector3());
    const scale = 4.8 / size.y;
    const center = bounds.getCenter(new THREE.Vector3());
    const normalize = new THREE.Matrix4().makeScale(scale, scale, scale);
    normalize.setPosition(-center.x * scale, -2.3 - bounds.min.y * scale, -center.z * scale);
    const regions = new Map<string, THREE.Box3>();
    const oldMaterials = new Set<THREE.Material>();
    let triangles = 0;
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) oldMaterials.add(material);
      const bone = sourceMaterial.name.includes("bone"), connective = sourceMaterial.name.includes("connective");
      const geometry = object.geometry;
      // Meshopt quantizes these attributes. Baking metre-space transforms into
      // normalized integer buffers would clamp vertices and deform the body.
      for (const name of ["position", "normal"]) {
        const attribute = geometry.getAttribute(name);
        if (!attribute) continue;
        const values = new Float32Array(attribute.count * 3);
        for (let index = 0; index < attribute.count; index++) {
          values[index * 3] = attribute.getX(index);
          values[index * 3 + 1] = attribute.getY(index);
          values[index * 3 + 2] = attribute.getZ(index);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
      }
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, object.matrixWorld));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const key = String(object.userData.key ?? "");
      const target = targetFor(key, String(object.userData.region ?? ""));
      const tint = key.split("").reduce((value, letter) => value + letter.charCodeAt(0), 0) % 7;
      const baseColor = bone ? "#e1d6bd" : connective ? "#bba89a" : tissueColors[tint];
      const material = new THREE.MeshStandardMaterial({ color: baseColor, metalness: 0, roughness: bone ? .75 : .57 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = object.name; mesh.userData = { ...object.userData, target, baseColor: material.color.clone() };
      mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh);
      if (target) {
        if (object.userData.side === "left" && geometry.boundingBox) {
          if (!regions.has(target)) regions.set(target, new THREE.Box3());
          regions.get(target)!.union(geometry.boundingBox);
        }
      }
      triangles += (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
    });
    oldMaterials.forEach(material => material.dispose());
    // Keep distinct training regions selectable while batching their constituent
    // structures into a single draw call. Neutral tissue is batched by color.
    const batches = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[]>();
    for (const child of body.children) {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      const batch = mesh.userData.target || mesh.material.color.getHexString();
      if (!batches.has(batch)) batches.set(batch, []);
      batches.get(batch)!.push(mesh);
    }
    body.clear();
    for (const sources of batches.values()) {
      const first = sources[0];
      const geometry = sources.length === 1 ? first.geometry : mergeGeometries(sources.map(mesh => mesh.geometry));
      if (!geometry) throw Error("Unable to prepare anatomical geometry");
      const mesh = new THREE.Mesh(geometry, first.material);
      mesh.userData = first.userData; mesh.castShadow = true; mesh.receiveShadow = true;
      body.add(mesh);
      for (const source of sources) {
        if (source.geometry !== geometry) source.geometry.dispose();
        if (source.material !== first.material) source.material.dispose();
      }
    }
    for (const [target, box] of regions) {
      const point = box.getCenter(new THREE.Vector3());
      point.z = rearTargets.has(target) ? box.min.z : box.max.z;
      anchors.set(target, point);
    }
    body.userData.model = "z-anatomy"; body.userData.triangles = triangles;
  });
  return { body, anchors, ready };
}

let prepared: Promise<ReturnType<typeof prepareMuscleBody>> | null = null;
export function createMuscleBody(signal?: AbortSignal) {
  const body = new THREE.Group(), muscles: MuscleMesh[] = [], anchors = new Map<string, THREE.Vector3>();
  if (!prepared) {
    const template = prepareMuscleBody();
    prepared = template.ready.then(() => template).catch(error => { prepared = null; throw error; });
  }
  const ready = prepared.then(template => {
    if (signal?.aborted) return;
    for (const child of template.body.children) {
      const source = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      const mesh = new THREE.Mesh(source.geometry, source.material.clone());
      mesh.userData = { ...source.userData, sharedAnatomyGeometry: true, baseColor: source.userData.baseColor.clone() };
      mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh);
      if (mesh.userData.target) muscles.push({ mesh, target: mesh.userData.target });
    }
    template.anchors.forEach((point, target) => anchors.set(target, point.clone()));
    body.userData = { ...template.body.userData };
  });
  return { body, muscles, anchors, ready };
}
