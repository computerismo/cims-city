import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMaterialPalette, disposeMaterialPalette } from './materials';
import { createGroundDetail, disposeGroundDetail } from './groundDetail';

const groups: THREE.Group[] = [];

afterEach(() => {
  for (const group of groups.splice(0)) disposeGroundDetail(group);
});

describe('ground detail', () => {
  it('creates sidewalks, curbs, and planted areas', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    groups.push(detail);

    const names = detail.children.map(c => c.name);
    expect(names.some(n => n.startsWith('sidewalk'))).toBe(true);
    expect(names.some(n => n.startsWith('curb'))).toBe(true);
    expect(names.some(n => n.startsWith('planted'))).toBe(true);

    disposeMaterialPalette(palette);
  });

  it('creates benches and lampposts', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    groups.push(detail);

    const benches = detail.children.filter(c => c.name.startsWith('bench'));
    const lampposts = detail.children.filter(c => c.name.startsWith('lamppost'));
    expect(benches.length).toBeGreaterThan(0);
    expect(lampposts.length).toBeGreaterThan(0);

    disposeMaterialPalette(palette);
  });

  it('creates sidewalks that receive shadows', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    groups.push(detail);

    const sidewalks = detail.children.filter(c => c.name.startsWith('sidewalk'));
    for (const sidewalk of sidewalks) {
      if (sidewalk instanceof THREE.Mesh) {
        expect(sidewalk.receiveShadow).toBe(true);
      }
    }

    disposeMaterialPalette(palette);
  });

  it('keeps every paved surface above the 0.175 clearing platform top', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    groups.push(detail);

    const paved = detail.children.filter((child) =>
      /^(avenue|street|connector|sidewalk|curb|plaza|planted):/.test(child.name),
    );
    expect(paved.length).toBeGreaterThan(0);
    for (const surface of paved) {
      if (!(surface instanceof THREE.Mesh)) continue;
      const geometry = surface.geometry as THREE.BoxGeometry;
      const top = surface.position.y + geometry.parameters.height / 2;
      expect(top, surface.name).toBeGreaterThan(0.175);
    }

    disposeMaterialPalette(palette);
  });

  it('steps avenue tops at distinct heights so crossings never z-fight', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    groups.push(detail);

    const avenues = detail.children.filter((child) =>
      /^avenue:/.test(child.name),
    ) as THREE.Mesh[];
    const tops = avenues.map((avenue) => {
      const geometry = avenue.geometry as THREE.BoxGeometry;
      return Number((avenue.position.y + geometry.parameters.height / 2).toFixed(3));
    });
    expect(new Set(tops).size).toBe(avenues.length);

    disposeMaterialPalette(palette);
  });

  it('connects the central grid to every outer district with causeways', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    groups.push(detail);

    const connectors = detail.children.filter(c => c.name.startsWith('connector'));
    expect(connectors.length).toBeGreaterThanOrEqual(7);

    disposeMaterialPalette(palette);
  });

  it('disposes geometry on disposal', () => {
    const palette = createMaterialPalette();
    const detail = createGroundDetail(palette);
    const geometries: THREE.BufferGeometry[] = [];
    detail.traverse((child) => {
      if (child instanceof THREE.Mesh) geometries.push(child.geometry);
    });
    const spies = geometries.map(g => vi.spyOn(g, 'dispose'));

    disposeGroundDetail(detail);

    for (const spy of spies) expect(spy).toHaveBeenCalled();
    disposeMaterialPalette(palette);
  });
});
