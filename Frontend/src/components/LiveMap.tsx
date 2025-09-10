import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Info, X } from "lucide-react";
import { MAPBOX_CONFIG } from "@/config/mapbox";

// Set your Mapbox access token here
if (!MAPBOX_CONFIG.accessToken) {
  console.warn(
    "Mapbox access token is not configured. Please set VITE_MAPBOX_API_KEY in your .env.local file"
  );
}
mapboxgl.accessToken = MAPBOX_CONFIG.accessToken || "";

interface Report {
  _id: string;
  type: string;
  severity: string;
  status: string;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  description: string;
  upvotes: Array<{ user: string }>;
  createdAt: string;
  reporter?: {
    name: string;
    email: string;
  };
}

interface LiveMapProps {
  reports: Report[];
  onReportClick?: (report: Report) => void;
  selectedReport?: Report | null;
  onClosePopup?: () => void;
  showHeatmap?: boolean;
  showTraffic?: boolean;
}

const LiveMap: React.FC<LiveMapProps> = ({
  reports,
  onReportClick,
  selectedReport,
  onClosePopup,
  showHeatmap = false,
  showTraffic = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [popup, setPopup] = useState<mapboxgl.Popup | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState(MAPBOX_CONFIG.defaultStyle);
  const [mapError, setMapError] = useState<string | null>(null);
  // Add this state to track user location and marker
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const accuracyCircleRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    if (!MAPBOX_CONFIG.accessToken) {
      setMapError("Mapbox access token is not configured");
      return;
    }

    if (mapContainer.current) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: MAPBOX_CONFIG.defaultStyle,
          center: MAPBOX_CONFIG.defaultCenter as [number, number],
          zoom: MAPBOX_CONFIG.defaultZoom,
          attributionControl: false,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Add fullscreen control
        map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

        // Add geolocate control (LIVE LOCATION, high accuracy)
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false, // Only center on click, do not auto-follow
          showUserLocation: true,
          showUserHeading: true,
          fitBoundsOptions: { maxZoom: 20 },
        });
        map.current.addControl(geolocate, "top-right");

        // Custom marker and accuracy circle
        let userMarker: mapboxgl.Marker | null = null;
        let accuracyCircle: mapboxgl.Marker | null = null;

        // Listen for geolocate event to show marker and accuracy circle
        geolocate.on("geolocate", (e) => {
          const { longitude, latitude, accuracy } = e.coords;
          // Zoom in closely and center on user
          map.current!.flyTo({
            center: [longitude, latitude] as [number, number],
            zoom: 19,
            speed: 1.5,
            curve: 1.42,
            essential: true,
          });
          // Remove previous marker/circle
          if (userMarker) userMarker.remove();
          if (accuracyCircle) accuracyCircle.remove();
          // Add a custom pin marker at user's location
          userMarker = new mapboxgl.Marker({ color: "#2563eb" })
            .setLngLat([longitude, latitude] as [number, number])
            .addTo(map.current!);
          // Add accuracy circle
          const el = document.createElement("div");
          el.style.width = `${Math.max(accuracy * 2, 20)}px`;
          el.style.height = `${Math.max(accuracy * 2, 20)}px`;
          el.style.background = "rgba(37, 99, 235, 0.15)";
          el.style.border = "2px solid #2563eb";
          el.style.borderRadius = "50%";
          el.style.position = "absolute";
          el.style.transform = "translate(-50%, -50%)";
          accuracyCircle = new mapboxgl.Marker({
            element: el,
            anchor: "center",
          })
            .setLngLat([longitude, latitude] as [number, number])
            .addTo(map.current!);
        });

        // Add scale control
        map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

        // Create popup
        const newPopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: "300px",
        });
        setPopup(newPopup);

        // Handle map load errors
        map.current.on("error", (e) => {
          console.error("Map error:", e);
          setMapError("Failed to load map");
        });
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError("Failed to initialize map");
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Handle map style changes
  const changeMapStyle = (styleUrl: string) => {
    if (map.current) {
      map.current.setStyle(styleUrl);
      setCurrentStyle(styleUrl);
    }
  };

  // Add/update heatmap layer
  useEffect(() => {
    if (!map.current || !showHeatmap) {
      // Remove heatmap layer if it exists and heatmap is disabled
      if (map.current && map.current.getLayer("heatmap-layer")) {
        map.current.removeLayer("heatmap-layer");
      }
      if (map.current && map.current.getSource("heatmap-source")) {
        map.current.removeSource("heatmap-source");
      }
      return;
    }

    const addHeatmapLayer = () => {
      if (!map.current) return;

      // Wait for style to load
      if (!map.current.isStyleLoaded()) {
        map.current.once("styledata", addHeatmapLayer);
        return;
      }

      try {
        // Remove existing heatmap layer if it exists
        if (map.current.getLayer("heatmap-layer")) {
          map.current.removeLayer("heatmap-layer");
        }
        if (map.current.getSource("heatmap-source")) {
          map.current.removeSource("heatmap-source");
        }

        // Add heatmap source
        map.current.addSource("heatmap-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: reports.map((report) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  report.location.coordinates.longitude,
                  report.location.coordinates.latitude,
                ],
              },
              properties: {
                severity: report.severity,
                weight: getSeverityWeight(report.severity),
              },
            })),
          },
        });

        // Add heatmap layer
        map.current.addLayer({
          id: "heatmap-layer",
          type: "heatmap",
          source: "heatmap-source",
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0,
              0,
              6,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              9,
              3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33, 102, 172, 0)",
              0.2,
              "rgb(103, 169, 207)",
              0.4,
              "rgb(209, 229, 240)",
              0.6,
              "rgb(253, 219, 199)",
              0.8,
              "rgb(239, 138, 98)",
              1,
              "rgb(178, 24, 43)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              2,
              9,
              20,
            ],
            "heatmap-opacity": 0.8,
          },
        });
      } catch (error) {
        console.error("Error adding heatmap layer:", error);
      }
    };

    addHeatmapLayer();
  }, [showHeatmap, reports, currentStyle]);

  // Add/update traffic layer
  useEffect(() => {
    if (!map.current || !showTraffic) {
      // Remove traffic layer if it exists and traffic is disabled
      if (map.current && map.current.getLayer("traffic-layer")) {
        map.current.removeLayer("traffic-layer");
      }
      if (map.current && map.current.getSource("traffic-source")) {
        map.current.removeSource("traffic-source");
      }
      return;
    }

    const addTrafficLayer = () => {
      if (!map.current) return;

      // Wait for style to load
      if (!map.current.isStyleLoaded()) {
        map.current.once("styledata", addTrafficLayer);
        return;
      }

      try {
        // Remove existing traffic layer if it exists
        if (map.current.getLayer("traffic-layer")) {
          map.current.removeLayer("traffic-layer");
        }
        if (map.current.getSource("traffic-source")) {
          map.current.removeSource("traffic-source");
        }

        // Add traffic layer (using Mapbox traffic tiles)
        map.current.addSource("traffic-source", {
          type: "vector",
          tiles: [
            `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/{z}/{x}/{y}.vector.pbf?access_token=${mapboxgl.accessToken}`,
          ],
          tileSize: 512,
        });

        map.current.addLayer({
          id: "traffic-layer",
          type: "line",
          source: "traffic-source",
          "source-layer": "traffic",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "congestion"], "low"],
              "#00ff00",
              ["==", ["get", "congestion"], "moderate"],
              "#ffff00",
              ["==", ["get", "congestion"], "heavy"],
              "#ff0000",
              ["==", ["get", "congestion"], "severe"],
              "#800000",
              "#cccccc",
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
            "line-opacity": 0.8,
          },
        });
      } catch (error) {
        console.error("Error adding traffic layer:", error);
      }
    };

    addTrafficLayer();
  }, [showTraffic, currentStyle]);

  // Update map center and zoom based on reports
  useEffect(() => {
    if (!map.current || reports.length === 0) return;

    if (reports.length === 1) {
      // Single report: center on it
      const report = reports[0];
      map.current.setCenter([
        report.location.coordinates.longitude,
        report.location.coordinates.latitude,
      ] as [number, number]);
      map.current.setZoom(15);
    } else if (reports.length > 1) {
      // Multiple reports: fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      reports.forEach((report) => {
        bounds.extend([
          report.location.coordinates.longitude,
          report.location.coordinates.latitude,
        ] as [number, number]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [reports]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !popup) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".mapboxgl-marker");
    existingMarkers.forEach((marker) => marker.remove());

    // Add new markers
    reports.forEach((report) => {
      const marker = new mapboxgl.Marker({
        color: getSeverityColor(report.severity),
        scale: 0.8,
      })
        .setLngLat([
          report.location.coordinates.longitude,
          report.location.coordinates.latitude,
        ] as [number, number])
        .addTo(map.current!);

      // Create popup content
      const popupContent = createPopupContent(report);

      // Add click event
      marker.getElement().addEventListener("click", () => {
        if (popup) {
          popup
            .setLngLat([
              report.location.coordinates.longitude,
              report.location.coordinates.latitude,
            ] as [number, number])
            .setHTML(popupContent)
            .addTo(map.current!);
          setSelectedMarker(report._id);
          onReportClick?.(report);
        }
      });
    });

    // Close popup when clicking outside
    map.current.on("click", () => {
      if (popup) {
        popup.remove();
        setSelectedMarker(null);
        onClosePopup?.();
      }
    });
  }, [reports, popup, onReportClick, onClosePopup]);

  // Remove custom watchPosition effect and related state/refs
  // Only use Mapbox's GeolocateControl for live location

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "critical":
        return "#ef4444"; // red-500
      case "high":
        return "#f97316"; // orange-500
      case "medium":
        return "#eab308"; // yellow-500
      case "low":
        return "#22c55e"; // green-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  const getSeverityWeight = (severity: string): number => {
    switch (severity) {
      case "critical":
        return 6;
      case "high":
        return 4;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 1;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "verified":
        return "bg-orange-100 text-orange-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const createPopupContent = (report: Report): string => {
    return `
      <div class="p-4 max-w-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${getSeverityColor(
              report.severity
            )}"></div>
            <span class="font-semibold text-gray-900 capitalize">${report.type.replace(
              "-",
              " "
            )}</span>
          </div>
          <button class="text-gray-400 hover:text-gray-600" onclick="closePopup()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Badge class="${getStatusColor(report.status)} text-xs capitalize">
              ${report.status.replace("-", " ")}
            </Badge>
            <span class="text-xs text-gray-500 capitalize">${
              report.severity
            } priority</span>
          </div>
          
          <p class="text-sm text-gray-600">${report.location.address}</p>
          <p class="text-sm text-gray-700">${report.description}</p>
          
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>${report.upvotes?.length || 0} upvotes</span>
            <span>${new Date(report.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `;
  };

  // Custom function to go to user's current location
  const goToUserLocation = () => {
    if (navigator.geolocation && map.current) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const lngLat: [number, number] = [longitude, latitude];
        map.current!.flyTo({ center: lngLat, zoom: 15 });
        new mapboxgl.Marker({ color: "#2563eb" })
          .setLngLat(lngLat)
          .addTo(map.current!);
      });
    }
  };

  return (
    <Card className="shadow-lg border-0 h-[600px] bg-white dark:bg-gray-800 transition-colors duration-500">
      <CardContent className="p-0 h-full relative">
        <div ref={mapContainer} className="w-full h-full rounded-lg" />

        {/* Legend - Bottom Left */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs font-medium transition-colors duration-300">
            <div className="mb-2 font-bold text-gray-700 dark:text-gray-100">
              Severity Levels
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>{" "}
              Critical
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>{" "}
              High
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>{" "}
              Medium
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>{" "}
              Low
            </div>
          </div>
        </div>

        {/* Map Style Controls - Top Left */}
        <div className="absolute top-2 left-4 z-20 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/95 hover:bg-white dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-600"
            onClick={() => changeMapStyle(MAPBOX_CONFIG.satelliteStyle)}>
            Satellite
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/95 hover:bg-white dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-600"
            onClick={() => changeMapStyle(MAPBOX_CONFIG.defaultStyle)}>
            Streets
          </Button>
        </div>

        {/* Loading State */}
        {reports.length === 0 && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg z-10">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Loading Map...
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No reports found in this area
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg z-10">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Map Error
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {mapError}
              </p>
              {mapError.includes("access token") && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                  <p className="font-medium mb-2">To fix this:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>
                      Create a{" "}
                      <code className="bg-gray-200 px-1 rounded">
                        .env.local
                      </code>{" "}
                      file
                    </li>
                    <li>
                      Add{" "}
                      <code className="bg-gray-200 px-1 rounded">
                        VITE_MAPBOX_API_KEY=your_token
                      </code>
                    </li>
                    <li>
                      Get your token from{" "}
                      <a
                        href="https://account.mapbox.com/access-tokens/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline">
                        Mapbox
                      </a>
                    </li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
        {locationError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-red-100 text-red-800 px-4 py-2 rounded shadow-lg text-sm font-medium animate-fade-in">
            {locationError}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMap;
