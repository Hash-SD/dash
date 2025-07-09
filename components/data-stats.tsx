"use client"

import { Users, FileText, Calendar, TrendingUp } from "lucide-react"

interface DataStatsProps {
  data: any[]
  fileName: string
}

export function DataStats({ data, fileName }: DataStatsProps) {
  const totalRecords = data.length
  const uniquePersonnel = new Set(data.map((record) => record.NRP)).size
  const uniqueDates = new Set(data.map((record) => record["Tanggal Absensi"])).size
  const uniqueUnits = new Set(data.map((record) => record.Unit)).size

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <FileText className="w-8 h-8 text-blue-600" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Total Records</p>
            <p className="text-xl font-bold text-gray-900">{totalRecords}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Users className="w-8 h-8 text-green-600" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Personel</p>
            <p className="text-xl font-bold text-gray-900">{uniquePersonnel}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-purple-600" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Hari Kerja</p>
            <p className="text-xl font-bold text-gray-900">{uniqueDates}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-orange-600" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Unit Kerja</p>
            <p className="text-xl font-bold text-gray-900">{uniqueUnits}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
