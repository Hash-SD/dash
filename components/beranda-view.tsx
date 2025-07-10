"use client";

import React from 'react';
import { useDashboardData } from '@/app/contexts/DashboardDataProvider';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users, Calendar, TrendingUp, FileText } from 'lucide-react';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
const StatCard = ({ icon: Icon, label, value }: any) => (/* ... sama seperti sebelumnya ... */);

export default function BerandaView() {
  const { kpis, statusChartData } = useDashboardData(); // <- Ambil data dari context

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Records" value={kpis.total} />
        <StatCard icon={Users} label="Personel Hadir" value={kpis.hadir} />
        <StatCard icon={Calendar} label="Tingkat Hadir" value={kpis.hadirRate} />
        <StatCard icon={TrendingUp} label="Total Terlambat" value={kpis.terlambat} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Distribusi Status Kehadiran</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip /> <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
