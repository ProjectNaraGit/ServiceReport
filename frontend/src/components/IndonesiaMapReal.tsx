import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { geoMercator, geoPath } from "d3-geo";

type GeoFeature = {
  properties: {
    kode?: string | number;
    ID?: string | number;
    Propinsi?: string;
    NAME_1?: string;
    name?: string;
  };
  geometry: any;
};

type Partner = {
  id: number;
  name: string;
  address: string;
};

type Province = {
  id: string;
  name: string;
  partners: Partner[];
};

const mockProvinces: Province[] = [
  {
    id: "11",
    name: "ACEH",
    partners: [
      { id: 1, name: "RSU Cut Nyak Dhien", address: "Jl. T. Hamzah Bendahara No. 7, Banda Aceh" },
      { id: 2, name: "RSU Zainoel Abidin", address: "Jl. Tgk. Daud Beureueh No. 108, Banda Aceh" },
    ],
  },
  {
    id: "12",
    name: "SUMATERA UTARA",
    partners: [
      { id: 3, name: "RSUP H. Adam Malik", address: "Jl. Bunga Lau No. 17, Medan" },
      { id: 4, name: "RSU Pirngadi", address: "Jl. HM. Yamin No. 47, Medan" },
      { id: 5, name: "RSU Martha Friska", address: "Jl. Jamin Ginting Km 7,5, Medan" },
      { id: 6, name: "RSU Elisabeth", address: "Jl. Listrik No. 12, Medan" },
    ],
  },
  {
    id: "13",
    name: "SUMATERA BARAT",
    partners: [
      { id: 7, name: "RSUP Dr. M. Djamil", address: "Jl. Perintis Kemerdekaan No. 1, Padang" },
      { id: 8, name: "RSU Ibnu Sina", address: "Jl. Khatib Sulaiman No. 53, Padang" },
    ],
  },
  {
    id: "14",
    name: "RIAU",
    partners: [
      { id: 9, name: "RSU Arifin Achmad", address: "Jl. Diponegoro No. 155, Pekanbaru" },
    ],
  },
  {
    id: "15",
    name: "JAMBI",
    partners: [
      { id: 10, name: "RSU Raden Mattaher", address: "Jl. Slamet Riyadi No. 105, Jambi" },
    ],
  },
  {
    id: "16",
    name: "SUMATERA SELATAN",
    partners: [
      { id: 11, name: "RSUP Dr. Mohammad Hoesin", address: "Jl. Jend. Sudirman Km 3,5, Palembang" },
      { id: 12, name: "RSU Siloam", address: "Jl. Demang Lebar Daun No. 12, Palembang" },
      { id: 13, name: "RSU Charitas", address: "Jl. Jend. A. Yani No. 55, Palembang" },
    ],
  },
  {
    id: "17",
    name: "BENGKULU",
    partners: [
      { id: 14, name: "RSU M. Yunus", address: "Jl. KZ. Abubakar Ali No. 20, Bengkulu" },
    ],
  },
  {
    id: "18",
    name: "LAMPUNG",
    partners: [
      { id: 15, name: "RSU Abdul Muluk", address: "Jl. Diponegoro No. 45, Bandar Lampung" },
      { id: 16, name: "RSU Imanuel", address: "Jl. Dr. Cipto Mangunkusumo No. 1, Bandar Lampung" },
    ],
  },
  {
    id: "31",
    name: "DKI JAKARTA",
    partners: [
      { id: 17, name: "RSUP Cipto Mangunkusumo", address: "Jl. Diponegoro No. 71, Jakarta Pusat" },
      { id: 18, name: "RSU Pondok Indah", address: "Jl. Metro Duta Kav. UE, Pondok Indah, Jakarta Selatan" },
      { id: 19, name: "RSU Siloam Kebon Jeruk", address: "Jl. Raya Kebon Jeruk No. 44, Jakarta Barat" },
      { id: 20, name: "RSU Mayapada", address: "Jl. Lebak Bulus I No. 29, Jakarta Selatan" },
    ],
  },
  {
    id: "32",
    name: "JAWA BARAT",
    partners: [
      { id: 21, name: "RSUP Hasan Sadikin", address: "Jl. Pasteur No. 38, Bandung" },
      { id: 22, name: "RSU Borromeus", address: "Jl. Ir. H. Juanda No. 100, Bandung" },
      { id: 23, name: "RSU Santosa", address: "Jl. Kesehatan No. 6, Bandung" },
    ],
  },
  {
    id: "33",
    name: "JAWA TENGAH",
    partners: [
      { id: 24, name: "RSUP Dr. Kariadi", address: "Jl. Dr. Sutomo No. 16, Semarang" },
      { id: 25, name: "RSU Panti Wilasa", address: "Jl. Citarum No. 24, Semarang" },
    ],
  },
  {
    id: "34",
    name: "DAERAH ISTIMEWA YOGYAKARTA",
    partners: [
      { id: 26, name: "RSUP Dr. Sardjito", address: "Jl. Kesehatan No. 1, Yogyakarta" },
      { id: 27, name: "RSU Bethesda", address: "Jl. Jend. Sudirman No. 70, Yogyakarta" },
    ],
  },
  {
    id: "35",
    name: "JAWA TIMUR",
    partners: [
      { id: 28, name: "RSUP Dr. Soetomo", address: "Jl. Mayjen Prof. Dr. Moestopo No. 6-8, Surabaya" },
      { id: 29, name: "RSU Dr. Soetomo", address: "Jl. Arief Rachman Hakim No. 150, Surabaya" },
      { id: 30, name: "RSU Haji Surabaya", address: "Jl. Ahmad Yani No. 2-4, Surabaya" },
      { id: 31, name: "RSU Siloam Surabaya", address: "Jl. Raya Gubeng Pojok No. 1, Surabaya" },
    ],
  },
  {
    id: "36",
    name: "BANTEN",
    partners: [
      { id: 32, name: "RSU Tangerang", address: "Jl. General Sudirman No. 1, Tangerang" },
    ],
  },
];

export default function IndonesiaMapReal() {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province.json")
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Failed to load GeoJSON:", err));
  }, []);

  const normalizeProvinceName = (name: string) => {
    return name.toUpperCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
  };

  const findProvinceByGeoData = (provinceCode: string, provinceName: string, geoProperties: any) => {
    const normalizedGeoName = normalizeProvinceName(provinceName);
    
    // Try multiple matching strategies
    const province = mockProvinces.find(p => 
      p.id === provinceCode ||
      normalizeProvinceName(p.name) === normalizedGeoName ||
      normalizeProvinceName(p.name) === normalizeProvinceName(geoProperties.NAME_1 || '') ||
      normalizeProvinceName(p.name) === normalizeProvinceName(geoProperties.name || '') ||
      normalizeProvinceName(p.name) === normalizeProvinceName(geoProperties.Propinsi || '')
    );
    
    return province;
  };

  const getProvinceColor = (provinceCode: string, provinceName: string, geoProperties: any) => {
    const province = findProvinceByGeoData(provinceCode, provinceName, geoProperties);
    const partnerCount = province?.partners.length || 0;
    if (partnerCount === 0) return "#f3f4f6"; // gray-100
    if (partnerCount <= 3) return "#fef3c7"; // amber-100 (yellow)
    return "#d1fae5"; // emerald-100 (green)
  };

  const handleProvinceClick = (provinceCode: string, provinceName: string, geoProperties: any) => {
    const province = findProvinceByGeoData(provinceCode, provinceName, geoProperties);
    if (province) {
      setSelectedProvince(province);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;
    
    setMousePos({ x: newX, y: newY });
  };

  const handleMouseEnter = (provinceCode: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredProvince(provinceCode);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setHoveredProvince(null);
  };

  const closePanel = () => {
    setSelectedProvince(null);
  };

  const getProvinceName = (provinceCode: string, geoProperties: any) => {
    return geoProperties.Propinsi || geoProperties.NAME_1 || geoProperties.name || 'Unknown';
  };

  // Memoize projection and paths
  const projectionAndPath = useMemo(() => {
    const projection = geoMercator()
      .center([118, -2])
      .scale(800);
    const path = geoPath().projection(projection);
    return { projection, path };
  }, []);

  // Precompute all SVG paths
  const svgPaths = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map((feature: GeoFeature, index: number) => ({
      feature,
      provinceCode: feature.properties.kode?.toString() || feature.properties.ID?.toString(),
      provinceName: feature.properties.Propinsi || feature.properties.NAME_1 || feature.properties.name || 'Unknown',
      path: projectionAndPath.path(feature) || ''
    }));
  }, [geoData, projectionAndPath]);

  // Memoize province matching
  const memoizedFindProvince = useCallback((provinceCode: string, provinceName: string, geoProperties: any) => {
    return findProvinceByGeoData(provinceCode, provinceName, geoProperties);
  }, []);

  // Throttled mouse move handler
  const throttledMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  // Tooltip portal component
  const TooltipPortal = ({ children, x, y }: { children: React.ReactNode; x: number; y: number }) => {
    if (!children) return null;
    
    return createPortal(
      <div
        style={{
          position: 'fixed',
          left: x + 20,
          top: y - 40,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
        className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg"
      >
        {children}
      </div>,
      document.body
    );
  };

  return (
    <div className="relative w-full bg-white rounded-2xl overflow-hidden">
      <svg
        ref={svgRef}
        viewBox="130 80 700 400"
        className="w-full h-full"
        style={{ maxHeight: "500px" }}
        onMouseMove={handleMouseMove}
      >
        {svgPaths.map(({ feature, provinceCode, provinceName, path }, index) => {
          const isHovered = hoveredProvince === provinceCode;
          
          return (
            <g key={feature.properties.ID || provinceCode} style={{ zIndex: index }}>
              <path
                d={path}
                fill={memoizedFindProvince(provinceCode, provinceName, feature.properties) ? getProvinceColor(provinceCode, provinceName, feature.properties) : '#f3f4f6'}
                stroke="#e5e7eb"
                strokeWidth="0.5"
                className="cursor-pointer transition-all duration-200 hover:stroke-slate-400 hover:stroke-1"
                onMouseEnter={() => handleMouseEnter(provinceCode)}
                onMouseLeave={() => handleMouseLeave()}
                onClick={() => handleProvinceClick(provinceCode, provinceName, feature.properties)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip Portal */}
      {hoveredProvince && (() => {
        const hoveredFeature = geoData.features.find((f: any) => 
          (f.properties.kode?.toString() || f.properties.ID?.toString()) === hoveredProvince
        );
        if (hoveredFeature) {
          const provinceCode = hoveredFeature.properties.kode?.toString() || hoveredFeature.properties.ID?.toString();
          const provinceName = hoveredFeature.properties.Propinsi || hoveredFeature.properties.NAME_1 || hoveredFeature.properties.name || 'Unknown';
          
          return (
            <TooltipPortal x={mousePos.x} y={mousePos.y}>
              <div className="text-xs font-medium text-slate-700">
                {getProvinceName(provinceCode, hoveredFeature.properties)}: {memoizedFindProvince(provinceCode, provinceName, hoveredFeature.properties)?.partners.length || 0} mitra
              </div>
            </TooltipPortal>
          );
        }
        return null;
      })()}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-700 mb-2">Legenda</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></div>
            <span className="text-xs text-slate-600">0-3 mitra</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></div>
            <span className="text-xs text-slate-600">&gt;3 mitra</span>
          </div>
        </div>
      </div>

      {/* Partner Detail Panel */}
      {selectedProvince && (
        <div className="absolute inset-0 bg-white bg-opacity-95 rounded-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Mitra di {selectedProvince.name}
            </h3>
            <button
              onClick={closePanel}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {selectedProvince.partners.map((partner) => (
              <div key={partner.id} className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-900">{partner.name}</h4>
                <p className="text-sm text-slate-600 mt-1">{partner.address}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
