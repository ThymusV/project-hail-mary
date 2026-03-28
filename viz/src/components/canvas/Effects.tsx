/**
 * Effects — post-processing pipeline using native Three.js passes.
 *
 * CRITICAL: This component takes over the R3F render loop.
 * - Uses useLayoutEffect so the composer exists BEFORE the first frame.
 * - Falls back to normal gl.render() if composer isn't ready.
 * - Properly restores gl.autoClear on unmount (StrictMode safe).
 */

import { useRef, useLayoutEffect, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as THREE from 'three';

export function Effects() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const prevAutoClear = useRef(true);

  const bloom = useControls(
    'Bloom',
    {
      intensity: { value: 1.5, min: 0, max: 5, step: 0.1 },
      threshold: { value: 0.9, min: 0, max: 2, step: 0.05 },
      radius: { value: 0.8, min: 0, max: 2, step: 0.05 },
    },
    { collapsed: true },
  );

  // Initialize composer synchronously before first paint (useLayoutEffect)
  useLayoutEffect(() => {
    // Save and override autoClear
    prevAutoClear.current = gl.autoClear;
    gl.autoClear = false;

    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      bloom.intensity,
      bloom.radius,
      bloom.threshold,
    );
    composer.addPass(bloomPass);
    bloomRef.current = bloomPass;

    composer.addPass(new OutputPass());
    composerRef.current = composer;

    return () => {
      // Restore renderer state (StrictMode safe)
      gl.autoClear = prevAutoClear.current;
      composerRef.current = null;
      bloomRef.current = null;
      composer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene]);

  // Update bloom params live
  useEffect(() => {
    if (bloomRef.current) {
      bloomRef.current.strength = bloom.intensity;
      bloomRef.current.threshold = bloom.threshold;
      bloomRef.current.radius = bloom.radius;
    }
  }, [bloom.intensity, bloom.threshold, bloom.radius]);

  // Keep camera reference in sync
  useEffect(() => {
    const composer = composerRef.current;
    if (composer && composer.passes[0]) {
      (composer.passes[0] as RenderPass).camera = camera;
    }
  }, [camera]);

  // Handle resize
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);

  // Render: composer if ready, fallback to normal render if not
  useFrame(() => {
    if (composerRef.current) {
      gl.clear();
      composerRef.current.render();
    } else {
      // Fallback: normal render (should only happen on first frame if ever)
      gl.clear();
      gl.render(scene, camera);
    }
  }, 1);

  return null;
}
