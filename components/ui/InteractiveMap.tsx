"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define the props for the component
interface AttendanceRecord {
  NRP: string;
  Nama: string;
  Unit: string;
  "Tanggal Absensi": string;
  "Waktu Absensi": string;
  Status: string;
  "Jenis Absensi": string;
  Latitude: string | number; // Can be string or number
  Longitude: string | number; // Can be string or number
  "Akurasi Lokasi"?: string | number;
  "URL Foto"?: string;
  "ID Perangkat"?: string;
  "Alamat IP"?: string;
  Deskripsi?: string;
}

interface InteractiveMapProps {
  records: AttendanceRecord[];
  selectedDate?: string; // To potentially re-center map if date changes
}

// Fix for default icon issue with Webpack
// These are the paths to the default Leaflet marker icons
// You might need to copy these from node_modules/leaflet/dist/images/ to your public/images folder
// and adjust the paths accordingly if they don't load correctly.
const iconPath = '/images/leaflet/marker-icon.png'; // Default path, adjust if needed
const iconRetinaPath = '/images/leaflet/marker-icon-2x.png'; // Default path, adjust if needed
const shadowPath = '/images/leaflet/marker-shadow.png'; // Default path, adjust if needed

const defaultIcon = new L.Icon({
  iconUrl: iconPath,
  iconRetinaUrl: iconRetinaPath,
  shadowUrl: shadowPath,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// Custom icons based on status
const createStatusIcon = (status: string): L.Icon | L.DivIcon => {
  let iconColor = 'blue'; // Default
  if (status === 'Tepat Waktu' || status === 'Hadir') {
    iconColor = 'green';
  } else if (status === 'Terlambat') {
    iconColor = 'orange';
  } else if (status === 'Izin' || status === 'Sakit') {
    iconColor = 'grey';
  } else if (status === 'Pulang') {
    iconColor = 'purple';
  }

  // Using L.DivIcon for colored circles, easier than managing multiple image files
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<span style="background-color:${iconColor};width:1rem;height:1rem;border-radius:50%;display:inline-block;border:1px solid white;"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6], // Center of the circle
    popupAnchor: [0, -6]
  });
};


const RecenterAutomatically = ({center}: {center: LatLngExpression}) => {
  const map = useMap();
   useEffect(() => {
      map.setView(center);
   }, [center, map]);
   return null;
}


const InteractiveMap: React.FC<InteractiveMapProps> = ({ records }) => {
  if (typeof window === 'undefined') {
    // Don't render a map on the server
    return null;
  }

  const validRecords = records.filter(
    (record) =>
      record.Latitude &&
      record.Longitude &&
      !isNaN(parseFloat(String(record.Latitude))) &&
      !isNaN(parseFloat(String(record.Longitude)))
  );

  // Calculate initial center of the map
  let mapCenter: LatLngExpression = [-6.200000, 106.816666]; // Default to Jakarta
  if (validRecords.length > 0) {
    const latitudes = validRecords.map(r => parseFloat(String(r.Latitude)));
    const longitudes = validRecords.map(r => parseFloat(String(r.Longitude)));
    mapCenter = [
      latitudes.reduce((a, b) => a + b, 0) / latitudes.length,
      longitudes.reduce((a, b) => a + b, 0) / longitudes.length,
    ];
  }

  if (validRecords.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
        Tidak ada data lokasi yang valid untuk ditampilkan pada peta untuk tanggal yang dipilih.
      </div>
    );
  }

  return (
    <MapContainer center={mapCenter} zoom={10} style={{ height: '500px', width: '100%' }} scrollWheelZoom={true}>
      <RecenterAutomatically center={mapCenter} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validRecords.map((record, index) => {
        const position: LatLngExpression = [
          parseFloat(String(record.Latitude)),
          parseFloat(String(record.Longitude)),
        ];
        const statusIcon = createStatusIcon(record.Status);

        return (
          <Marker key={`${record.NRP}-${index}`} position={position} icon={statusIcon}>
            <Popup>
              <strong>{record.Nama} ({record.NRP})</strong><br />
              Unit: {record.Unit}<br />
              Status: {record.Status} ({record["Waktu Absensi"]})<br />
              Akurasi: {record["Akurasi Lokasi"] ? `${record["Akurasi Lokasi"]} meter` : 'N/A'}<br />
              {record["URL Foto"] && <a href={record["URL Foto"]} target="_blank" rel="noopener noreferrer">Lihat Foto</a>}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default InteractiveMap;
