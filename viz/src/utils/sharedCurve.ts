/**
 * Shared trajectory spline for interstellar flight path.
 *
 * Singleton CatmullRomCurve3 used by both Trajectory (for rendering)
 * and Spacecraft (for positioning along the path).
 */

import * as THREE from 'three';

/** Key waypoints in interstellar frame (1 unit = 1 light-year). */
const WAYPOINTS = [
  new THREE.Vector3(0, 0, 0),       // Sol
  new THREE.Vector3(5.0, 0.8, 0.3), // mid-transit control
  new THREE.Vector3(11.9, 0, 0),    // Tau Ceti
  new THREE.Vector3(4.0, 8.0, 1.5), // return arc control
  new THREE.Vector3(-8, 12, 3),     // 40 Eridani
];

let _sharedCurve: THREE.CatmullRomCurve3 | null = null;

/** Return the singleton trajectory spline. */
export function getSharedCurve(): THREE.CatmullRomCurve3 {
  if (!_sharedCurve) {
    _sharedCurve = new THREE.CatmullRomCurve3(WAYPOINTS, false, 'centripetal', 0.5);
  }
  return _sharedCurve;
}
