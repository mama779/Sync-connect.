"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { 
  MapPin, 
  Loader2, 
  ExternalLink, 
  Users, 
  Calendar, 
  Navigation, 
  ShieldCheck,
  Search,
  Activity,
  Download,
  Check,
  Route,
  ArrowRight,
  Info,
  Layers,
  Map as MapIcon
} from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

// Haversine distance formula (in km)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AdminMapPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buyers' | 'affiliates'>('all')
  const [filterCity, setFilterCity] = useState<string>('all')

  // Selected points for details or routing
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [routeOrigin, setRouteOrigin] = useState<any | null>(null) // usually affiliate
  const [routeDestination, setRouteDestination] = useState<any | null>(null) // usually buyer
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string; routeLine: [number, number][] | null } | null>(null)
  const [calculatingRoute, setCalculatingRoute] = useState(false)

  // Reverse geocoding state
  const [resolvedAddress, setResolvedAddress] = useState<string>('')
  const [loadingAddress, setLoadingAddress] = useState(false)

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersGroupRef = useRef<any>(null)
  const routePolylineRef = useRef<any>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const LRef = useRef<any>(null)

  // Load affiliates
  const affiliatesQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'affiliates');
  }, [db, user, isUserLoading]);
  const { data: affiliates, isLoading: affiliatesLoading } = useCollection(affiliatesQuery)

  // Load buyers
  const buyersQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'buyers');
  }, [db, user, isUserLoading]);
  const { data: buyers, isLoading: buyersLoading } = useCollection(buyersQuery)

  // Process and unify list
  const locatedUsers = useMemoFirebase(() => {
    const list: any[] = [];
    
    // Process affiliates
    if (affiliates) {
      affiliates.forEach(a => {
        if (a.lastLocation && typeof a.lastLocation.lat === 'number' && typeof a.lastLocation.lng === 'number') {
          list.push({
            id: a.id,
            role: 'affiliate',
            firstName: a.firstName || 'Socio',
            lastName: a.lastName || '',
            email: a.email || '',
            whatsappNumber: a.whatsappNumber || a.phone || '',
            lastLocation: a.lastLocation,
            status: a.status || 'Active'
          });
        }
      });
    }

    // Process buyers
    if (buyers) {
      buyers.forEach(b => {
        if (b.lastLocation && typeof b.lastLocation.lat === 'number' && typeof b.lastLocation.lng === 'number') {
          list.push({
            id: b.id,
            role: 'buyer',
            firstName: b.firstName || 'Comprador',
            lastName: b.lastName || '',
            email: b.email || '',
            whatsappNumber: b.whatsappNumber || b.phone || '',
            lastLocation: b.lastLocation,
            status: b.status || 'Active'
          });
        }
      });
    }

    return list;
  }, [affiliates, buyers]);

  // Extract unique cities from coordinates/location fields to build dynamic filters
  const uniqueCities = useMemoFirebase(() => {
    const cities = new Set<string>();
    locatedUsers.forEach(u => {
      if (u.lastLocation?.city) {
        cities.add(u.lastLocation.city);
      }
    });
    return Array.from(cities);
  }, [locatedUsers]);

  // Filter list of users
  const filteredList = locatedUsers.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.whatsappNumber.includes(searchTerm);

    const matchesType = filterType === 'all' || u.role === filterType;
    const matchesCity = filterCity === 'all' || u.lastLocation?.city === filterCity;

    return matchesSearch && matchesType && matchesCity;
  });

  // Reverse Geocoding with OpenStreetMap Nominatim
  useEffect(() => {
    if (!selectedUser?.lastLocation) return;
    
    setResolvedAddress('');
    setLoadingAddress(true);

    const lat = selectedUser.lastLocation.lat;
    const lng = selectedUser.lastLocation.lng;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      .then(res => res.json())
      .then(data => {
        setLoadingAddress(false);
        if (data && data.display_name) {
          setResolvedAddress(data.display_name);
        } else {
          setResolvedAddress('No se pudo resolver la dirección exacta.');
        }
      })
      .catch(err => {
        console.error("Nominatim reverse geocoding error:", err);
        setResolvedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)} (Error al resolver dirección)`);
        setLoadingAddress(false);
      });
  }, [selectedUser]);

  // Load Leaflet resources dynamically on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamic import
    import('leaflet').then((leaflet) => {
      LRef.current = leaflet;
      setLeafletLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize Map Instance
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = LRef.current;
    
    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [12.114, -86.236], // Centered in Managua, Nicaragua
      zoom: 8,
      zoomControl: true,
    });

    // Add Free Tile Layer (OpenStreetMap / CartoDB Dark Matter or Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Create a markers group
    const markersGroup = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;
    markersGroupRef.current = markersGroup;
  }, [leafletLoaded]);

  // Render Markers and fit bounds dynamically
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !markersGroupRef.current) return;

    const L = LRef.current;
    const markersGroup = markersGroupRef.current;

    // Clear previous markers
    markersGroup.clearLayers();

    if (filteredList.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredList.forEach((user) => {
      const { lat, lng } = user.lastLocation;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const isBuyer = user.role === 'buyer';
      
      // Gorgeous custom modern Tailwind-styled divIcon
      const pulseColor = isBuyer ? 'bg-blue-500' : 'bg-emerald-500';
      const ringColor = isBuyer ? 'ring-blue-400' : 'ring-emerald-400';
      const iconHtml = `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full ${pulseColor} opacity-20 animate-ping"></div>
          <div class="w-4 h-4 rounded-full ${pulseColor} border-2 border-white ring-4 ${ringColor}/40 shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });
      
      // Bind descriptive premium popup
      marker.bindPopup(`
        <div class="p-2 font-sans space-y-1 text-slate-800 min-w-[150px]">
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded text-white ${
              isBuyer ? 'bg-blue-600' : 'bg-emerald-600'
            }">${isBuyer ? 'COMPRADOR' : 'AFILIADO'}</span>
          </div>
          <h4 class="font-black text-xs uppercase text-slate-900 m-0 pt-1">${user.firstName} ${user.lastName}</h4>
          <p class="text-[10px] text-slate-500 font-bold m-0">${user.email}</p>
        </div>
      `);

      marker.on('click', () => {
        setSelectedUser(user);
      });

      markersGroup.addLayer(marker);
      bounds.extend([lat, lng]);
    });

    // Fit map bounds to show all markers beautifully
    if (filteredList.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredList, leafletLoaded]);

  // Calculate Routes and distance using OSRM (Open Source Routing Machine - 100% Free)
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;
    const L = LRef.current;

    // Clear previous polylines
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (!routeOrigin || !routeDestination) {
      setRouteInfo(null);
      return;
    }

    const originLat = routeOrigin.lastLocation.lat;
    const originLng = routeOrigin.lastLocation.lng;
    const destLat = routeDestination.lastLocation.lat;
    const destLng = routeDestination.lastLocation.lng;

    setCalculatingRoute(true);

    // Call open OSRM routing api
    fetch(`https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        setCalculatingRoute(false);
        if (data && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distanceKm = route.distance / 1000;
          const durationMin = Math.round(route.duration / 60);
          
          // Geometry coordinates are [lng, lat] in GeoJSON, Leaflet expects [lat, lng]
          const routeCoords: [number, number][] = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);

          setRouteInfo({
            distanceText: `${distanceKm.toFixed(2)} km`,
            durationText: `${durationMin} min`,
            routeLine: routeCoords
          });

          // Draw real road polyline on map
          const polyline = L.polyline(routeCoords, {
            color: '#3b82f6', // Brand Blue
            weight: 5,
            opacity: 0.85,
            dashArray: '1, 1', // elegant tactical path style
            lineJoin: 'round'
          }).addTo(mapInstanceRef.current);

          routePolylineRef.current = polyline;

          // Pan to show route
          mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [80, 80] });
        } else {
          // Fallback to straight-line geodesic connection if routing api limits or fails
          const directDistance = getHaversineDistance(originLat, originLng, destLat, destLng);
          const estDuration = Math.round((directDistance / 60) * 60); // assumes 60km/h average driving

          const straightCoords: [number, number][] = [
            [originLat, originLng],
            [destLat, destLng]
          ];

          setRouteInfo({
            distanceText: `${directDistance.toFixed(2)} km (Geodésica)`,
            durationText: `${estDuration} min est.`,
            routeLine: straightCoords
          });

          const polyline = L.polyline(straightCoords, {
            color: '#ef4444', // Warning Red
            weight: 4,
            opacity: 0.7,
            dashArray: '8, 8',
            lineJoin: 'round'
          }).addTo(mapInstanceRef.current);

          routePolylineRef.current = polyline;
          mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [80, 80] });
        }
      })
      .catch(err => {
        console.error("OSRM routing calculation error:", err);
        setCalculatingRoute(false);
        
        // Final fallback straight line
        const directDistance = getHaversineDistance(originLat, originLng, destLat, destLng);
        const straightCoords: [number, number][] = [
          [originLat, originLng],
          [destLat, destLng]
        ];

        setRouteInfo({
          distanceText: `${directDistance.toFixed(2)} km (Geodésica)`,
          durationText: 'N/A',
          routeLine: straightCoords
        });

        const polyline = L.polyline(straightCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = polyline;
        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [80, 80] });
      });

  }, [routeOrigin, routeDestination, leafletLoaded]);

  // Export results as CSV
  const handleExport = () => {
    if (filteredList.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No hay registros filtrados para exportar." });
      return;
    }

    const headers = ["ID", "Rol", "Nombre", "Email", "WhatsApp", "Latitud", "Longitud", "Último Reporte"];
    const rows = filteredList.map(u => [
      u.id,
      u.role === 'buyer' ? 'Comprador' : 'Afiliado',
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.whatsappNumber,
      u.lastLocation.lat,
      u.lastLocation.lng,
      u.lastLocation.updatedAt ? new Date(u.lastLocation.updatedAt).toLocaleString() : ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geolocalizacion_admin_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exportación Exitosa ✓", description: "Se ha descargado la información correctamente en formato CSV." });
  };

  const handleSetRouteOrigin = (user: any) => {
    setRouteOrigin(user);
    toast({ title: "Origen Seleccionado", description: `Origen configurado a: ${user.firstName} ${user.lastName}` });
  };

  const handleSetRouteDestination = (user: any) => {
    setRouteDestination(user);
    toast({ title: "Destino Seleccionado", description: `Destino configurado a: ${user.firstName} ${user.lastName}` });
  };

  const clearRoute = () => {
    setRouteOrigin(null);
    setRouteDestination(null);
    setRouteInfo(null);
  };

  const isLoading = affiliatesLoading || buyersLoading;

  return (
    <DashboardShell role="admin">
      <div className="space-y-10">
        
        {/* Encabezado */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <MapIcon className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Mando de Geoseguridad</span>
            </div>
            <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight leading-none uppercase italic">
              Geolocalización <span className="text-primary">Estratégica</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl">
              Monitoreo absoluto y privado de compradores y afiliados sobre OpenStreetMap sin APIs de Google. Mide distancias, visualiza rutas y audita ubicaciones comerciales.
            </p>
          </div>

          {/* Filtros rápidos y Exportación */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                  filterType === 'all' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos ({locatedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('buyers')}
                className={`h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                  filterType === 'buyers' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Compradores ({locatedUsers.filter(u => u.role === 'buyer').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('affiliates')}
                className={`h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                  filterType === 'affiliates' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Afiliados ({locatedUsers.filter(u => u.role === 'affiliate').length})
              </button>
            </div>

            <Button 
              onClick={handleExport}
              variant="outline"
              className="h-12 px-5 rounded-2xl border-slate-200 font-black text-xs uppercase tracking-wider gap-2 bg-white text-slate-700 shadow-sm"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Buscador, Filtro de Ciudad y Ruta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              className="pl-12 h-14 rounded-2xl border-slate-200 bg-white text-sm font-bold shadow-sm" 
              placeholder="Buscar por nombre, email, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full h-14 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
            >
              <option value="all">📍 Todas las Ciudades</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Enrutamiento rápido */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between gap-4">
            <div className="truncate">
              <p className="text-[9px] font-black uppercase text-blue-500 tracking-wider">Planificador de Ruta</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-1 truncate">
                <span className="truncate max-w-[100px]">{routeOrigin ? `${routeOrigin.firstName}` : 'Origen'}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span className="truncate max-w-[100px]">{routeDestination ? `${routeDestination.firstName}` : 'Destino'}</span>
              </div>
            </div>
            
            {routeOrigin && routeDestination ? (
              <Button 
                onClick={clearRoute}
                variant="ghost" 
                className="h-10 px-3 text-red-500 hover:text-red-600 text-xs font-bold shrink-0"
              >
                Limpiar
              </Button>
            ) : (
              <div className="text-[10px] font-bold text-slate-400 shrink-0">
                Selecciona marcadores para enlazar
              </div>
            )}
          </div>
        </div>

        {/* DISTANCE MATRIX / ROUTE SUMMARY BOX */}
        {(routeInfo || calculatingRoute) && (
          <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl flex flex-wrap items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center">
                <Route className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-primary">Ruta de Precisión Satelital</h4>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  Conexión segura entre {routeOrigin?.firstName} ({routeOrigin?.role === 'buyer' ? 'Comprador' : 'Afiliado'}) y {routeDestination?.firstName} ({routeDestination?.role === 'buyer' ? 'Comprador' : 'Afiliado'}).
                </p>
              </div>
            </div>

            {calculatingRoute ? (
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Loader2 className="h-5 w-5 animate-spin" /> Calculando trayecto óptimo...
              </div>
            ) : routeInfo && (
              <div className="flex gap-8">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Distancia en Carretera</p>
                  <p className="text-xl font-black text-white">{routeInfo.distanceText}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiempo de Conducción</p>
                  <p className="text-xl font-black text-white">{routeInfo.durationText}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAP CONTAINER AND SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* MAP CANVAS */}
          <Card className="lg:col-span-8 border-none shadow-xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-slate-100 flex flex-col min-h-[550px] relative">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-headline font-black text-slate-950 uppercase italic flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Visualizador de Cobertura No-GMap
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold">
                Haz clic en cualquier nodo para consultar sus coordenadas y planificar rutas de distribución de forma 100% privada.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-8 pt-0 flex-1 flex flex-col justify-end">
              <div className="w-full h-[500px] rounded-[2rem] border overflow-hidden shadow-inner relative bg-slate-50">
                
                {/* Loader overlay */}
                {(!leafletLoaded || isLoading) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-20 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Inicializando Sistema Geográfico</p>
                  </div>
                )}

                {/* Leaflet target container */}
                <div ref={mapContainerRef} className="w-full h-full z-10" />

              </div>
            </CardContent>
          </Card>

          {/* DETAIL SIDE PANEL / LIST */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Selected User Details Drawer */}
            {selectedUser ? (
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-950 text-white overflow-hidden flex flex-col justify-between">
                <CardHeader className="p-8 pb-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge className={`border-none font-black px-4 py-1.5 rounded-xl text-[9px] text-white ${
                      selectedUser.role === 'buyer' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}>
                      {selectedUser.role === 'buyer' ? 'DATOS COMPRADOR' : 'DATOS SOCIO'}
                    </Badge>
                    <Button 
                      onClick={() => setSelectedUser(null)} 
                      variant="ghost" 
                      className="h-8 w-8 text-slate-400 hover:text-white rounded-xl"
                    >
                      ✕
                    </Button>
                  </div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight italic mt-3 truncate">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    
                    {/* Basic Contact Info */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Correo de Contacto</p>
                      <p className="text-xs font-bold text-white truncate">{selectedUser.email || 'Sin correo'}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Teléfono</p>
                      <p className="text-xs font-bold text-white">{selectedUser.whatsappNumber || 'Sin teléfono'}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dirección Resuelta (Reverse Geocoding)</p>
                      {loadingAddress ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-primary py-1">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Resolviendo...
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-300 leading-relaxed">
                          {resolvedAddress || 'No se ha cargado la dirección exacta.'}
                        </p>
                      )}
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Latitud</p>
                        <p className="text-xs font-bold font-mono text-white">{selectedUser.lastLocation.lat.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Longitud</p>
                        <p className="text-xs font-bold font-mono text-white">{selectedUser.lastLocation.lng.toFixed(6)}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Última Conexión / Reporte</p>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {selectedUser.lastLocation.updatedAt ? new Date(selectedUser.lastLocation.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="space-y-2.5 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleSetRouteOrigin(selectedUser)}
                        className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-wider border border-white/10"
                      >
                        Como Origen
                      </Button>
                      <Button
                        onClick={() => handleSetRouteDestination(selectedUser)}
                        className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-wider border border-white/10"
                      >
                        Como Destino
                      </Button>
                    </div>

                    <Button 
                      asChild 
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest gap-2"
                    >
                      <a 
                        href={`https://www.google.com/maps?q=${selectedUser.lastLocation.lat},${selectedUser.lastLocation.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" /> Ver en Google Maps Externo
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Empty State Detail card
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-50 p-8 text-center flex flex-col items-center justify-center py-16 ring-1 ring-slate-100/50">
                <div className="h-14 w-14 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-sm mb-4">
                  <Info className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Sin Selección</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold max-w-xs mt-1">
                  Selecciona un nodo activo en el mapa satelital o en la lista de abajo para consultar su ficha detallada.
                </p>
              </Card>
            )}

            {/* List of Located Users matching criteria */}
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex-1 flex flex-col ring-1 ring-slate-100 max-h-[350px]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Registros ({filteredList.length})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-8 pt-0 flex-1 overflow-y-auto space-y-3 pr-4">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="h-8 w-8 text-slate-200 mb-2" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sin resultados</p>
                  </div>
                ) : (
                  filteredList.map((user) => {
                    const isBuyer = user.role === 'buyer';
                    const isSelected = selectedUser?.id === user.id;

                    return (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected 
                            ? 'bg-slate-950 text-white border-slate-900 ring-2 ring-primary/25' 
                            : 'bg-slate-50 hover:bg-slate-100/70 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 ${
                            isBuyer ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {isBuyer ? 'C' : 'A'}
                          </div>
                          <div className="truncate">
                            <h4 className="font-black text-xs uppercase truncate max-w-[140px]">
                              {user.firstName} {user.lastName}
                            </h4>
                            <p className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                              {user.lastLocation.city || 'Ubicación'}, {user.lastLocation.lat.toFixed(4)}, {user.lastLocation.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>

                        <Badge className={`border-none font-black text-[8px] uppercase tracking-wider px-2 py-0.5 ${
                          isBuyer ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {isBuyer ? 'Compra' : 'Socio'}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </DashboardShell>
  )
}
