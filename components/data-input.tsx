"use client"

import type React from "react"

import { useState, useCallback } from "react"
import {
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  User,
  Building,
  Camera,
  Smartphone,
  Globe,
  FileText,
} from "lucide-react"

interface AttendanceRecord {
  NRP: string
  Nama: string
  Unit: string
  "Tanggal Absensi": string
  "Waktu Absensi": string
  Status: string
  "Jenis Absensi": string
  Latitude: string
  Longitude: string
  "Akurasi Lokasi": string
  "URL Foto": string
  "ID Perangkat": string
  "Alamat IP": string
  Deskripsi: string
}

interface DataInputProps {
  data: AttendanceRecord[]
  onDataChange: (newData: AttendanceRecord[]) => void
  onStatusChange: (status: string) => void
}

export function DataInput({ data, onDataChange, onStatusChange }: DataInputProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<AttendanceRecord>({
    NRP: "",
    Nama: "",
    Unit: "",
    "Tanggal Absensi": new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    "Waktu Absensi": new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    Status: "Hadir",
    "Jenis Absensi": "Masuk",
    Latitude: "",
    Longitude: "",
    "Akurasi Lokasi": "",
    "URL Foto": "",
    "ID Perangkat": "",
    "Alamat IP": "",
    Deskripsi: "",
  })

  const [quickInputMode, setQuickInputMode] = useState(false)
  const [bulkInputText, setBulkInputText] = useState("")

  const handleInputChange = useCallback((field: keyof AttendanceRecord, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      onStatusChange("Menyimpan data...")

      try {
        if (editingIndex !== null) {
          // Update existing record
          const response = await fetch("/api/data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rowIndex: editingIndex + 1, record: formData }),
          })

          if (response.ok) {
            const newData = [...data]
            newData[editingIndex] = formData
            onDataChange(newData)
            onStatusChange("✅ Data berhasil diperbarui")
          } else {
            onStatusChange("❌ Gagal memperbarui data")
          }
        } else {
          // Add new record
          const response = await fetch("/api/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ record: formData }),
          })

          if (response.ok) {
            onDataChange([...data, formData])
            onStatusChange("✅ Data berhasil ditambahkan")
          } else {
            onStatusChange("❌ Gagal menambahkan data")
          }
        }

        // Reset form
        setIsFormOpen(false)
        setEditingIndex(null)
        setFormData({
          NRP: "",
          Nama: "",
          Unit: "",
          "Tanggal Absensi": new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          "Waktu Absensi": new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          Status: "Hadir",
          "Jenis Absensi": "Masuk",
          Latitude: "",
          Longitude: "",
          "Akurasi Lokasi": "",
          "URL Foto": "",
          "ID Perangkat": "",
          "Alamat IP": "",
          Deskripsi: "",
        })
      } catch (error) {
        onStatusChange("❌ Terjadi kesalahan")
      }

      setTimeout(() => onStatusChange(""), 3000)
    },
    [formData, editingIndex, data, onDataChange, onStatusChange],
  )

  const handleEdit = useCallback(
    (index: number) => {
      setFormData(data[index])
      setEditingIndex(index)
      setIsFormOpen(true)
    },
    [data],
  )

  const handleDelete = useCallback(
    async (index: number) => {
      if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return

      onStatusChange("Menghapus data...")

      try {
        const response = await fetch(`/api/data?rowIndex=${index + 1}`, {
          method: "DELETE",
        })

        if (response.ok) {
          const newData = data.filter((_, i) => i !== index)
          onDataChange(newData)
          onStatusChange("✅ Data berhasil dihapus")
        } else {
          onStatusChange("❌ Gagal menghapus data")
        }
      } catch (error) {
        onStatusChange("❌ Terjadi kesalahan")
      }

      setTimeout(() => onStatusChange(""), 3000)
    },
    [data, onDataChange, onStatusChange],
  )

  const handleBulkInput = useCallback(() => {
    const lines = bulkInputText.trim().split("\n")
    const newRecords: AttendanceRecord[] = []

    lines.forEach((line) => {
      const parts = line.split("\t")
      if (parts.length >= 3) {
        newRecords.push({
          NRP: parts[0] || "",
          Nama: parts[1] || "",
          Unit: parts[2] || "",
          "Tanggal Absensi": parts[3] || new Date().toLocaleDateString("id-ID"),
          "Waktu Absensi": parts[4] || new Date().toLocaleTimeString("id-ID"),
          Status: parts[5] || "Tepat Waktu",
          "Jenis Absensi": parts[6] || "Masuk",
          Latitude: parts[7] || "",
          Longitude: parts[8] || "",
          "Akurasi Lokasi": parts[9] || "",
          "URL Foto": parts[10] || "",
          "ID Perangkat": parts[11] || "",
          "Alamat IP": parts[12] || "",
          Deskripsi: parts[13] || "",
        })
      }
    })

    if (newRecords.length > 0) {
      onDataChange([...data, ...newRecords])
      setBulkInputText("")
      setQuickInputMode(false)
      onStatusChange(`✅ ${newRecords.length} data berhasil ditambahkan`)
      setTimeout(() => onStatusChange(""), 3000)
    }
  }, [bulkInputText, data, onDataChange, onStatusChange])

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            Latitude: position.coords.latitude.toString(),
            Longitude: position.coords.longitude.toString(),
            "Akurasi Lokasi": position.coords.accuracy.toFixed(2),
          }))
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }, [])

  const units = ["TEKKOM", "RENMIN", "SABHARA", "RESKRIM", "LANTAS", "INTEL", "BINMAS"]
  const statusOptions = ["Hadir", "Terlambat", "Pulang", "Izin"]
  const jenisAbsensi = ["Masuk", "Pulang", "Izin"]

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Data Baru</span>
        </button>

        <button
          onClick={() => setQuickInputMode(!quickInputMode)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>Input Massal</span>
        </button>

        <button
          onClick={getCurrentLocation}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span>Ambil Lokasi</span>
        </button>
      </div>

      {/* Quick/Bulk Input Mode */}
      {quickInputMode && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Input Data Massal</h3>
          <p className="text-sm text-gray-600 mb-4">
            Masukkan data dengan format: NRP [Tab] Nama [Tab] Unit [Tab] Tanggal [Tab] Waktu [Tab] Status...
            <br />
            Setiap baris untuk satu record baru.
          </p>
          <textarea
            value={bulkInputText}
            onChange={(e) => setBulkInputText(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="01030301	John Doe	TEKKOM	8 Juli 2025	07:30:00	Tepat Waktu	Masuk..."
          />
          <div className="flex space-x-2 mt-4">
            <button
              onClick={handleBulkInput}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua</span>
            </button>
            <button
              onClick={() => setQuickInputMode(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingIndex !== null ? "Edit Data Kehadiran" : "Tambah Data Kehadiran"}
                </h2>
                <button
                  onClick={() => {
                    setIsFormOpen(false)
                    setEditingIndex(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      <span>NRP</span>
                    </label>
                    <input
                      type="text"
                      value={formData.NRP}
                      onChange={(e) => handleInputChange("NRP", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      <span>Nama</span>
                    </label>
                    <input
                      type="text"
                      value={formData.Nama}
                      onChange={(e) => handleInputChange("Nama", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4" />
                      <span>Unit</span>
                    </label>
                    <select
                      value={formData.Unit}
                      onChange={(e) => handleInputChange("Unit", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Pilih Unit</option>
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Attendance Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>Tanggal Absensi</span>
                    </label>
                    <input
                      type="text"
                      value={formData["Tanggal Absensi"]}
                      onChange={(e) => handleInputChange("Tanggal Absensi", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4" />
                      <span>Waktu Absensi</span>
                    </label>
                    <input
                      type="text"
                      value={formData["Waktu Absensi"]}
                      onChange={(e) => handleInputChange("Waktu Absensi", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <span>Status</span>
                    </label>
                    <select
                      value={formData.Status}
                      onChange={(e) => handleInputChange("Status", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Latitude</span>
                    </label>
                    <input
                      type="text"
                      value={formData.Latitude}
                      onChange={(e) => handleInputChange("Latitude", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Longitude</span>
                    </label>
                    <input
                      type="text"
                      value={formData.Longitude}
                      onChange={(e) => handleInputChange("Longitude", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <span>Akurasi Lokasi</span>
                    </label>
                    <input
                      type="text"
                      value={formData["Akurasi Lokasi"]}
                      onChange={(e) => handleInputChange("Akurasi Lokasi", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Technical Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Camera className="w-4 h-4" />
                      <span>URL Foto</span>
                    </label>
                    <input
                      type="url"
                      value={formData["URL Foto"]}
                      onChange={(e) => handleInputChange("URL Foto", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Smartphone className="w-4 h-4" />
                      <span>ID Perangkat</span>
                    </label>
                    <input
                      type="text"
                      value={formData["ID Perangkat"]}
                      onChange={(e) => handleInputChange("ID Perangkat", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4" />
                      <span>Alamat IP</span>
                    </label>
                    <input
                      type="text"
                      value={formData["Alamat IP"]}
                      onChange={(e) => handleInputChange("Alamat IP", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <span>Jenis Absensi</span>
                    </label>
                    <select
                      value={formData["Jenis Absensi"]}
                      onChange={(e) => handleInputChange("Jenis Absensi", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {jenisAbsensi.map((jenis) => (
                        <option key={jenis} value={jenis}>
                          {jenis}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>Deskripsi</span>
                  </label>
                  <textarea
                    value={formData.Deskripsi}
                    onChange={(e) => handleInputChange("Deskripsi", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingIndex !== null ? "Perbarui" : "Simpan"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false)
                      setEditingIndex(null)
                    }}
                    className="flex items-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Batal</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Data List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Data Kehadiran Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.slice(-10).map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(data.length - 10 + index)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(data.length - 10 + index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.NRP}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.Nama}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.Unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record["Tanggal Absensi"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record["Waktu Absensi"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.Status === "Hadir"
                          ? "bg-green-100 text-green-800"
                          : record.Status === "Terlambat"
                            ? "bg-red-100 text-red-800"
                            : record.Status === "Pulang"
                              ? "bg-blue-100 text-blue-800"
                              : record.Status === "Izin"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {record.Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
