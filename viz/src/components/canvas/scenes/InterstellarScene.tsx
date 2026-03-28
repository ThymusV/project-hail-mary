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

      {/* Sol — G2V, brightest local star, warm white-yellow */}
      <pointLight
        position={[0, 0, 0]}
        color="#ffe0a0"
        intensity={1.5}
        distance={8}
        decay={2}
      />

      {/* Tau Ceti — G8.5V, 52% Sol luminosity, slightly warmer */}
      <pointLight
        position={[11.9, 0, 0]}
        color="#ffd080"
        intensity={0.8}
        distance={6}
        decay={2}
      />

      {/* 40 Eridani A — K1V, 46% Sol luminosity, orange */}
      <pointLight
        position={[-8, 12, 3]}
        color="#ffb060"
        intensity={0.6}
        distance={5}
        decay={2}
      />
    </group>
  );
}
