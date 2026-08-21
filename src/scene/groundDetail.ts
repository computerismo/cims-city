import * as THREE from 'three';
import type { MaterialPalette } from './materials';

// European city block grid layout
// Main avenues run east-west and north-south
// Side streets create rectangular blocks
//
// Ground stack layering (world y). Clearing platforms top out at y=0.175, so
// every paved surface sits above it with a distinct top height — nothing is
// coplanar with the platforms or with each other, which keeps the network
// fully visible and free of z-fighting at intersections.
//   plazas (0.34) > sidewalks (avenue top + 0.07) > curbs (+0.05)
//   > avenues (0.250..0.235, stepped per street) > side streets (0.22)
//   > planted areas (0.28 sits between sidewalk and plaza tiers)

interface StreetSegment {
  from: readonly [number, number];
  to: readonly [number, number];
  width: number;
  name: string;
  top: number;
}

// Shared road base: reaches below the terrain plateau (-0.05) so roads embed
// into platforms and stay grounded on open terrain between districts.
const ROAD_BASE = -0.1;

// Main avenues (wide, 4-6 units). Tops step by 5mm per street so overlapping
// intersections never place two road surfaces at the same height.
const MAIN_AVENUES: readonly StreetSegment[] = [
  // East-West main avenue through CiMS
  { from: [-80, -20], to: [40, -20], width: 5, name: 'CiMS Avenue', top: 0.25 },
  // North-South main avenue through CiMS
  { from: [-30, -60], to: [-30, 40], width: 5, name: 'Research Boulevard', top: 0.245 },
  // East-West avenue south of CiMS
  { from: [-80, 15], to: [40, 15], width: 4, name: 'Innovation Street', top: 0.24 },
  // North-South avenue east of CiMS
  { from: [10, -60], to: [10, 40], width: 4, name: 'Technology Drive', top: 0.235 },
];

// Side streets (narrower, 2-3 units), below every avenue top
const SIDE_STREETS: readonly StreetSegment[] = [
  // Horizontal side streets creating blocks
  { from: [-60, -40], to: [20, -40], width: 2.5, name: 'Block Street 1', top: 0.22 },
  { from: [-60, -5], to: [20, -5], width: 2.5, name: 'Block Street 2', top: 0.22 },
  { from: [-60, 30], to: [20, 30], width: 2.5, name: 'Block Street 3', top: 0.22 },
  // Vertical side streets
  { from: [-55, -50], to: [-55, 30], width: 2.5, name: 'Block Street 4', top: 0.22 },
  { from: [-10, -50], to: [-10, 30], width: 2.5, name: 'Block Street 5', top: 0.22 },
  { from: [25, -50], to: [25, 30], width: 2.5, name: 'Block Street 6', top: 0.22 },
];

// Connector causeways linking the central grid to every outer district so the
// street network reads as one integrated city.
const CONNECTORS: readonly StreetSegment[] = [
  // CiMS Avenue east, then south onto the new-zema campus
  { from: [40, -20], to: [65, -20], width: 4, name: 'New Zema Causeway', top: 0.25 },
  { from: [65, -20], to: [65, -45], width: 4, name: 'New Zema Approach', top: 0.25 },
  // Innovation Street east, then north onto the hycatt campus
  { from: [40, 15], to: [75, 15], width: 4, name: 'Hycatt Causeway', top: 0.25 },
  { from: [75, 15], to: [75, 35], width: 4, name: 'Hycatt Approach', top: 0.25 },
  // Research Boulevard west, then north onto the uds campus
  { from: [-80, -20], to: [-100, -20], width: 4, name: 'UDS Causeway', top: 0.25 },
  { from: [-100, -20], to: [-100, 85], width: 4, name: 'UDS Approach', top: 0.25 },
  // Research Boulevard north onto the htw-saar campus
  { from: [-30, 40], to: [-30, 85], width: 4, name: 'HTW Saar Approach', top: 0.25 },
];

// Plazas at key intersections
interface Plaza {
  position: readonly [number, number];
  size: readonly [number, number];
  name: string;
}

const PLAZAS: readonly Plaza[] = [
  { position: [-30, -20], size: [20, 16], name: 'Central Plaza' },
  { position: [10, -20], size: [14, 12], name: 'East Plaza' },
  { position: [-30, 15], size: [16, 12], name: 'South Plaza' },
  { position: [10, 15], size: [12, 10], name: 'Technology Plaza' },
];

const disposedDetail = new WeakSet<THREE.Group>();

function addRoadSlab(
  root: THREE.Group,
  segment: StreetSegment,
  material: THREE.Material,
  name: string,
): void {
  const dx = segment.to[0] - segment.from[0];
  const dz = segment.to[1] - segment.from[1];
  const length = Math.hypot(dx, dz);
  if (length === 0) return;

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(length, segment.top - ROAD_BASE, segment.width),
    material,
  );
  road.position.set(
    (segment.from[0] + segment.to[0]) / 2,
    (segment.top + ROAD_BASE) / 2,
    (segment.from[1] + segment.to[1]) / 2,
  );
  road.rotation.y = -Math.atan2(dz, dx);
  road.receiveShadow = true;
  road.name = name;
  root.add(road);
}

export function createGroundDetail(palette: MaterialPalette): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ground-detail';

  // Create main avenues with sidewalks and curbs layered above each road top
  for (let i = 0; i < MAIN_AVENUES.length; i++) {
    const avenue = MAIN_AVENUES[i]!;
    addRoadSlab(root, avenue, palette.road, `avenue:${i}`);

    const dx = avenue.to[0] - avenue.from[0];
    const dz = avenue.to[1] - avenue.from[1];
    const cx = (avenue.from[0] + avenue.to[0]) / 2;
    const cz = (avenue.from[1] + avenue.to[1]) / 2;
    const sidewalkTop = avenue.top + 0.07;
    const curbTop = avenue.top + 0.05;

    // Sidewalks on both sides
    for (const side of [-1, 1]) {
      const sidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(Math.hypot(dx, dz), sidewalkTop - ROAD_BASE, 2.0),
        palette.sidewalk,
      );
      sidewalk.position.set(cx, (sidewalkTop + ROAD_BASE) / 2, cz + (avenue.width / 2 + 1.0) * side);
      sidewalk.rotation.y = -Math.atan2(dz, dx);
      sidewalk.receiveShadow = true;
      sidewalk.name = `sidewalk:avenue:${i}:${side > 0 ? 'right' : 'left'}`;
      root.add(sidewalk);

      // Curb
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(Math.hypot(dx, dz), curbTop - ROAD_BASE, 0.15),
        palette.curb,
      );
      curb.position.set(cx, (curbTop + ROAD_BASE) / 2, cz + (avenue.width / 2 + 0.075) * side);
      curb.rotation.y = -Math.atan2(dz, dx);
      curb.receiveShadow = true;
      curb.name = `curb:avenue:${i}:${side > 0 ? 'right' : 'left'}`;
      root.add(curb);
    }
  }

  // Create side streets
  for (let i = 0; i < SIDE_STREETS.length; i++) {
    addRoadSlab(root, SIDE_STREETS[i]!, palette.road, `street:${i}`);
  }

  // Create connector causeways to the outer districts
  for (let i = 0; i < CONNECTORS.length; i++) {
    addRoadSlab(root, CONNECTORS[i]!, palette.road, `connector:${i}`);
  }

  // Create plazas (top tier of the ground stack)
  for (let i = 0; i < PLAZAS.length; i++) {
    const plaza = PLAZAS[i]!;
    const plazaMesh = new THREE.Mesh(
      new THREE.BoxGeometry(plaza.size[0], 0.34 - ROAD_BASE, plaza.size[1]),
      palette.pavement,
    );
    plazaMesh.position.set(plaza.position[0], (0.34 + ROAD_BASE) / 2, plaza.position[1]);
    plazaMesh.receiveShadow = true;
    plazaMesh.name = `plaza:${i}`;
    root.add(plazaMesh);
  }

  // Create planted areas in blocks between streets
  const plantedAreas: Array<{ pos: [number, number]; size: [number, number] }> = [
    { pos: [-42, -30], size: [12, 8] },
    { pos: [-42, 5], size: [12, 8] },
    { pos: [-18, -30], size: [12, 8] },
    { pos: [-18, 5], size: [12, 8] },
    { pos: [16, -30], size: [8, 8] },
    { pos: [16, 5], size: [8, 8] },
    { pos: [-42, 22], size: [12, 6] },
    { pos: [-18, 22], size: [12, 6] },
  ];

  for (let i = 0; i < plantedAreas.length; i++) {
    const area = plantedAreas[i]!;
    const patch = new THREE.Mesh(
      new THREE.BoxGeometry(area.size[0], 0.28 - ROAD_BASE, area.size[1]),
      palette.grass,
    );
    patch.position.set(area.pos[0], (0.28 + ROAD_BASE) / 2, area.pos[1]);
    patch.receiveShadow = true;
    patch.name = `planted:${i}`;
    root.add(patch);
  }

  // Add benches along streets (legs reach down into any surface tier)
  const benchPositions: Array<{ position: readonly [number, number, number]; rotation: number }> = [
    { position: [-30, 0, -22], rotation: 0 },
    { position: [10, 0, -22], rotation: 0 },
    { position: [-30, 0, 20], rotation: 0 },
    { position: [10, 0, 20], rotation: 0 },
  ];

  for (let i = 0; i < benchPositions.length; i++) {
    const bench = benchPositions[i]!;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.08, 0.5),
      palette.darkMetal,
    );
    seat.position.set(bench.position[0], 0.79, bench.position[2]);
    seat.rotation.y = bench.rotation;
    seat.castShadow = true;
    seat.name = `bench:seat:${i}`;
    root.add(seat);

    for (let leg = 0; leg < 2; leg++) {
      const legMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.6, 0.08),
        palette.darkMetal,
      );
      legMesh.position.set(
        bench.position[0] + (leg === 0 ? -0.6 : 0.6) * Math.cos(bench.rotation),
        0.45,
        bench.position[2] + (leg === 0 ? -0.6 : 0.6) * Math.sin(bench.rotation),
      );
      legMesh.rotation.y = bench.rotation;
      legMesh.castShadow = true;
      legMesh.name = `bench:leg:${i}:${leg}`;
      root.add(legMesh);
    }
  }

  // Add lampposts along streets
  const lamppostPositions: Array<readonly [number, number, number]> = [
    [-30, 0, -28],
    [10, 0, -28],
    [-30, 0, 22],
    [10, 0, 22],
    [-55, 0, -5],
    [25, 0, -5],
  ];

  for (let i = 0; i < lamppostPositions.length; i++) {
    const pos = lamppostPositions[i]!;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 3.55, 6),
      palette.darkMetal,
    );
    post.position.set(pos[0], 0.15 + 3.55 / 2, pos[2]);
    post.castShadow = true;
    post.name = `lamppost:post:${i}`;
    root.add(post);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 6, 4),
      palette.selectionEdge,
    );
    light.position.set(pos[0], 3.8, pos[2]);
    light.name = `lamppost:light:${i}`;
    root.add(light);
  }

  disposedDetail.add(root);
  return root;
}

export function disposeGroundDetail(detail: THREE.Group): void {
  if (!disposedDetail.has(detail)) return;
  disposedDetail.delete(detail);
  detail.traverse((child) => {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  });
  detail.removeFromParent();
}
