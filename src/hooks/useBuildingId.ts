'use client';

import { useBuilding } from '@/contexts/BuildingContext';

/**
 * Hook to get the current building ID from the BuildingContext.
 * Returns null if no building is selected.
 */
export function useBuildingId(): string | null {
  const { currentBuilding } = useBuilding();
  return currentBuilding?.id || null;
}

/**
 * Hook to get the current building data from the BuildingContext.
 * Returns null if no building is selected.
 */
export function useCurrentBuilding() {
  const { currentBuilding } = useBuilding();
  return currentBuilding;
}
