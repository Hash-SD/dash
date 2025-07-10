"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip, Legend, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Users, Calendar, TrendingUp, FileText } from 'lucide-react';
import InteractiveMap from "@/components/ui/InteractiveMap";

interface AttendanceRecord {
  NRP: string;
  Nama: string;
  Unit: string;
  "Tanggal Absensi": string;
  "Waktu Absensi": string;
  Status: string;
  Latitude: string;
  Longitude: string;
}

interface BerandaViewProps {
  data: AttendanceRecord[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const StatCard = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: number | string }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
    <Icon className="w-8 h-8 text-blue-600" />
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default function BerandaView({ data }: BerandaViewProps) {
  const uniqueDates = useMemo(() => [...new Set(data.map(d => d["Tanggal Absensi"]).filter(Boolean))], [data]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  const filteredData = useMemo(() => {
    if (!selectedDate) return data;
    return data.filter(record => record["Tanggal Absensi"] === selectedDate);
  }, [data, selectedDate]);

  const kpis = useMemo(() => {
      const total = filteredData.length;
      const hadir = filteredData.filter(r => r.Status === "Hadir" || r.Status === "Tepat Waktu").length;
      const terlambat = filteredData.filter(r => r.Status === "Terlambat").length;
      const izin = filteredData.filter(r => r.Status === "Izin").length;
      return { total, hadir, terlambat, izin, hadirRate: total > 0 ? `${((hadir / total) * 100).toFixed(1)}%` : "0%" };
  }, [filteredData]);

  const statusChartData = useMemo(() => [
      { name: "Hadir", value: kpis.hadir },
      { name: "Terlambat", value: kpis.terlambat },
      { name: "Izin", value: kpis.izin },
  ].filter(item => item.value > 0), [kpis]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Records" value={data.length} />
        <StatCard icon={Users} label="Personel Hadir" value={kpis.hadir} />
        <StatCard icon={Calendar} label="Tingkat Hadir" value={kpis.hadirRate} />
        <StatCard icon={TrendingUp} label="Total Terlambat" value={kpis.terlambat} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <label htmlFor="dateFilter" className="font-medium mr-3">Filter Tanggal:</label>
        <select id="dateFilter" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border-gray-300 rounded-md">
          {uniqueDates.map(date => <option key={date} value={date}>{date}</option>)}
        </select>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peta Sebaran Absensi</h3>
        <InteractiveMap records={filteredData} selectedDate={selectedDate} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Distribusi Status Kehadiran</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
