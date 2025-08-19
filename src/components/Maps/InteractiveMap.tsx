import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Layers, ZoomIn, ZoomOut } from 'lucide-react';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type: 'lost' | 'found' | 'resolved' | 'event' | 'user';
  onClick?: () => void;
}

interface InteractiveMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  zoom = 13,
  markers = [],
  onLocationSelect,
  height = '400px',
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [currentCenter, setCurrentCenter] = useState(center);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Simplified map implementation (in production, would use Leaflet or Google Maps)
  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'lost': return 'bg-red-500';
      case 'found': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      case 'event': return 'bg-purple-500';
      case 'user': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'lost':
      case 'found':
      case 'resolved':
        return MapPin;
      default:
        return MapPin;
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onLocationSelect) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert pixel coordinates to lat/lng (simplified calculation)
    const lat = currentCenter.lat + (0.5 - y / rect.height) * 0.01 * (21 - currentZoom);
    const lng = currentCenter.lng + (x / rect.width - 0.5) * 0.01 * (21 - currentZoom);
    
    onLocationSelect(lat, lng);
  };

  const zoomIn = () => {
    setCurrentZoom(prev => Math.min(prev + 1, 18));
  };

  const zoomOut = () => {
    setCurrentZoom(prev => Math.max(prev - 1, 1));
  };

  const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Map Container */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        className="w-full h-full bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 rounded-lg overflow-hidden cursor-crosshair relative"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 226, 0.1) 0%, transparent 50%)
          `
        }}
      >
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Markers */}
        {markers.map((marker, index) => {
          const MarkerIcon = getMarkerIcon(marker.type);
          const markerColor = getMarkerColor(marker.type);
          
          // Calculate position based on center and zoom (simplified)
          const offsetLat = (marker.latitude - currentCenter.lat) * 1000 * currentZoom;
          const offsetLng = (marker.longitude - currentCenter.lng) * 1000 * currentZoom;
          
          const x = 50 + offsetLng; // Percentage from left
          const y = 50 - offsetLat; // Percentage from top
          
          // Only show markers that are within view
          if (x < -10 || x > 110 || y < -10 || y > 110) return null;
          
          return (
            <div
              key={marker.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{ 
                left: `${Math.max(0, Math.min(100, x))}%`, 
                top: `${Math.max(0, Math.min(100, y))}%` 
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(marker);
                marker.onClick?.();
              }}
            >
              <div className={`${markerColor} text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform`}>
                <MarkerIcon className="h-4 w-4" />
              </div>
            </div>
          );
        })}

        {/* Center Marker (for location selection) */}
        {onLocationSelect && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={zoomIn}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <ZoomIn className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={zoomOut}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <ZoomOut className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={centerOnUser}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <Navigation className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Map Info */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
        <p className="text-xs text-gray-600">
          Zoom: {currentZoom} | Center: {currentCenter.lat.toFixed(4)}, {currentCenter.lng.toFixed(4)}
        </p>
        {onLocationSelect && (
          <p className="text-xs text-blue-600 mt-1">Click to select location</p>
        )}
      </div>

      {/* Marker Popup */}
      {selectedMarker && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{selectedMarker.title}</h3>
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {selectedMarker.description && (
            <p className="text-sm text-gray-600">{selectedMarker.description}</p>
          )}
          <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span>{selectedMarker.latitude.toFixed(4)}, {selectedMarker.longitude.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;