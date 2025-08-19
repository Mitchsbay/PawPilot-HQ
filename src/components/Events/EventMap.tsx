import React from 'react';
import InteractiveMap from '../Maps/InteractiveMap';
import { Calendar, MapPin, Users } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  start_datetime: string;
  rsvp_count: number;
}

interface EventMapProps {
  events: Event[];
  center: { lat: number; lng: number };
  onEventSelect?: (event: Event) => void;
  height?: string;
}

const EventMap: React.FC<EventMapProps> = ({
  events,
  center,
  onEventSelect,
  height = '400px'
}) => {
  const mapMarkers = events
    .filter(event => event.latitude && event.longitude)
    .map(event => ({
      id: event.id,
      latitude: event.latitude!,
      longitude: event.longitude!,
      title: event.title,
      description: `${event.rsvp_count} going • ${new Date(event.start_datetime).toLocaleDateString()}`,
      type: 'event' as const,
      onClick: () => onEventSelect?.(event)
    }));

  return (
    <div className="space-y-4">
      <InteractiveMap
        center={center}
        zoom={12}
        markers={mapMarkers}
        height={height}
        className="rounded-lg overflow-hidden shadow-md"
      />
      
      {mapMarkers.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Showing {mapMarkers.length} event{mapMarkers.length !== 1 ? 's' : ''} with location data
          </p>
        </div>
      )}
    </div>
  );
};

export default EventMap;