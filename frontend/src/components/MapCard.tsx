import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useStore } from '../state/store';
import { formatTemperature } from './format';
import { CloseIcon, ExpandIcon, LocationIcon } from './icons';
import { logInteraction } from '../api';
import type { Location } from '../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const SINGAPORE_CENTER: [number, number] = [1.3521, 103.8198];
const DEFAULT_ZOOM = 11;
const SINGLE_LOCATION_ZOOM = 13;

function areaLabel(location: Location): string {
  return (
    location.weather?.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
  );
}

function buildPinIcon(location: Location, isSelected: boolean): L.DivIcon {
  const temp = formatTemperature(location.weather?.temperature_c);
  return L.divIcon({
    className: 'weather-map-pin',
    html: `
      <div class="flex flex-col items-center gap-1">
        <div class="rounded-full border border-white/20 ${isSelected ? 'bg-sky-500/90' : 'bg-slate-900/85'} px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg shadow-black/40 backdrop-blur-sm">${temp}</div>
        <div class="h-2.5 w-2.5 rounded-full border-2 border-white ${isSelected ? 'bg-sky-400' : 'bg-slate-900/85'} shadow shadow-black/40"></div>
      </div>`,
    iconSize: [64, 40],
    iconAnchor: [32, 36],
  });
}

function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap();
  const idKey = locations
    .map((l) => l.id)
    .sort((a, b) => a - b)
    .join(',');

  useEffect(() => {
    if (locations.length === 0) return;
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], SINGLE_LOCATION_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(
      locations.map((l) => [l.latitude, l.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  return null;
}

function MapMarkers({
  locations,
  selectedId,
  onSelect,
}: {
  locations: Location[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={buildPinIcon(location, location.id === selectedId)}
          title={areaLabel(location)}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.stopPropagation();
              onSelect(location.id);
              logInteraction('map_pin_selected', { locationId: location.id });
            },
          }}
        />
      ))}
    </>
  );
}

function FullscreenMap({
  locations,
  selectedId,
  onSelect,
  onClose,
}: {
  locations: Location[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Map of saved locations"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm"
    >
      <header className="flex items-center justify-between px-4 py-3 lg:px-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Saved Locations
        </h2>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close fullscreen map"
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.14]"
        >
          <CloseIcon />
          <span>Close</span>
        </button>
      </header>
      <div className="relative flex-1">
        <MapContainer center={SINGAPORE_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            subdomains="abcd"
            maxZoom={19}
            detectRetina
          />
          <FitBounds locations={locations} />
          <MapMarkers locations={locations} selectedId={selectedId} onSelect={onSelect} />
        </MapContainer>
      </div>
    </div>,
    document.body,
  );
}

export function MapCard() {
  const { locations, selectedId, select } = useStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openFullscreen = () => {
    setIsFullscreen(true);
    logInteraction('map_expanded');
  };
  const closeFullscreen = () => {
    setIsFullscreen(false);
    logInteraction('map_collapsed');
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          <LocationIcon className="h-3 w-3" />
          <span>Map</span>
        </div>
        <button
          type="button"
          onClick={openFullscreen}
          aria-label="Expand map to fullscreen"
          className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/[0.14]"
        >
          <ExpandIcon className="h-3 w-3" />
          <span>Expand</span>
        </button>
      </header>
      <div
        role="button"
        tabIndex={0}
        onClick={openFullscreen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFullscreen();
          }
        }}
        aria-label="Open fullscreen map"
        className="relative h-56 cursor-pointer"
      >
        <MapContainer
          center={SINGAPORE_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          className="h-full w-full"
        >
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            subdomains="abcd"
            maxZoom={19}
            detectRetina
          />
          <FitBounds locations={locations} />
          <MapMarkers locations={locations} selectedId={selectedId} onSelect={select} />
        </MapContainer>
      </div>
      {isFullscreen && (
        <FullscreenMap
          locations={locations}
          selectedId={selectedId}
          onSelect={select}
          onClose={closeFullscreen}
        />
      )}
    </section>
  );
}
