/**
 * InterstellarScene -- the default and largest scene.
 *
 * Shows the star field, flight trajectory curve, spacecraft marker,
 * labeled key stars (Sol, Tau Ceti, 40 Eridani), and iconic markers
 * (Earth, Target A).
 * Coordinate frame: interstellar (1 unit = 1 light-year).
 */

import { StarField } from '../StarField';
import { Trajectory } from '../Trajectory';
import { Spacecraft } from '../Spacecraft';
import { Labels } from '../Labels';
import { IconicMarkers } from '../IconicMarkers';

export function InterstellarScene() {
  return (
    <group>
      <StarField />
      <Trajectory />
      <Spacecraft />
      <Labels />
      <IconicMarkers />

      {/* Subtle ambient light for metallic ship materials */}
      <ambientLight intensity={0.08} color="#667799" />

      {/* Directional light simulating distant starlight */}
      <directionalLight
        position={[10, 5, 5]}
        intensity={0.3}
        color="#ffffff"
      />

      {/* Warm point light at Sol */}
      <pointLight
        position={[0, 0, 0]}
        color="#fff4ea"
        intensity={3}
        distance={20}
        decay={2}
      />

      {/* Slightly cooler warm point light at Tau Ceti */}
      <pointLight
        position={[11.9, 0, 0]}
        color="#fff8f0"
        intensity={2.5}
        distance={20}
        decay={2}
      />
    </group>
  );
}
