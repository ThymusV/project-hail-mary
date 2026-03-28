/**
 * Effects — post-processing pipeline using native Three.js passes.
 *
 * Uses Three.js EffectComposer + UnrealBloomPass directly
 * (NOT @react-three/postprocessing which has compatibility issues
 * with Three.js r183+).
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as THREE from 'three';

export function Effects() {
  const { gl, scene, camera, size, invalidate } = useThree();

  // Disable R3F's default rendering — we render via EffectComposer
  useEffect(() => {
    gl.autoClear = false;
  }, [gl]);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);

  const bloom = useControls(
    'Bloom',
    {
      intensity: { value: 1.5, min: 0, max: 5, step: 0.1 },
      threshold: { value: 0.9, min: 0, max: 2, step: 0.05 },
      radius: { value: 0.8, min: 0, max: 2, step: 0.05 },
    },
    { collapsed: true },
  );

  // Initialize composer
  useEffect(() => {
    const composer = new EffectComposer(gl);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      bloom.intensity,
      bloom.radius,
      bloom.threshold,
    );
    composer.addPass(bloomPass);
    bloomRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    composerRef.current = composer;

    return () => {
      composer.dispose();
    };
    // Only re-create on gl/scene change, not on every bloom param change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene]);

  // Update bloom params without recreating composer
  useEffect(() => {
    if (bloomRef.current) {
      bloomRef.current.strength = bloom.intensity;
      bloomRef.current.threshold = bloom.threshold;
      bloomRef.current.radius = bloom.radius;
    }
  }, [bloom.intensity, bloom.threshold, bloom.radius]);

  // Update camera reference
  useEffect(() => {
    if (composerRef.current) {
      const renderPass = composerRef.current.passes[0] as RenderPass;
      if (renderPass) renderPass.camera = camera;
    }
  }, [camera]);

  // Resize
  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(size.width, size.height);
    }
  }, [size]);

  // Take over rendering from R3F
  useFrame(({ gl: renderer }) => {
    if (composerRef.current) {
      renderer.clear();
      composerRef.current.render();
    }
  }, 1); // priority 1 = runs after scene updates

  return null; // Pure logic component
}
