/**
 * App — root layout for the Pre-Protomolécula solar system simulator.
 *
 * Fase 1 milestone COMPLETE with this pass: "movimiento dual" — system
 * transit (SolarSystemScene, previous pass) + local free-flight maneuvering
 * (LocalSpaceScene, this pass). viewMode toggles between the two frames as
 * a hard cut, not a continuous zoom — consistent with the project's own
 * "cada frame es un espacio de coordenadas completamente separado" principle.
 *
 * INIT FLOW (unchanged from the base repo):
 * 1. index.html inline style → black background immediately
 * 2. React mounts → dark root div
 * 3. Canvas mounts → gl.setClearColor('#030308') in onCreated
 * 4. Suspense INSIDE Canvas wraps scene children (not the Canvas itself)
 */

import { Suspense, Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

import { SolarSystemScene } from '@/components/canvas/SolarSystemScene';
import { LocalSpaceScene } from '@/components/canvas/LocalSpaceScene';
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
const gameData = validateGameData({
  ships: shipsRaw,
  weapons: weaponsRaw,
  factions: factionsRaw,
  locations: locationsRaw,
});

const LOCATIONS_BY_ID = new Map(gameData.locations.map((l) => [l.id, l]));

const BURN_OPTIONS = [
  { label: '0.3g (crucero, ahorra combustible)', g: 0.3 },
  { label: '1.0g (estándar, más rápido)', g: 1.0 },
] as const;

type ViewMode = 'system' | 'local';

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

// ── Location info + travel panel (system view only) ─────────────────────

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

// ── Time controls + "enter local space" (system view only) ──────────────

function TimeControlsAndDocking({ onEnterLocal }: { onEnterLocal: () => void }) {
  const timeScale = useWorldClockStore((s) => s.timeScale);
  const setTimeScale = useWorldClockStore((s) => s.setTimeScale);
  const elapsedHours = useWorldClockStore((s) => s.elapsedHours);
  const ships = useShipInstancesStore((s) => s.ships);
  const playerShip = ships.find((s) => s.isPlayerControlled);

  const days = Math.floor(elapsedHours / 24);
  const hours = Math.floor(elapsedHours % 24);
  const dockedLocation = playerShip?.currentLocationId ? LOCATIONS_BY_ID.get(playerShip.currentLocationId) : null;

  return (
    <div style={{ ...panelStyle, bottom: 'auto', top: 16, left: 16, pointerEvents: 'auto' }}>
      <strong>Día {days}, {hours}h</strong>
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <button style={timeButtonStyle(timeScale === 0)} onClick={() => setTimeScale(0)}>Pausa</button>
        <button style={timeButtonStyle(timeScale === DEFAULT_TIME_SCALE)} onClick={() => setTimeScale(DEFAULT_TIME_SCALE)}>1×</button>
        <button style={timeButtonStyle(timeScale === DEFAULT_TIME_SCALE * 10)} onClick={() => setTimeScale(DEFAULT_TIME_SCALE * 10)}>10×</button>
        <button style={timeButtonStyle(timeScale === DEFAULT_TIME_SCALE * 50)} onClick={() => setTimeScale(DEFAULT_TIME_SCALE * 50)}>50×</button>
      </div>

      {dockedLocation && (
        <button style={{ ...travelButtonStyle, marginTop: 10, width: '100%' }} onClick={onEnterLocal}>
          🛰️ Entrar en espacio local ({dockedLocation.name})
        </button>
      )}
    </div>
  );
}

// ── Local-space HUD (controls hint + speed + exit) ──────────────────────

function LocalSpaceHud({ locationName, onExit }: { locationName: string; onExit: () => void }) {
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    function handleSpeed(e: Event) {
      setSpeed((e as CustomEvent<number>).detail);
    }
    window.addEventListener('local-space-speed', handleSpeed);
    return () => window.removeEventListener('local-space-speed', handleSpeed);
  }, []);

  return (
    <>
      <div style={{ ...panelStyle, bottom: 'auto', top: 16, left: 16, pointerEvents: 'auto' }}>
        <strong>Espacio local — {locationName}</strong>
        <p style={{ margin: '6px 0 0', fontSize: 11, opacity: 0.7 }}>
          W/S empuje · Q/E RCS lateral · Espacio/Shift subir-bajar · A/D girar · ↑/↓ cabeceo
        </p>
        <button style={{ ...travelButtonStyle, marginTop: 8 }} onClick={onExit}>
          ← Salir a vista de sistema
        </button>
      </div>
      <div style={{ ...panelStyle, top: 'auto' }}>
        <strong>{speed.toFixed(1)} m/s</strong>
      </div>
    </>
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
  const [viewMode, setViewMode] = useState<ViewMode>('system');
  const shipClasses = useMemo(() => gameData.ships, []);

  const ships = useShipInstancesStore((s) => s.ships);
  const playerShip = ships.find((s) => s.isPlayerControlled);
  const dockedLocation = playerShip?.currentLocationId ? LOCATIONS_BY_ID.get(playerShip.currentLocationId) : null;

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
            {viewMode === 'system' ? (
              <SolarSystemScene
                locations={gameData.locations}
                shipClasses={shipClasses}
                onSelectLocation={setSelected}
              />
            ) : (
              <LocalSpaceScene
                locationType={dockedLocation?.type ?? 'station'}
                onExit={() => setViewMode('system')}
              />
            )}
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>

      <div className="vignette-overlay" />

      <div className="ui-overlay" style={{ pointerEvents: 'none' }}>
        {viewMode === 'system' ? (
          <>
            <TimeControlsAndDocking onEnterLocal={() => setViewMode('local')} />
            <LocationInfoPanel location={selected} />
          </>
        ) : (
          <LocalSpaceHud locationName={dockedLocation?.name ?? '—'} onExit={() => setViewMode('system')} />
        )}
      </div>
    </div>
  );
}
