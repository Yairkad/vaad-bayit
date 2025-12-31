'use client';

import { useBuilding } from '@/contexts/BuildingContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BuildingSwitcher() {
  const { buildings, currentBuilding, switchBuilding } = useBuilding();

  // Don't show if user has only one building
  if (buildings.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 max-w-[200px]">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{currentBuilding?.name || 'בחר בניין'}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>הבניינים שלי</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {buildings.map((building) => (
          <DropdownMenuItem
            key={building.id}
            onClick={() => switchBuilding(building.id)}
            className={cn(
              'cursor-pointer gap-2',
              currentBuilding?.id === building.id && 'bg-accent'
            )}
          >
            <Building2 className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div className="font-medium truncate">{building.name}</div>
              <div className="text-xs text-muted-foreground truncate">{building.address}</div>
            </div>
            {currentBuilding?.id === building.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
