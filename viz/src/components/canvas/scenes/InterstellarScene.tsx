/**
 * InterstellarScene -- the default and largest scene.
 *
 * Shows the star field, flight trajectory curve, spacecraft marker,
 * labeled key stars (Sol, Tau Ceti, 40 Eridani), iconic markers
 * (Earth, Target A), and floating event synopsis cards.
 * Coordinate frame: interstellar (1 unit = 1 light-year).
 */

import { StarField } from '../StarField';
import { Trajectory } from '../Trajectory';
import { Spacecraft } from '../Spacecraft';
import { Labels } from '../Labels';
import { IconicMarkers } from '../IconicMarkers';
import { EventSynopsis } from '../EventSynopsis';

export function InterstellarScene() {
  return (
    <group>
      <StarField />
      <Trajectory />
      <Spacecraft />
      <Labels />
      <IconicMarkers />
      <EventSynopsis />

      {/* Subtle ambient light for metallic ship materials */}
      <ambientLight intensity={0.15} color="#667799" />

      {/* Directional light simulating distant starlight */}
      <directionalLight
        position={[10, 5, 5]}
        intensity={0.3}
        color="#ffffff"
      />
    </group>
  );
}
