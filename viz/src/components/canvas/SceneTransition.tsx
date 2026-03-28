/**
 * SceneTransition — fade-to-black overlay for frame cuts.
 *
 * A full-screen quad rendered in screen space that transitions
 * from transparent to opaque black, driven by useSceneStore.
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSceneStore } from '@/stores/useSceneStore';

// ── Shader ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;

  void main() {
    gl_FragColor = vec4(0.012, 0.012, 0.031, uOpacity);
  }
`;

// ── Component ───────────────────────────────────────────────────────────

export function SceneTransition() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  // Smooth the transition progress to avoid pops
  const smoothOpacity = useRef(0);

  useFrame((_state, delta) => {
    if (!materialRef.current) return;

    const { isTransitioning, transitionProgress } = useSceneStore.getState();
    const target = isTransitioning ? transitionProgress : 0;

    // Smooth damp
    const dt = Math.min(delta, 0.1);
    smoothOpacity.current = THREE.MathUtils.damp(
      smoothOpacity.current,
      target,
      8,
      dt,
    );

    materialRef.current.uniforms.uOpacity.value = smoothOpacity.current;

    // Hide mesh when fully transparent to save draw call
    materialRef.current.visible = smoothOpacity.current > 0.001;
  });

  return (
    <mesh renderOrder={9999} frustumCulled={false}>
      {/* Full-screen triangle (more efficient than quad) */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uOpacity: { value: 0 } }}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
