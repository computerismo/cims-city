import * as THREE from 'three';

export interface MaterialPalette {
  ground: THREE.MeshStandardMaterial;
  path: THREE.MeshStandardMaterial;
  groupShell: THREE.MeshStandardMaterial;
  thermalShell: THREE.MeshStandardMaterial;
  polymerShell: THREE.MeshStandardMaterial;
  electronicsShell: THREE.MeshStandardMaterial;
  textileShell: THREE.MeshStandardMaterial;
  smaShell: THREE.MeshStandardMaterial;
  civicHub: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  thermalWarm: THREE.MeshStandardMaterial;
  thermalCool: THREE.MeshStandardMaterial;
  polymer: THREE.MeshStandardMaterial;
  electronics: THREE.MeshStandardMaterial;
  textile: THREE.MeshStandardMaterial;
  sma: THREE.MeshStandardMaterial;
  context: THREE.MeshStandardMaterial;
  selectionEdge: THREE.MeshStandardMaterial;
  land: THREE.MeshStandardMaterial;
  clearing: THREE.MeshStandardMaterial;
  districtAccent: THREE.MeshStandardMaterial;
  routeActive: THREE.MeshStandardMaterial;
  routePreview: THREE.MeshStandardMaterial;
  routeMuted: THREE.MeshStandardMaterial;
  pavement: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  curb: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  road: THREE.MeshStandardMaterial;
  landDark: THREE.MeshStandardMaterial;
}

const disposedPalettes = new WeakSet<MaterialPalette>();

function createMaterial(
  color: string,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...options });
}

export function createMaterialPalette(): MaterialPalette {
  return {
    // Neutral palette with engineering accent colors (PBR roughness/metalness per role)
    ground: createMaterial('#899c76', { roughness: 1 }),  // matte grey-green ground
    path: createMaterial('#b8bcb4', { roughness: 0.95 }),  // neutral path
    groupShell: createMaterial('#cec7b9', { roughness: 0.72 }),  // warm greige shells (city fabric)
    thermalShell: createMaterial('#e3b89a', { roughness: 0.72 }),  // warm sand (thermal district)
    polymerShell: createMaterial('#d4b8d4', { roughness: 0.72 }),  // pale mauve (polymer district)
    electronicsShell: createMaterial('#b4c2d6', { roughness: 0.72 }),  // pale steel blue (electronics district)
    textileShell: createMaterial('#d8bc9c', { roughness: 0.72 }),  // pale tan (textile district)
    smaShell: createMaterial('#c2d2ae', { roughness: 0.72 }),  // pale sage (sma district)
    civicHub: createMaterial('#c4bdb1', { roughness: 0.65 }),    // polished hub concrete
    darkMetal: createMaterial('#3a3a3a', { roughness: 0.42, metalness: 0.85 }),  // anodized metal
    glass: createMaterial('#a0c0d0', {
      transparent: true, opacity: 0.4, depthWrite: true,
      roughness: 0.12, metalness: 0, envMapIntensity: 1.25,
    }),  // reflective blue-grey glazing
    thermalWarm: createMaterial('#e87840', { roughness: 0.6 }),   // warm orange (accent)
    thermalCool: createMaterial('#60b0c0', { roughness: 0.6 }),   // teal (accent)
    polymer: createMaterial('#c890d0', { roughness: 0.65 }),      // purple (accent)
    electronics: createMaterial('#7090b0', { roughness: 0.5, metalness: 0.1 }),  // blue-grey (accent)
    textile: createMaterial('#c89060', { roughness: 0.85 }),      // matte roof tiles (accent)
    sma: createMaterial('#90b080', { roughness: 0.7 }),           // sage green (accent)
    context: createMaterial('#b3ada1', { roughness: 0.9 }),       // neutral grey context
    selectionEdge: createMaterial('#f0a050', {
      roughness: 0.5, emissive: '#f0a050', emissiveIntensity: 0.55,
    }),  // glowing warm orange selection/LED
    land: createMaterial('#b8c8a0', { roughness: 1 }),            // matte green land
    clearing: createMaterial('#d0c8b8', { roughness: 0.95 }),     // warm grey clearing platforms
    districtAccent: createMaterial('#8b9e6b', { roughness: 1 }),  // matte green accent
    routeActive: createMaterial('#e08040', { roughness: 0.8, emissive: '#e08040', emissiveIntensity: 0.35 }),  // orange route
    routePreview: createMaterial('#f0b060', { roughness: 0.8, emissive: '#f0b060', emissiveIntensity: 0.3 }),  // golden preview
    routeMuted: createMaterial('#a0a098', { roughness: 0.9 }),    // neutral grey muted
    pavement: createMaterial('#c0bdb5', { roughness: 0.95 }),     // neutral pavement
    sidewalk: createMaterial('#cdc7ba', { roughness: 0.9 }),      // neutral light sidewalk
    curb: createMaterial('#a0a098', { roughness: 0.9 }),          // neutral curb
    grass: createMaterial('#90b870', { roughness: 1 }),           // matte grass
    foliage: createMaterial('#6f9e52', { roughness: 1 }),         // matte leafy green crowns
    bark: createMaterial('#6b4f3a', { roughness: 0.95 }),         // warm brown bark
    road: createMaterial('#8a8a82', { roughness: 0.95 }),         // neutral road
    landDark: createMaterial('#80a060', { roughness: 1 }),        // dark green
  };
}

export function disposeMaterialPalette(palette: MaterialPalette): void {
  if (disposedPalettes.has(palette)) return;
  disposedPalettes.add(palette);
  for (const material of new Set(Object.values(palette))) material.dispose();
}
