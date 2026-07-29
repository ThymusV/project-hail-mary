/**
 * App — root layout for the Pre-Protomolécula solar system simulator.
 *
 * Fase 1 milestone: "el jugador puede viajar entre nodos y maniobrar
 * localmente" (movimiento dual, sección 2.1 del documento de arquitectura).
 * This first pass covers the transit half — the player's ship (a
 * ShipInstance, see schema/ship-instance.schema.ts) can be sent to any
 * location, travel time computed by the brachistochrone model in
 * engine/orbitalMechanics.ts (validated against canon travel-time tables),
 * and the world clock (useWorldClockStore) drives its progress in-scene.
 *
 * INIT FLOW (unchanged from the base repo):
 * 1. index.html inline style → black background immediately
 * 2. React mounts → dark root div
 * 3. Canvas mounts → gl.setClearColor('#030308') in onCreated
 * 4. Suspense INSIDE Canvas wraps scene children (not the Canvas itself)
 */

import { Suspense, Component, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

import { SolarSystemScene } from '@/components/canvas/SolarSystemScene';
import { Effects } from '@/components/canvas/Effects';
import { validateGameData } from '@/schema/game-data.schema';
import type { Location } from '@/schema/location.schema';
import { useWorldClockStore, DEFAULT_TIME_SCALE } from '@/stores/useWorldClockStore';
import { useShipInstancesStore } from '@/stores/useShipInstancesStore';
import { travelTimeHoursBetween } from '@/engine/orbitalMechanics';

import shipsRaw from '@/data/ships.json';
import weaponsRaw from '@/data/weapons.json';
import factionsRaw from '@/data/factions.json';
import locationsRaw from '@/data/locations.json';

// ── Validate game data once at startup ─────────────────────────────────
// Cheap runtime safety net on top of the vitest suite: if a future manual
// edit to the JSON breaks a cross-reference (bad weaponId/factionId), we
// fail loudly here instead of silently rendering broken/missing markers.
const gameData = validateGameData({
  ships: shipsRaw,
  weapons: weaponsRaw,
  factions: factionsRaw,
  locations: locationsRaw,
});

const LOCATIONS_BY_ID = new Map(gameData.locations.map((l) => [l.id, l]));

// Burn options offered to the player — matches the G levels documented
// across every canon travel-time table (0.3g crucero / 1.0g estándar).
const BURN_OPTIONS = [
  { label: '0.3g (crucero, ahorra combustible)', g: 0.3 },
  { label: '1.0g (estándar, más rápido)', g: 1.0 },
] as const;

// ── Error Boundary ──────────────────────────────────────────────────

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { error: string | null; }

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: '#030308', color: '#ff6b6b', fontFamily: 'system-ui',
          flexDirection: 'column', gap: 8, padding: 32,
        }}>
          <h2 style={{ fontSize: 18 }}>Render Error</h2>
          <pre style={{ fontSize: 12, color: '#888', maxWidth: 500, whiteSpace: 'pre-wrap' }}>
            {this.state.error}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Location info + travel panel ────────────────────────────────────────

function LocationInfoPanel({ location }: { location: Location | null }) {
  const ships = useShipInstancesStore((s) => s.ships);
  const startTransit = useShipInstancesStore((s) => s.startTransit);
  const elapsedHours = useWorldClockStore((s) => s.elapsedHours);

  const playerShip = ships.find((s) => s.isPlayerControlled);

  if (!location) {
    return (
      <div style={panelStyle}>
        <strong>Sistema Sol — Pre-Protomolécula</strong>
        <p style={{ opacity: 0.7, margin: '6px 0 0' }}>
          Clic en una localización para ver sus detalles. Arrastra para orbitar, rueda para zoom.
        </p>
      </div>
    );
  }

  const canTravelHere =
    playerShip && playerShip.status === 'docked' && playerShip.currentLocationId !== location.id;

  return (
    <div style={{ ...panelStyle, pointerEvents: 'auto' }}>
      <strong>{location.name}</strong>
      <p style={{ margin: '4px 0 0', opacity: 0.85 }}>{location.economicStrategicRole}</p>
      <p style={{ margin: '6px 0 0', fontSize: 11, opacity: 0.55 }}>
        {location.type} · {location.region} · {location.isCanon ? 'canon' : 'diseño propio'}
      </p>

      {canTravelHere && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {BURN_OPTIONS.map((opt) => {
            const hours = travelTimeHoursBetween(
              playerShip.currentLocationId!,
              location.id,
              opt.g,
              LOCATIONS_BY_ID,
            );
            return (
              <button
                key={opt.g}
                onClick={() =>
                  startTransit(playerShip.id, location.id, opt.g, elapsedHours, LOCATIONS_BY_ID)
                }
                style={travelButtonStyle}
              >
                Viajar a {opt.g}g — {Math.round(hours)}h ({opt.label})
              </button>
            );
          })}
        </div>
      )}

      {playerShip?.status === 'in-transit' && playerShip.transit && (
        <p style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
          En tránsito hacia {LOCATIONS_BY_ID.get(playerShip.transit.toLocationId)?.name} — llegada en{' '}
          {Math.max(0, Math.round(playerShip.transit.arrivalHours - elapsedHours))}h de juego.
        </p>
      )}
    </div>
  );
}

// ── Time controls ────────────────────────────────────────────────────────

function TimeControls() {
  const timeScale = useWorldClockStore((s) => s.timeScale);
  const setTimeScale = useWorldClockStore((s) => s.setTimeScale);
  const elapsedHours = useWorldClockStore((s) => s.elapsedHours);

  const days = Math.floor(elapsedHours / 24);
  const hours = Math.floor(elapsedHours % 24);

  return (
    <div style={{ ...panelStyle, bottom: 'auto', top: 16, left: 16, pointerEvents: 'auto' }}>
      <strong>Día {days}, {hours}h</strong>
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <button style={timeButtonStyle(timeScale === 0)} onClick={() => setTimeScale(0)}>
          Pausa
        </button>
        <button style={timeButtonStyle(timeScale === DEFAULT_TIME_SCALE)} onClick={() => setTimeScale(DEFAULT_TIME_SCALE)}>
          1×
        </button>
        <button style={timeButtonStyle(timeScale === DEFAULT_TIME_SCALE * 10)} onClick={() => setTimeScale(DEFAULT_TIME_SCALE * 10)}>
          10×
        </button>
        <button style={timeButtonStyle(timeScale === DEFAULT_TIME_SCALE * 50)} onClick={() => setTimeScale(DEFAULT_TIME_SCALE * 50)}>
          50×
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  maxWidth: 340,
  padding: '10px 14px',
  background: 'rgba(8, 10, 16, 0.72)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e6ecf5',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  pointerEvents: 'none',
  backdropFilter: 'blur(4px)',
};

const travelButtonStyle: React.CSSProperties = {
  background: 'rgba(80, 140, 255, 0.18)',
  border: '1px solid rgba(120, 170, 255, 0.4)',
  borderRadius: 6,
  color: '#cfe0ff',
  fontSize: 12,
  padding: '6px 8px',
  cursor: 'pointer',
  textAlign: 'left',
};

function timeButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'rgba(120, 170, 255, 0.35)' : 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 5,
    color: '#e6ecf5',
    fontSize: 12,
    padding: '4px 8px',
    cursor: 'pointer',
  };
}

// ── Root App ──────────────────────────────────────────────────────────

export default function App() {
  const [selected, setSelected] = useState<Location | null>(null);
  const shipClasses = useMemo(() => gameData.ships, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#030308' }}>
      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 14, 26], fov: 55, near: 0.01, far: 500 }}
          gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
          dpr={[1, 1.5]}
          style={{ background: '#030308' }}
          frameloop="always"
          onCreated={({ gl }) => {
            gl.setClearColor('#030308', 1);
          }}
        >
          <color attach="background" args={['#030308']} />
          <Effects />
          <Suspense fallback={null}>
            <SolarSystemScene
              locations={gameData.locations}
              shipClasses={shipClasses}
              onSelectLocation={setSelected}
            />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>

      <div className="vignette-overlay" />

      <div className="ui-overlay" style={{ pointerEvents: 'none' }}>
        <TimeControls />
        <LocationInfoPanel location={selected} />
      </div>
    </div>
  );
}
