import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Airport, TrackPoint } from '../types';

interface MapComponentProps {
  path?: [number, number][];
  points?: TrackPoint[];
}

// Hardcoded list of airports from rule_config.json
const AIRPORTS: Airport[] = [
    { code: "LLBG", name: "Ben Gurion Intl", lat: 32.011389, lon: 34.886667 },
    { code: "LLER", name: "Ramon Intl", lat: 29.723704, lon: 35.01145 },
    { code: "LLHA", name: "Haifa", lat: 32.809444, lon: 35.043056 },
    { code: "LLSD", name: "Sde Dov", lat: 32.114722, lon: 34.781944 },
    { code: "LLBS", name: "Beersheba", lat: 31.287, lon: 34.723 },
    { code: "LLET", name: "Eilat (J. Hozman)", lat: 29.561111, lon: 34.960833 },
    { code: "LLOV", name: "Ovda", lat: 29.940, lon: 34.935 },
    { code: "LLNV", name: "Nevatim AFB", lat: 31.207, lon: 35.012 },
    { code: "LLMG", name: "Megiddo", lat: 32.597, lon: 35.228 },
    { code: "LLHZ", name: "Herzliya", lat: 32.186, lon: 34.835 },
    { code: "LCRA", name: "RAF Akrotiri", lat: 34.5900, lon: 32.9870 },
    { code: "OLBA", name: "Beirut Rafic Hariri Intl", lat: 33.820889, lon: 35.488389 },
    { code: "OLKA", name: "Rayak Air Base", lat: 33.850, lon: 35.987 },
    { code: "OJAI", name: "Queen Alia Intl (Amman)", lat: 31.722556, lon: 35.993214 },
    { code: "OJAM", name: "Amman–Marka Intl", lat: 31.972, lon: 35.991 },
    { code: "OJAQ", "name": "King Hussein Intl (Aqaba)", lat: 29.611, lon: 35.018 },
    { code: "OJMF", name: "Mafraq", lat: 32.356, lon: 36.259 },
    { code: "HEGR", name: "El Gora Airport", lat: 31.0686, lon: 34.1296 },
    { code: "ALJAWZAH", name: "Al-Jawzah Airport", lat: 31.7288, lon: 52.3827 },
    { code: "OSDI", name: "Damascus Intl", lat: 33.411, lon: 36.516 }
];

export const MapComponent: React.FC<MapComponentProps> = ({ path = [], points = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const apiKey = 'r7kaQpfNDVZdaVp23F1r';

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Enable RTL text plugin for correct Hebrew rendering
    if (maplibregl.getRTLTextPluginStatus() === 'unavailable') {
        maplibregl.setRTLTextPlugin(
            'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
            true // Lazy load
        );
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/darkmatter/style.json?key=${apiKey}`,
      center: [34.8516, 31.0461], // Israel center
      zoom: 6,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add Airports Source
      map.current.addSource('airports', {
          type: 'geojson',
          data: {
              type: 'FeatureCollection',
              features: AIRPORTS.map(airport => ({
                  type: 'Feature',
                  geometry: {
                      type: 'Point',
                      coordinates: [airport.lon, airport.lat]
                  },
                  properties: {
                      code: airport.code,
                      name: airport.name
                  }
              }))
          }
      });

      // Add Airports Layer (Circles)
      map.current.addLayer({
          id: 'airports-circle',
          type: 'circle',
          source: 'airports',
          paint: {
              'circle-radius': 4,
              'circle-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#000000'
          }
      });

      // Add Airports Labels
      map.current.addLayer({
          id: 'airports-label',
          type: 'symbol',
          source: 'airports',
          layout: {
              'text-field': ['get', 'code'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 10,
              'text-offset': [0, 1], // below the dot
              'text-anchor': 'top'
          },
          paint: {
              'text-color': '#cccccc',
              'text-halo-color': '#000000',
              'text-halo-width': 1
          }
      });

      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
      });

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
        },
      });

      // Points Layer
      map.current.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
      });

      map.current.addLayer({
        id: 'route-points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 4,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Popup Logic
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
      });

      const showPopup = (e: any) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = 'pointer';

        const coordinates = (e.features![0].geometry as any).coordinates.slice();
        const props = e.features![0].properties;

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const timeStr = new Date(props.timestamp * 1000).toLocaleTimeString();

        popup.setLngLat(coordinates)
            .setHTML(`
                <div class="text-gray-900 p-1 text-xs font-sans">
                    <div class="font-bold border-b border-gray-300 pb-1 mb-1">${timeStr}</div>
                    <div>Alt: <span class="font-mono font-bold">${props.alt}</span> ft</div>
                    <div>Hdg: <span class="font-mono font-bold">${props.track}°</span></div>
                </div>
            `)
            .addTo(map.current);
      };

      const hidePopup = () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = '';
        popup.remove();
      };

      map.current.on('mouseenter', 'route-points', showPopup);
      map.current.on('mouseleave', 'route-points', hidePopup);
    });

    return () => {
        // Cleanup handled by React refs mostly
    };
  }, []);

  // Update Data Effect
  useEffect(() => {
    if (!map.current || !map.current.getSource('route')) return;

    const source = map.current.getSource('route') as maplibregl.GeoJSONSource;
    const pointsSource = map.current.getSource('points') as maplibregl.GeoJSONSource;
    
    // Reset markers
    const markers = document.getElementsByClassName('maplibregl-marker');
    while (markers.length > 0) {
      markers[0].remove();
    }

    // Determine what data to use
    // Prefer 'points' prop, fallback to 'path' prop
    const hasPoints = points && points.length > 0;
    const hasPath = path && path.length > 0;

    if (!hasPoints && !hasPath) {
        source.setData({ type: 'FeatureCollection', features: [] });
        if (pointsSource) pointsSource.setData({ type: 'FeatureCollection', features: [] });
        return;
    }

    const coordinates = hasPoints ? points.map(p => [p.lon, p.lat] as [number, number]) : path;
    
    // Fit bounds
    const bounds = new maplibregl.LngLatBounds();
    coordinates.forEach((coord) => bounds.extend(coord));
    map.current.fitBounds(bounds, { padding: 50 });

    // Add Start Marker
    new maplibregl.Marker({ color: "#10b981" })
      .setLngLat(coordinates[0])
      .setPopup(new maplibregl.Popup().setHTML("Start"))
      .addTo(map.current);

    // Add End Marker
    new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat(coordinates[coordinates.length - 1])
        .setPopup(new maplibregl.Popup().setHTML("End"))
        .addTo(map.current!);

    if (hasPoints) {
        // Render detailed points and line
        
        // Line
        source.setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }] as any
        });

        // Points
        const pointFeatures = points.map(p => ({
            type: 'Feature',
            properties: {
                timestamp: p.timestamp,
                alt: p.alt,
                track: p.track ?? 0,
                color: '#3b82f6'
            },
            geometry: {
                type: 'Point',
                coordinates: [p.lon, p.lat]
            }
        }));

        if (pointsSource) {
            pointsSource.setData({
                type: 'FeatureCollection',
                features: pointFeatures as any
            });
        }

    } else {
        // Fallback to animation style for 'path' only
        // Actually, just render the line for simplicity as we want to unify behaviors
        // If we really want animation we can add it back, but let's stick to the new static style for consistency with points
        
        source.setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }] as any
        });
        
        // No detailed points for 'path' only
        if (pointsSource) {
             pointsSource.setData({ type: 'FeatureCollection', features: [] });
        }
    }

  }, [path, points]);

  return <div ref={mapContainer} className="w-full h-full" />;
};
