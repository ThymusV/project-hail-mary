/**
 * Effects — post-processing pipeline.
 *
 * Bloom for star glow, subtle vignette for cinematic feel.
 * Leva controls available in dev mode.
 */

import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useControls } from 'leva';

export function Effects() {
  const bloom = useControls(
    'Bloom',
    {
      intensity: { value: 1.5, min: 0, max: 5, step: 0.1 },
      luminanceThreshold: { value: 0.9, min: 0, max: 2, step: 0.05 },
      luminanceSmoothing: { value: 0.4, min: 0, max: 1, step: 0.05 },
      radius: { value: 0.8, min: 0, max: 1, step: 0.05 },
    },
    { collapsed: true },
  );

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        radius={bloom.radius}
      />
    </EffectComposer>
  );
}
