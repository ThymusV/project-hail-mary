/**
 * Zustand store: ship instances (world state, not catalog — see
 * schema/ship-instance.schema.ts and architecture doc sec. 2.8).
 *
 * Fase 1 scope: one player-controlled instance, docked/in-transit between
 * locations. Fase 3 will add many NPC instances driven by factionAI.ts,
 * reusing the exact same startTransit/resolveArrivals logic.
 */

import { create } from 'zustand';
import { validateShipInstances } from '@/schema/ship-instance.schema';
import type { ShipInstance } from '@/schema/ship-instance.schema';
import type { Location } from '@/schema/location.schema';
import { travelTimeHoursBetween } from '@/engine/orbitalMechanics';
import initialShipInstancesRaw from '@/data/initial-ship-instances.json';

export interface ShipInstancesState {
  ships: ShipInstance[];

  // ── Actions ──────────────────────────────────────────────────────
  /** Begins transit for `shipId` toward `toLocationId`, computing travel time from current world-clock hours. */
  startTransit: (
    shipId: string,
    toLocationId: string,
    accelerationG: number,
    currentElapsedHours: number,
    locationsById: Map<string, Location>,
  ) => void;
  /** Flips any in-transit ship whose arrivalHours has passed into 'docked' at its destination. */
  resolveArrivals: (currentElapsedHours: number) => void;
}

export const useShipInstancesStore = create<ShipInstancesState>((set, get) => ({
  ships: validateShipInstances(initialShipInstancesRaw),

  startTransit: (shipId, toLocationId, accelerationG, currentElapsedHours, locationsById) => {
    const ship = get().ships.find((s) => s.id === shipId);
    if (!ship || ship.status !== 'docked' || ship.currentLocationId === null) return;
    if (ship.currentLocationId === toLocationId) return; // already there

    const travelHours = travelTimeHoursBetween(
      ship.currentLocationId,
      toLocationId,
      accelerationG,
      locationsById,
    );

    set({
      ships: get().ships.map((s) =>
        s.id === shipId
          ? {
              ...s,
              status: 'in-transit' as const,
              currentLocationId: null,
              transit: {
                fromLocationId: ship.currentLocationId!,
                toLocationId,
                accelerationG,
                departureHours: currentElapsedHours,
                arrivalHours: currentElapsedHours + travelHours,
              },
            }
          : s,
      ),
    });
  },

  resolveArrivals: (currentElapsedHours) => {
    const { ships } = get();
    const hasArrivals = ships.some(
      (s) => s.status === 'in-transit' && s.transit && currentElapsedHours >= s.transit.arrivalHours,
    );
    if (!hasArrivals) return;

    set({
      ships: ships.map((s) => {
        if (s.status === 'in-transit' && s.transit && currentElapsedHours >= s.transit.arrivalHours) {
          return {
            ...s,
            status: 'docked' as const,
            currentLocationId: s.transit.toLocationId,
            transit: null,
          };
        }
        return s;
      }),
    });
  },
}));
