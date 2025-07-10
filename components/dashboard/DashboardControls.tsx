import React from 'react';
import { Loader2 } from 'lucide-react'; // Hanya Loader2 yang mungkin dibutuhkan jika ada status loading filter

interface DashboardControlsProps {
  uniqueDates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  isLoading: boolean; // Status loading umum untuk menonaktifkan filter jika perlu
  // Tambahkan props lain jika ada kontrol umum lain yang ingin dipindah ke sini
}

const DashboardControls: React.FC<DashboardControlsProps> = ({
  uniqueDates,
  selectedDate,
  onDateChange,
  isLoading,
}) => {
  if (uniqueDates.length === 0 && !isLoading) {
    return null; // Jangan tampilkan apa-apa jika tidak ada tanggal dan tidak sedang loading
  }

  return (
    <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {isLoading && uniqueDates.length === 0 && (
          <div>
            <p className="text-sm text-gray-500 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Memuat filter tanggal...
            </p>
          </div>
        )}
        {uniqueDates.length > 0 && (
           <div className="w-full sm:w-auto"> {/* Penyesuaian lebar */}
            <label htmlFor="dateFilterControls" className="block text-sm font-medium text-gray-700 mb-1">
              Filter Tanggal:
            </label>
            <select
              id="dateFilterControls"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
            >
              {uniqueDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Tempat untuk kontrol lain jika ada */}
      </div>
    </div>
  );
};

export default DashboardControls;
