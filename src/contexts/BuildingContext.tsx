'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Building, BuildingMember } from '@/types/database';

interface BuildingWithMembership extends Building {
  membership: BuildingMember;
}

interface BuildingContextType {
  buildings: BuildingWithMembership[];
  currentBuilding: BuildingWithMembership | null;
  isLoading: boolean;
  switchBuilding: (buildingId: string) => void;
  refreshBuildings: () => Promise<void>;
}

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

const STORAGE_KEY = 'vaad-current-building';

interface BuildingProviderProps {
  children: ReactNode;
  initialBuildings: BuildingWithMembership[];
  initialBuildingId?: string;
}

export function BuildingProvider({
  children,
  initialBuildings,
  initialBuildingId
}: BuildingProviderProps) {
  const [buildings, setBuildings] = useState<BuildingWithMembership[]>(initialBuildings);
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(() => {
    // Try to get from localStorage, fallback to initial or first building
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && initialBuildings.some(b => b.id === stored)) {
        return stored;
      }
    }
    return initialBuildingId || initialBuildings[0]?.id || null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const currentBuilding = buildings.find(b => b.id === currentBuildingId) || buildings[0] || null;

  // Persist current building to localStorage
  useEffect(() => {
    if (currentBuildingId) {
      localStorage.setItem(STORAGE_KEY, currentBuildingId);
    }
  }, [currentBuildingId]);

  const switchBuilding = (buildingId: string) => {
    if (buildings.some(b => b.id === buildingId)) {
      setCurrentBuildingId(buildingId);
    }
  };

  const refreshBuildings = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get all memberships for user where role is committee
      const { data: memberships } = await supabase
        .from('building_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'committee') as { data: BuildingMember[] | null };

      if (!memberships || memberships.length === 0) {
        setBuildings([]);
        return;
      }

      // Get all buildings for these memberships
      const buildingIds = memberships.map(m => m.building_id);
      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('*')
        .in('id', buildingIds) as { data: Building[] | null };

      if (!buildingsData) {
        setBuildings([]);
        return;
      }

      // Combine buildings with their memberships
      const buildingsWithMembership: BuildingWithMembership[] = buildingsData.map(building => {
        const membership = memberships.find(m => m.building_id === building.id)!;
        return { ...building, membership };
      });

      setBuildings(buildingsWithMembership);

      // If current building is no longer valid, switch to first
      if (!buildingsWithMembership.some(b => b.id === currentBuildingId)) {
        setCurrentBuildingId(buildingsWithMembership[0]?.id || null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BuildingContext.Provider value={{
      buildings,
      currentBuilding,
      isLoading,
      switchBuilding,
      refreshBuildings
    }}>
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuilding() {
  const context = useContext(BuildingContext);
  if (context === undefined) {
    throw new Error('useBuilding must be used within a BuildingProvider');
  }
  return context;
}
