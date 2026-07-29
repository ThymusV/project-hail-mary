import { describe, it, expect } from 'vitest';
import {
  stepLocalFlight,
  createInitialFlightState,
  NO_INPUT,
  headingVector,
  DEFAULT_FLIGHT_PARAMS,
} from '../localFlight';

describe('stepLocalFlight — Newtonian inertia (no drag)', () => {
  it('preserves velocity with no input (coasts forever, no space friction)', () => {
    const state = { position: [0, 0, 0] as [number, number, number], velocity: [5, 0, 0] as [number, number, number], yaw: 0, pitch: 0 };
    const next = stepLocalFlight(state, NO_INPUT, 1);
    expect(next.velocity).toEqual([5, 0, 0]);
    expect(next.position[0]).toBeCloseTo(5); // moved by velocity * dt
  });

  it('forward thrust increases speed along the heading direction', () => {
    const state = createInitialFlightState([0, 0, 0]);
    const input = { ...NO_INPUT, forward: true };
    const next = stepLocalFlight(state, input, 1, DEFAULT_FLIGHT_PARAMS);
    const speed = Math.hypot(...next.velocity);
    expect(speed).toBeCloseTo(DEFAULT_FLIGHT_PARAMS.mainThrustAccel, 5);
  });

  it('backward thrust decelerates/reverses relative to heading', () => {
    const state = createInitialFlightState([0, 0, 0]);
    const forwardOnce = stepLocalFlight(state, { ...NO_INPUT, forward: true }, 1);
    const thenBackward = stepLocalFlight(forwardOnce, { ...NO_INPUT, backward: true }, 1);
    const speed = Math.hypot(...thenBackward.velocity);
    expect(speed).toBeCloseTo(0, 5);
  });

  it('killThrust ignores thrust input but still integrates existing velocity', () => {
    const state = { position: [0, 0, 0] as [number, number, number], velocity: [3, 0, 0] as [number, number, number], yaw: 0, pitch: 0 };
    const input = { ...NO_INPUT, forward: true, killThrust: true };
    const next = stepLocalFlight(state, input, 1);
    expect(next.velocity).toEqual([3, 0, 0]); // unaffected by forward input
    expect(next.position[0]).toBeCloseTo(3); // but still coasts
  });

  it('clamps speed to maxSpeed even under sustained thrust', () => {
    let state = createInitialFlightState([0, 0, 0]);
    const input = { ...NO_INPUT, forward: true };
    for (let i = 0; i < 200; i++) {
      state = stepLocalFlight(state, input, 0.5);
    }
    const speed = Math.hypot(...state.velocity);
    expect(speed).toBeLessThanOrEqual(DEFAULT_FLIGHT_PARAMS.maxSpeed + 1e-6);
  });

  it('yaw input rotates heading, changing the direction future thrust accelerates toward', () => {
    const state = createInitialFlightState([0, 0, 0]);
    const rotated = stepLocalFlight(state, { ...NO_INPUT, yawRight: true }, 1);
    expect(rotated.yaw).toBeCloseTo(state.yaw + DEFAULT_FLIGHT_PARAMS.turnRate, 5);
    // velocity should still be zero — rotating alone applies no thrust
    expect(rotated.velocity).toEqual([0, 0, 0]);
  });

  it('pitch is clamped so the ship cannot flip past straight up/down', () => {
    let state = createInitialFlightState([0, 0, 0]);
    for (let i = 0; i < 20; i++) {
      state = stepLocalFlight(state, { ...NO_INPUT, pitchUp: true }, 1);
    }
    expect(state.pitch).toBeLessThan(Math.PI / 2);
    expect(state.pitch).toBeGreaterThan(Math.PI / 2 - 0.2);
  });
});

describe('headingVector', () => {
  it('points along +Z at yaw=0, pitch=0 (matches ship default facing)', () => {
    const [x, y, z] = headingVector(0, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });

  it('is always a unit vector regardless of yaw/pitch', () => {
    for (const yaw of [0, 0.5, 1.5, 3.1, -2.2]) {
      for (const pitch of [-1, 0, 0.7]) {
        const [x, y, z] = headingVector(yaw, pitch);
        expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
      }
    }
  });
});
