-- Add parking lots configuration to buildings
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS parking_lots JSONB DEFAULT '[]'::jsonb;
-- parking_lots format: [{"name": "חניון עליון", "type": "upper"}, {"name": "חניון תחתון", "type": "lower"}]

-- Add storage, parking, and ownership fields to building_members
ALTER TABLE building_members
  ADD COLUMN IF NOT EXISTS storage_number TEXT,
  ADD COLUMN IF NOT EXISTS parking_number TEXT,
  ADD COLUMN IF NOT EXISTS parking_type TEXT,
  ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'owner';
-- parking_type should match one of the parking_lots types defined in the building
-- ownership_type: 'owner' = בעל הדירה, 'renter' = שוכר

-- Create index for searching by storage/parking
CREATE INDEX IF NOT EXISTS idx_building_members_storage ON building_members(building_id, storage_number) WHERE storage_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_building_members_parking ON building_members(building_id, parking_number) WHERE parking_number IS NOT NULL;

COMMENT ON COLUMN buildings.parking_lots IS 'Array of parking lot configurations: [{name: string, type: string}]';
COMMENT ON COLUMN building_members.storage_number IS 'Storage unit number assigned to this tenant';
COMMENT ON COLUMN building_members.parking_number IS 'Parking spot number assigned to this tenant';
COMMENT ON COLUMN building_members.parking_type IS 'Type of parking (matches building parking_lots type)';
COMMENT ON COLUMN building_members.ownership_type IS 'owner = בעל הדירה, renter = שוכר';
