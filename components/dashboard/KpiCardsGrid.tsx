import React from 'react';
import { Users, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface KpiProps {
  total: number;
  hadirRate: string; // Ini adalah string seperti "90.0%"
  terlambat: number; // Jumlah personel yang terlambat
  izin: number;
  // Tambahkan properti lain jika ada yang digunakan oleh kartu KPI
}

interface KpiCardsGridProps {
  kpis: KpiProps;
}

const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ kpis }) => {
  // Hitung persentase keterlambatan di sini jika belum ada di kpis
  // Untuk konsistensi, kita asumsikan kpis.total bisa 0.
  const keterlambatanRate = kpis.total > 0 ? ((kpis.terlambat / kpis.total) * 100).toFixed(1) : "0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Personel</p>
            <p className="text-3xl font-black text-foreground">{kpis.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Karyawan terdaftar</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-100 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Tingkat Kehadiran</p>
            <p className="text-3xl font-black text-foreground">{kpis.hadirRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Dari total hari kerja</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Keterlambatan</p>
            <p className="text-3xl font-black text-foreground">{keterlambatanRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{kpis.terlambat} dari {kpis.total} personel</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-100 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Izin & Sakit</p>
            <p className="text-3xl font-black text-foreground">{kpis.izin}</p>
            <p className="text-xs text-muted-foreground mt-1">Total perizinan</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-amber-50 rounded-full group-hover:bg-amber-100 transition-colors">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiCardsGrid;
