import { useState, useCallback } from "react";
import { useEventMap, useSaveEventMap } from "@/hooks/use-event-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, Loader2, Map } from "lucide-react";

interface VendorSpot {
  id: string;
  name: string;
  row: number;
  col: number;
  vendorName?: string;
}

interface MapData {
  spots: VendorSpot[];
  rows?: number;
  cols?: number;
}

interface Props {
  eventId: number;
  readOnly?: boolean;
  registrations?: any[];
}

export function EventMapEditor({ eventId, readOnly = false, registrations = [] }: Props) {
  const { data: mapRecord, isLoading } = useEventMap(eventId);
  const { mutate: saveMap, isPending: isSaving } = useSaveEventMap(eventId);

  const mapData: MapData = (mapRecord?.mapData as any) || { spots: [], rows: 4, cols: 6 };
  const rows = mapData.rows || 4;
  const cols = mapData.cols || 6;
  const spots: VendorSpot[] = mapData.spots || [];

  const [localSpots, setLocalSpots] = useState<VendorSpot[]>(spots);
  const [localRows, setLocalRows] = useState(rows);
  const [localCols, setLocalCols] = useState(cols);
  const [newSpotName, setNewSpotName] = useState("");
  const [editingSpot, setEditingSpot] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const gridCells = Array.from({ length: localRows * localCols }, (_, i) => ({
    row: Math.floor(i / localCols),
    col: i % localCols,
  }));

  const getSpotAt = (row: number, col: number) =>
    localSpots.find(s => s.row === row && s.col === col);

  const getRegistrationForSpot = (spotId: string) =>
    registrations.find((r: any) => r.spotId === spotId && r.status === 'paid');

  const handleCellClick = (row: number, col: number) => {
    if (readOnly) return;
    const existing = getSpotAt(row, col);
    if (existing) {
      setEditingSpot(existing.id);
    } else if (newSpotName.trim()) {
      const spot: VendorSpot = {
        id: `spot-${Date.now()}`,
        name: newSpotName.trim(),
        row,
        col,
      };
      setLocalSpots(prev => [...prev, spot]);
      setNewSpotName("");
      setIsDirty(true);
    }
  };

  const removeSpot = (id: string) => {
    setLocalSpots(prev => prev.filter(s => s.id !== id));
    setIsDirty(true);
  };

  const updateSpotName = (id: string, name: string) => {
    setLocalSpots(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveMap({ spots: localSpots, rows: localRows, cols: localCols });
    setIsDirty(false);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Input
              placeholder="Spot name (e.g. A1, Booth 3)"
              value={newSpotName}
              onChange={e => setNewSpotName(e.target.value)}
              className="rounded-xl h-9 text-sm"
              data-testid="input-spot-name"
            />
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl shrink-0"
              onClick={() => {}}
              disabled={!newSpotName.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />Then click cell
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Grid:</span>
            <Input type="number" min={1} max={10} value={localRows} onChange={e => { setLocalRows(Number(e.target.value)); setIsDirty(true); }} className="w-16 h-9 rounded-xl text-center" />
            <span className="text-muted-foreground">×</span>
            <Input type="number" min={1} max={12} value={localCols} onChange={e => { setLocalCols(Number(e.target.value)); setIsDirty(true); }} className="w-16 h-9 rounded-xl text-center" />
          </div>
          <Button
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-primary to-amber-500"
            data-testid="button-save-map"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Map
          </Button>
        </div>
      )}

      <div
        className="grid gap-2 bg-card rounded-2xl p-4 border border-border/50 overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${readOnly ? (mapData.cols || localCols) : localCols}, minmax(80px, 1fr))` }}
        data-testid="event-map-grid"
      >
        {(readOnly ? Array.from({ length: (mapData.rows || localRows) * (mapData.cols || localCols) }, (_, i) => ({ row: Math.floor(i / (mapData.cols || localCols)), col: i % (mapData.cols || localCols) })) : gridCells).map(({ row, col }) => {
          const spot = getSpotAt(row, col);
          const reg = spot ? getRegistrationForSpot(spot.id) : null;
          const isEditing = editingSpot === spot?.id;

          if (!spot) {
            return (
              <div
                key={`${row}-${col}`}
                onClick={() => handleCellClick(row, col)}
                className={`h-20 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center transition-all ${!readOnly && newSpotName.trim() ? 'cursor-pointer hover:border-primary/50 hover:bg-primary/5' : 'cursor-default'}`}
              >
                {!readOnly && newSpotName.trim() && <Plus className="w-4 h-4 text-primary/40" />}
              </div>
            );
          }

          return (
            <div
              key={spot.id}
              className={`h-20 rounded-xl border-2 p-2 flex flex-col items-center justify-center text-center relative transition-all ${reg ? 'border-green-500/50 bg-green-50 dark:bg-green-900/20' : 'border-primary/30 bg-primary/5 hover:border-primary/60'}`}
              data-testid={`map-spot-${spot.id}`}
            >
              {isEditing && !readOnly ? (
                <Input
                  value={spot.name}
                  onChange={e => updateSpotName(spot.id, e.target.value)}
                  onBlur={() => setEditingSpot(null)}
                  autoFocus
                  className="h-7 text-xs text-center rounded-lg px-1"
                />
              ) : (
                <>
                  <p className="text-xs font-bold text-foreground truncate w-full text-center">{spot.name}</p>
                  {reg && <p className="text-xs text-green-700 dark:text-green-300 truncate w-full text-center">{reg.vendorName}</p>}
                  {!reg && <Badge variant="outline" className="text-xs mt-1 h-5">Open</Badge>}
                </>
              )}
              {!readOnly && !isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeSpot(spot.id); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {localSpots.length === 0 && readOnly && (
        <div className="text-center py-8 bg-muted/30 rounded-2xl border border-dashed">
          <Map className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No event map created yet.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20 inline-block" />Open spot</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 inline-block" />Booked</span>
        {!readOnly && <span>Click an empty cell after entering a spot name to place it. Click a spot to edit its name.</span>}
      </div>
    </div>
  );
}
