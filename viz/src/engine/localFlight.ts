/**
 * localFlight — pure physics step for the tactical/local ("encounter" frame)
 * flight model: real-time maneuvering with inertia, no space friction.
 *
 * Deliberately Newtonian and simple for Fase 1: thrust changes velocity,
 * velocity persists with no drag (matches the project's own framing —
 * "Física en tiempo real con inercia real, sin fricción espacial", sección
 * 2.1 del documento de arquitectura). No 6DOF/roll for v1 — yaw + pitch is
 * enough for "maniobrar localmente" without a full flight-sim control
 * scheme. Docking/combat use of this is a later phase; this is movement
 * only.
 *
 * Kept as a pure function (state + input + dt → new state) specifically so
 * it can be unit tested without any DOM/keyboard/React involved — physics
 * bugs are easy to introduce silently, a pure step function makes them easy
 * to catch.
 */

export interface LocalFlightState {
  position: [number, number, number];
  velocity: [number, number, number];
  /** Radians, rotation around world Y (heading) */
  yaw: number;
  /** Radians, rotation around local X (nose up/down), clamped to avoid gimbal flip */
  pitch: number;
}

export interface ThrustInput {
  forward: boolean;
  backward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  ascend: boolean;
  descend: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
  /** Cuts main+RCS thrust acceleration to zero but preserves existing velocity — "coast" */
  killThrust: boolean;
}

export const NO_INPUT: ThrustInput = {
  forward: false,
  backward: false,
  strafeLeft: false,
  strafeRight: false,
  ascend: false,
  descend: false,
  yawLeft: false,
  yawRight: false,
  pitchUp: false,
  pitchDown: false,
  killThrust: false,
};

export interface FlightParams {
  /** Main drive acceleration, m/s² (forward/backward) */
  mainThrustAccel: number;
  /** RCS acceleration, m/s² (strafe/ascend/descend) — weaker than main drive */
  rcsThrustAccel: number;
  /** Yaw/pitch turn rate, radians/sec */
  turnRate: number;
  /** Hard velocity cap, m/s — prevents runaway speed in an unbounded local volume */
  maxSpeed: number;
}

export const DEFAULT_FLIGHT_PARAMS: FlightParams = {
  mainThrustAccel: 15,
  rcsThrustAccel: 8,
  turnRate: 1.2,
  maxSpeed: 120,
};

const PITCH_LIMIT = Math.PI / 2 - 0.05; // just short of straight up/down

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Forward-facing unit vector for a given yaw/pitch. */
export function headingVector(yaw: number, pitch: number): [number, number, number] {
  return [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
}

/** World-up-relative right vector (perpendicular to heading, no pitch contribution — keeps strafe level). */
function rightVector(yaw: number): [number, number, number] {
  return [Math.cos(yaw), 0, -Math.sin(yaw)];
}

export function stepLocalFlight(
  state: LocalFlightState,
  input: ThrustInput,
  dt: number,
  params: FlightParams = DEFAULT_FLIGHT_PARAMS,
): LocalFlightState {
  let { yaw, pitch } = state;
  let [vx, vy, vz] = state.velocity;
  let [px, py, pz] = state.position;

  // ── Rotation (direct rate control, not inertial — easier to aim than full 6DOF) ──
  if (input.yawLeft) yaw -= params.turnRate * dt;
  if (input.yawRight) yaw += params.turnRate * dt;
  if (input.pitchUp) pitch = clamp(pitch + params.turnRate * dt, -PITCH_LIMIT, PITCH_LIMIT);
  if (input.pitchDown) pitch = clamp(pitch - params.turnRate * dt, -PITCH_LIMIT, PITCH_LIMIT);

  // ── Thrust → velocity (Newtonian: no drag, velocity persists with no input) ──
  if (!input.killThrust) {
    const [hx, hy, hz] = headingVector(yaw, pitch);
    const [rx, , rz] = rightVector(yaw);

    if (input.forward) {
      vx += hx * params.mainThrustAccel * dt;
      vy += hy * params.mainThrustAccel * dt;
      vz += hz * params.mainThrustAccel * dt;
    }
    if (input.backward) {
      vx -= hx * params.mainThrustAccel * dt;
      vy -= hy * params.mainThrustAccel * dt;
      vz -= hz * params.mainThrustAccel * dt;
    }
    if (input.strafeRight) {
      vx += rx * params.rcsThrustAccel * dt;
      vz += rz * params.rcsThrustAccel * dt;
    }
    if (input.strafeLeft) {
      vx -= rx * params.rcsThrustAccel * dt;
      vz -= rz * params.rcsThrustAccel * dt;
    }
    if (input.ascend) vy += params.rcsThrustAccel * dt;
    if (input.descend) vy -= params.rcsThrustAccel * dt;
  }

  // ── Speed cap (prevents runaway velocity — gameplay guard, not physically real) ──
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (speed > params.maxSpeed) {
    const scale = params.maxSpeed / speed;
    vx *= scale;
    vy *= scale;
    vz *= scale;
  }

  // ── Integrate position ──
  px += vx * dt;
  py += vy * dt;
  pz += vz * dt;

  return {
    position: [px, py, pz],
    velocity: [vx, vy, vz],
    yaw,
    pitch,
  };
}

export function createInitialFlightState(position: [number, number, number] = [0, 0, 8]): LocalFlightState {
  return { position, velocity: [0, 0, 0], yaw: Math.PI, pitch: 0 };
}
