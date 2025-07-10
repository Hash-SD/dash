"use client"

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Loader2, ScatterChartIcon as Scatter3D } from 'lucide-react'; // Hanya ikon yang relevan
import { AttendanceRecord, ProcessedFeatureSet, calculateFeatures as calculateFeaturesUtil } from '@/lib/dataProcessor'; // Impor dari utilitas
// calculateFeaturesUtil adalah alias untuk calculateFeatures dari dataProcessor

// Definisikan interface yang spesifik untuk klaster di sini untuk sementara
// atau impor dari file tipe global jika ada
export interface ClusterPoint {
  x: number;
  y: number;
  cluster: number;
  record: AttendanceRecord; // Atau tipe data record yang lebih spesifik jika perlu
  features: number[]; // Fitur numerik yang digunakan untuk visualisasi/tooltip
}

export interface ClusterCenter { // Untuk pusat klaster visualisasi jika dihitung di frontend
  x: number;
  y: number;
}

// Props untuk komponen ClusterAnalysisView
interface ClusterAnalysisViewProps {
  data: AttendanceRecord[]; // Data absensi mentah
  // Tambahkan props lain jika ada konfigurasi atau handler yang perlu diteruskan dari parent
  // Misalnya, jika ada state global tertentu yang masih relevan
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]; // Bisa juga diimpor jika global
const clusterNames = ["Disiplin Tinggi", "Disiplin Sedang", "Perlu Pembinaan", "Inkonsisten", "Bermasalah"]; // Sama

const ClusterAnalysisView: React.FC<ClusterAnalysisViewProps> = ({ data: rawData }) => {
  const [kValue, setKValue] = useState(3);
  const [personnelFeatures, setPersonnelFeatures] = useState<ProcessedFeatureSet[]>([]); // Menggunakan ProcessedFeatureSet
  const [clusterLabels, setClusterLabels] = useState<number[]>([]);
  const [backendClusterCenters, setBackendClusterCenters] = useState<number[][]>([]); // Jika masih relevan
  const [isKmeansLoading, setIsKmeansLoading] = useState(false);
  const [kmeansError, setKmeansError] = useState<string | null>(null);

  // State for frontend visualization of clusters
  const [clusters, setClusters] = useState<ClusterPoint[]>([]);
  const [clusterCenters, setClusterCenters] = useState<ClusterCenter[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  // State for table filters in Cluster Analysis page
  const [tableClusterFilter, setTableClusterFilter] = useState<string>("all");
  const [tableUnitFilter, setTableUnitFilter] = useState<string>("all");
  const [tableNameSearchTerm, setTableNameSearchTerm] = useState<string>("");

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Placeholder untuk konten JSX yang akan dipindahkan
  // Logika useEffect dan fungsi-fungsi lain juga akan dipindahkan ke sini

  // useEffects dipindahkan ke sini

  // 1. useEffect untuk menjalankan kalkulasi fitur dan K-Means
  useEffect(() => {
    if (rawData.length > 0) {
      const extractedFeatureObjects = calculateFeaturesUtil(rawData);
      setPersonnelFeatures(extractedFeatureObjects);

      const numericalFeatures = extractedFeatureObjects.map(f => f.features);

      if (numericalFeatures.length > 0) {
        runKMeansBackend(numericalFeatures, kValue);
      } else {
        // Jika tidak ada fitur numerik, reset state terkait K-Means
        setClusterLabels([]);
        setBackendClusterCenters([]);
        setClusters([]);
        setClusterCenters([]);
        setKmeansError(null); // Reset error juga
      }
    } else {
      // Jika rawData kosong, reset semua state terkait fitur dan klaster
      setPersonnelFeatures([]);
      setClusterLabels([]);
      setBackendClusterCenters([]);
      setClusters([]);
      setClusterCenters([]);
      setKmeansError(null);
    }
  }, [rawData, kValue, runKMeansBackend]); // calculateFeaturesUtil adalah fungsi murni, tidak perlu jadi dependensi useCallback-nya calculateFeatures

  // 2. useEffect untuk memproses hasil K-Means (clusterLabels) untuk visualisasi
  useEffect(() => {
    try {
      if (personnelFeatures.length > 0 && clusterLabels.length === personnelFeatures.length) {
        const newClustersForVisualization: ClusterPoint[] = personnelFeatures
          .map((featureSet, index) => {
            if (!featureSet || typeof featureSet !== 'object') {
              console.warn(`Invalid featureSet at index ${index}:`, featureSet);
              return null;
            }
            const x = typeof featureSet.avgArrivalTime === 'number' ? featureSet.avgArrivalTime : 480;
            const y = typeof featureSet.tardinessRate === 'number' ? featureSet.tardinessRate : 0;
            const cluster = typeof clusterLabels[index] === 'number' ? clusterLabels[index] : 0;
            const record = featureSet.record || {} as AttendanceRecord; // Pastikan record adalah AttendanceRecord
            const features = Array.isArray(featureSet.features) ? featureSet.features : [];

            return { x, y, cluster, record, features, };
          })
          .filter((item): item is ClusterPoint => item !== null);

        setClusters(newClustersForVisualization);

        const newVisCenters: ClusterCenter[] = [];
        for (let i = 0; i < kValue; i++) {
          const pointsInCluster = newClustersForVisualization.filter(p => p && typeof p.cluster === 'number' && p.cluster === i);
          if (pointsInCluster.length > 0) {
            const validPoints = pointsInCluster.filter(p => typeof p.x === 'number' && typeof p.y === 'number');
            if (validPoints.length > 0) {
              const avgX = validPoints.reduce((sum, p) => sum + p.x, 0) / validPoints.length;
              const avgY = validPoints.reduce((sum, p) => sum + p.y, 0) / validPoints.length;
              newVisCenters.push({ x: avgX, y: avgY });
            } else {
              newVisCenters.push({ x: 480, y: 0 });
            }
          } else {
            newVisCenters.push({ x: 480, y: 0});
          }
        }
        setClusterCenters(newVisCenters);

      } else if (clusterLabels.length === 0 && personnelFeatures.length > 0) {
        setClusters([]);
        setClusterCenters([]);
      }
    } catch (error) {
      console.error("Error updating cluster visualization:", error);
      setClusters([]);
      setClusterCenters([]);
      if (!kmeansError) { // Hanya set error jika belum ada error dari backend K-Means
        setKmeansError("Terjadi kesalahan saat memproses data klaster untuk visualisasi.");
      }
    }
  }, [clusterLabels, personnelFeatures, kValue, kmeansError]); // rawData tidak diperlukan lagi di sini jika personnelFeatures sudah benar


  // Fungsi runKMeansBackend dipindahkan ke sini
  const runKMeansBackend = useCallback(async (featuresToCluster: number[][], k: number) => {
    if (featuresToCluster.length < k) {
      setKmeansError("Jumlah data tidak cukup untuk jumlah klaster yang dipilih.");
      setClusterLabels([]);
      setBackendClusterCenters([]);
      return;
    }
    setIsKmeansLoading(true);
    setKmeansError(null);
    try {
      // Menggunakan URL API K-Means dari environment variable atau hardcode jika perlu
      // Untuk saat ini, kita asumsikan endpoint API K-Means yang sebelumnya digunakan masih sama.
      // Jika API K-Means sekarang adalah Java backend, pastikan URL-nya benar.
      const apiUrl = process.env.NEXT_PUBLIC_KMEANS_API_URL || "/api/kmeans"; // Sesuaikan jika perlu

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: featuresToCluster, k }),
      });

      if (!response.ok) {
        let errorMessage = `K-Means API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.cluster_labels || !Array.isArray(result.cluster_labels) ||
          !result.cluster_centers || !Array.isArray(result.cluster_centers) ||
          result.cluster_labels.length !== featuresToCluster.length ||
          result.cluster_centers.length !== k) {
        throw new Error("Invalid response structure from K-Means API");
      }

      setClusterLabels(result.cluster_labels);
      setBackendClusterCenters(result.cluster_centers);
    } catch (error: any) {
      console.error("Error running K-Means backend:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal menjalankan K-Means di backend.";
      setKmeansError(errorMessage);
      setClusterLabels([]);
      setBackendClusterCenters([]);
    } finally {
      setIsKmeansLoading(false);
    }
  }, []); // Dependensi akan disesuaikan jika ada state/props yang digunakan

  // Fungsi generateAIAnalysis dipindahkan ke sini
  const generateAIAnalysis = useCallback(async () => {
    if (clusters.length === 0 || personnelFeatures.length === 0) {
        setAiAnalysis("<p>Data klaster tidak cukup untuk analisis AI. Jalankan K-Means terlebih dahulu.</p>");
        return;
    }
    setIsAnalyzing(true);
    setAiAnalysis("");

    try {
      const clusterSummary = Array.from({ length: kValue }, (_, i) => {
        const membersInCluster = personnelFeatures.filter((pf, index) =>
          pf && typeof pf === 'object' &&
          clusterLabels[index] !== undefined &&
          clusterLabels[index] === i
        );

        if (membersInCluster.length === 0) return null;

        const safeAverage = (values: number[]) => values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

        const avgArrivalValues = membersInCluster.map(m => typeof m.avgArrivalTime === 'number' ? m.avgArrivalTime : 480).filter(v => !isNaN(v));
        const avgTardinessValues = membersInCluster.map(m => typeof m.tardinessRate === 'number' ? m.tardinessRate : 0).filter(v => !isNaN(v));
        const avgHadirValues = membersInCluster.map(m => typeof m.total_hadir === 'number' ? m.total_hadir : 0).filter(v => !isNaN(v));
        const avgTerlambatValues = membersInCluster.map(m => typeof m.total_terlambat === 'number' ? m.total_terlambat : 0).filter(v => !isNaN(v));
        const avgIzinValues = membersInCluster.map(m => typeof m.total_izin === 'number' ? m.total_izin : 0).filter(v => !isNaN(v));
        // Menggunakan rata2_akurasi_lokasi, jumlah_ip_berbeda, jumlah_perangkat_berbeda dari personnelFeatures
        const avgAkurasiValues = membersInCluster.map(m => typeof m.rata2_akurasi_lokasi === 'number' ? m.rata2_akurasi_lokasi : 10).filter(v => !isNaN(v));
        const avgIpValues = membersInCluster.map(m => typeof m.jumlah_ip_berbeda === 'number' ? m.jumlah_ip_berbeda : 1).filter(v => !isNaN(v));
        const avgPerangkatValues = membersInCluster.map(m => typeof m.jumlah_perangkat_berbeda === 'number' ? m.jumlah_perangkat_berbeda : 1).filter(v => !isNaN(v));

        const avgArrival = safeAverage(avgArrivalValues);
        const avgTardiness = safeAverage(avgTardinessValues);
        const avgHadir = safeAverage(avgHadirValues);
        const avgTerlambat = safeAverage(avgTerlambatValues);
        const avgIzin = safeAverage(avgIzinValues);
        const avgAkurasi = safeAverage(avgAkurasiValues);
        const avgIpBerbeda = safeAverage(avgIpValues);
        const avgPerangkatBerbeda = safeAverage(avgPerangkatValues);

        // Penamaan klaster bisa tetap di sini atau disesuaikan
        let dynamicClusterName = clusterNames[i] || `Klaster ${i + 1}`; // Default name
        // Logika penamaan dinamis berdasarkan metrik (contoh sederhana)
        if (avgTardiness < 5 && avgArrival < 480 && avgIpBerbeda <= 1.2) dynamicClusterName = "Disiplin Tinggi";
        else if (avgTardiness < 15 && avgIpBerbeda <= 2) dynamicClusterName = "Disiplin Sedang";
        else if (avgTardiness < 30) dynamicClusterName = "Perlu Pembinaan";
        else if (avgIpBerbeda > 3 || avgPerangkatBerbeda > 2) dynamicClusterName = "Inkonsisten";
        else dynamicClusterName = "Bermasalah";

        return {
          cluster: i,
          name: dynamicClusterName,
          memberCount: membersInCluster.length,
          avgArrivalTime: `${Math.floor(avgArrival / 60)}:${String(Math.floor(avgArrival % 60)).padStart(2, "0")}`,
          tardinessRate: `${avgTardiness.toFixed(1)}%`,
          avgHadir: avgHadir.toFixed(1),
          avgTerlambat: avgTerlambat.toFixed(1),
          avgIzin: avgIzin.toFixed(1),
          avgAkurasiLokasi: `${avgAkurasi.toFixed(1)}m`,
          avgIpBerbeda: avgIpBerbeda.toFixed(1),
          avgPerangkatBerbeda: avgPerangkatBerbeda.toFixed(1),
          members: membersInCluster.map((pf) => ({
            nama: (pf.record && pf.record.Nama) ? String(pf.record.Nama) : "",
            unit: (pf.record && pf.record.Unit) ? String(pf.record.Unit) : "",
            nrp: (pf.record && pf.record.NRP) ? String(pf.record.NRP) : "",
          })),
          unitDistribution: membersInCluster.reduce(
            (acc, pf) => {
              const unit = (pf.record && pf.record.Unit) ? String(pf.record.Unit) : "Unknown";
              acc[unit] = (acc[unit] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        };
      }).filter(Boolean);

      if (!clusterSummary || clusterSummary.length === 0) {
          setAiAnalysis("<p>Tidak ada ringkasan klaster yang valid untuk dikirim ke AI.</p>");
          setIsAnalyzing(false);
          return;
      }

      const response = await fetch("/api/analyze", { // Asumsi endpoint API Analisis masih sama
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ clusterSummary }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate analysis: HTTP ${response.status}`)
      }

      const result = await response.json()
      if (result.analysis) {
        setAiAnalysis(result.analysis)
      } else {
        throw new Error("Invalid response from analysis API")
      }
    } catch (error) {
      console.error("Error generating AI analysis:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setAiAnalysis(`<p>Error generating analysis: ${errorMessage}. Please check your API configuration and try again.</p>`)
    } finally {
      setIsAnalyzing(false)
    }
  }, [clusters, personnelFeatures, clusterLabels, kValue, aiAnalysis]); // Dependensi disesuaikan


  return (
    <div>
      {isKmeansLoading && !kmeansError && ( // Tampilkan banner loading K-Means jika sedang loading dan tidak ada error sebelumnya
        <div className="space-y-6 mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-6 rounded-xl">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900">Memproses Analisis K-Means</h3>
                <p className="text-purple-700 mt-1">
                  Sistem sedang mengelompokkan personel berdasarkan pola absensi. Proses ini mungkin membutuhkan beberapa saat...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {kmeansError && ( // Tampilkan pesan error K-Means jika ada
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-red-700 text-sm font-medium">Error K-Means:</p>
              <p className="text-red-600 text-sm">{kmeansError}</p>
          </div>
      )}

      {/* Konten utama Analisis Klaster */}
      {/* Kondisi ini mungkin perlu disesuaikan berdasarkan kapan kita ingin menampilkan UI vs pesan 'data tidak cukup' */}
      {/* Untuk saat ini, kita asumsikan jika tidak loading dan tidak error, kita coba tampilkan UI nya */}
      {(!isKmeansLoading && !kmeansError && rawData.length > 0 && personnelFeatures.length > 0 && clusterLabels.length > 0) ? (
        <>
          {/* K-Means Controls & Summary Cards */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <label htmlFor="kValueSelectCA" className="text-sm font-medium text-gray-700">Jumlah Klaster (K):</label>
                <select
                  id="kValueSelectCA"
                  value={kValue}
                  onChange={(e) => setKValue(Number.parseInt(e.target.value))}
                  disabled={isKmeansLoading}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
                >
                  {[2, 3, 4, 5].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generateAIAnalysis}
                disabled={isAnalyzing || isKmeansLoading || clusterLabels.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scatter3D className="w-4 h-4" />
                )}
                <span>{isAnalyzing ? "Menganalisis..." : "Buat Analisis AI"}</span>
              </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${kValue <= 4 ? `lg:grid-cols-${kValue}` : 'lg:grid-cols-4'} gap-4 mb-6`}>
              {Array.from({ length: kValue }, (_, i) => {
                const membersInThisCluster = personnelFeatures.filter((pf, index) => clusterLabels[index] === i);
                const clusterName = clusterNames[i] || `Klaster ${i + 1}`;
                return (
                  <div
                    key={`summary-card-${i}`}
                    className="p-4 rounded-lg shadow-sm border"
                    style={{ borderColor: COLORS[i % COLORS.length], backgroundColor: `${COLORS[i % COLORS.length]}1A` }}
                  >
                    <h4 className="text-md font-semibold mb-1" style={{ color: COLORS[i % COLORS.length] }}>{clusterName}</h4>
                    <p className="text-2xl font-bold text-gray-800">{membersInThisCluster.length}</p>
                    <p className="text-xs text-gray-600">Personel</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                   <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Personel per Klaster</h3>
                   <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                          <Pie
                              data={Array.from({ length: kValue }, (_, i) => ({
                                  name: clusterNames[i] || `Klaster ${i + 1}`,
                                  value: clusterLabels.filter(label => label === i).length,
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent, value }) => value > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                          >
                              {Array.from({ length: kValue }, (_, i) => (
                                  <Cell key={`cell-pie-${i}`} fill={COLORS[i % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                      </PieChart>
                  </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Karakteristik Rata-rata Klaster</h3>
                  <ResponsiveContainer width="100%" height={300}>
                          {(() => {
                              const metrics = [
                                  { key: 'avgTotalHadir', name: 'Avg Hadir', max: 0},
                                  { key: 'avgTotalTerlambat', name: 'Avg Terlambat', max: 0 },
                                  { key: 'avgTotalIzin', name: 'Avg Izin', max: 0 },
                                  { key: 'avgJamMasuk', name: 'Avg Jam Masuk (min)', max: 0 },
                                  { key: 'avgAkurasiLokasi', name: 'Avg Akurasi (m)', max: 0 },
                                  { key: 'avgIpBerbeda', name: 'Avg IP Unik', max: 0 },
                                  { key: 'avgPerangkatBerbeda', name: 'Avg Perangkat Unik', max: 0 }
                              ];

                              const radarChartData = metrics.map(metric => {
                                  const entry: any = { metric: metric.name };
                                  let currentMax = 0;
                                  Array.from({ length: kValue }, (_, i) => {
                                      const clusterKey = clusterNames[i] || `Klaster ${i + 1}`;
                                      const members = personnelFeatures.filter((pf, index) => clusterLabels[index] === i);
                                      if (members.length > 0) {
                                          let value = 0;
                                          switch (metric.key) {
                                              case 'avgTotalHadir': value = members.reduce((sum, m) => sum + m.total_hadir, 0) / members.length; break;
                                              case 'avgTotalTerlambat': value = members.reduce((sum, m) => sum + m.total_terlambat, 0) / members.length; break;
                                              case 'avgTotalIzin': value = members.reduce((sum, m) => sum + m.total_izin, 0) / members.length; break;
                                              case 'avgJamMasuk': value = members.reduce((sum, m) => sum + m.avgArrivalTime, 0) / members.length; break; // Menggunakan avgArrivalTime
                                              case 'avgAkurasiLokasi': value = members.reduce((sum, m) => sum + m.rata2_akurasi_lokasi, 0) / members.length; break;
                                              case 'avgIpBerbeda': value = members.reduce((sum, m) => sum + m.jumlah_ip_berbeda, 0) / members.length; break;
                                              case 'avgPerangkatBerbeda': value = members.reduce((sum, m) => sum + m.jumlah_perangkat_berbeda, 0) / members.length; break;
                                          }
                                          entry[clusterKey] = parseFloat(value.toFixed(2));
                                          if (entry[clusterKey] > currentMax) currentMax = entry[clusterKey];
                                      } else {
                                          entry[clusterKey] = 0;
                                      }
                                  });
                                  entry.fullMark = currentMax > 0 ? Math.ceil(currentMax * 1.2) : 1;
                                  if (metric.key === 'avgJamMasuk') entry.fullMark = Math.max(currentMax, 600);
                                  if (metric.key === 'avgAkurasiLokasi') entry.fullMark = Math.max(currentMax, 50);
                                  return entry;
                              });

                              if (radarChartData.every(d => metrics.every(m => d[(clusterNames[0] || `Klaster 1`)] === undefined))) {
                                  return <p className="text-gray-500 text-center py-10">Data tidak cukup untuk Radar Chart.</p>;
                              }

                              return (
                                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                                      <PolarGrid />
                                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0) : value} />
                                      {Array.from({ length: kValue }, (_, i) => {
                                          const clusterNameKey = clusterNames[i] || `Klaster ${i + 1}`;
                                          if (radarChartData.some(d => d[clusterNameKey] !== undefined && d[clusterNameKey] > 0)) {
                                              return (
                                                  <Radar
                                                      key={`radar-series-${i}`}
                                                      name={clusterNameKey}
                                                      dataKey={clusterNameKey}
                                                      stroke={COLORS[i % COLORS.length]}
                                                      fill={COLORS[i % COLORS.length]}
                                                      fillOpacity={0.5}
                                                  />
                                              );
                                          }
                                          return null;
                                      })}
                                      <Legend />
                                      <Tooltip />
                                  </RadarChart>
                              );
                          })()}
                      </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Pola Klaster (K-Means)</h3>
            {(isKmeansLoading || clusters.length === 0 && !kmeansError) ? ( // Tampilkan loader atau pesan jika sedang loading atau clusters kosong (dan tidak ada error)
              <div className="flex items-center justify-center h-[500px] text-gray-500">
                {isKmeansLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <p>Data tidak cukup untuk visualisasi atau sedang diproses.</p>}
              </div>
            ) : kmeansError && clusters.length === 0 ? ( // Jika ada error dan clusters kosong
                 <div className="flex items-center justify-center h-[500px] text-red-500">
                    <p>Gagal memvisualisasikan klaster karena error: {kmeansError}</p>
                 </div>
            ) : ( // Jika tidak loading, tidak error, dan clusters ada data
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Rata-rata Waktu Kedatangan (menit)"
                    domain={['dataMin - 15', 'dataMax + 15']}
                    tickFormatter={(time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Tingkat Keterlambatan (%)"
                    unit="%"
                    domain={[0, 'dataMax + 10']}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pointData = payload[0].payload as ClusterPoint;
                        if (!pointData || !pointData.record) return null;

                        const cName = clusterNames[pointData.cluster] || `Klaster ${pointData.cluster + 1}`;
                        const arrivalTime = typeof pointData.x === 'number' ? `${Math.floor(pointData.x / 60)}:${String(Math.floor(pointData.x % 60)).padStart(2, '0')}` : 'N/A';
                        const tardiness = typeof pointData.y === 'number' ? `${pointData.y.toFixed(1)}%` : 'N/A';

                        return (
                          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                            <p className="font-semibold">{pointData.record.Nama || 'N/A'}</p>
                            <p>Unit: {pointData.record.Unit || 'N/A'}</p>
                            <p>Klaster: {cName}</p>
                            <p>Avg Kedatangan: {arrivalTime}</p>
                            <p>Tingkat Terlambat: {tardiness}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {Array.from({ length: kValue }).map((_, i) => (
                    <Scatter
                      key={`cluster-scatter-${i}`}
                      name={clusterNames[i] || `Klaster ${i + 1}`}
                      data={clusters.filter(p => p.cluster === i)} // clusters adalah state lokal
                      fill={COLORS[i % COLORS.length]}
                      // onClick={() => setSelectedCluster(selectedCluster === i ? null : i)} // Jika ingin interaktivitas klik
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Personel per Klaster</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                      <label htmlFor="tableClusterFilterCA" className="block text-sm font-medium text-gray-700">Filter Klaster:</label>
                      <select
                          id="tableClusterFilterCA"
                          value={tableClusterFilter}
                          onChange={(e) => setTableClusterFilter(e.target.value)}
                          disabled={isKmeansLoading || personnelFeatures.length === 0}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70"
                      >
                          <option value="all">Semua Klaster</option>
                          {Array.from({ length: kValue }, (_, i) => (
                              <option key={`filter-opt-${i}`} value={i}>
                                  {clusterNames[i] || `Klaster ${i + 1}`}
                              </option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="tableUnitFilterCA" className="block text-sm font-medium text-gray-700">Filter Unit Kerja:</label>
                      <select
                          id="tableUnitFilterCA"
                          value={tableUnitFilter}
                          onChange={(e) => setTableUnitFilter(e.target.value)}
                          disabled={isKmeansLoading || personnelFeatures.length === 0}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70"
                      >
                          <option value="all">Semua Unit</option>
                          {[...new Set(personnelFeatures.map(pf => pf.record.Unit || "Tidak Diketahui"))].sort().map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="tableNameSearchCA" className="block text-sm font-medium text-gray-700">Cari Nama Personel:</label>
                      <input
                          type="text"
                          id="tableNameSearchCA"
                          value={tableNameSearchTerm}
                          onChange={(e) => setTableNameSearchTerm(e.target.value)}
                          disabled={isKmeansLoading || personnelFeatures.length === 0}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70"
                          placeholder="Ketik nama..."
                      />
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRP</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klaster</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Jam Masuk</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Terlambat</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Izin</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Unik</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Unik</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                              const filteredPersonnel = personnelFeatures
                                  .map((pf, index) => ({ ...pf, clusterLabel: clusterLabels[index] }))
                                  .filter(pf =>
                                      (tableClusterFilter === "all" || (pf.clusterLabel !== undefined && pf.clusterLabel.toString() === tableClusterFilter)) &&
                                      (tableUnitFilter === "all" || (pf.record.Unit || "Tidak Diketahui") === tableUnitFilter) &&
                                      (tableNameSearchTerm === "" || (pf.record.Nama || "").toLowerCase().includes(tableNameSearchTerm.toLowerCase()))
                                  );

                              if (filteredPersonnel.length === 0) {
                                  return (
                                      <tr>
                                          <td colSpan={9} className="text-center py-4 text-gray-500">
                                              Tidak ada data personel yang cocok dengan filter.
                                          </td>
                                      </tr>
                                  );
                              }

                              return filteredPersonnel.map((pf, index) => (
                                  <tr key={pf.nrp || `person-${index}-${pf.clusterLabel}`}>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.record.NRP}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">{pf.record.Nama}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.record.Unit || "Tidak Diketahui"}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                                          <span
                                              className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                              style={{
                                                  backgroundColor: `${COLORS[pf.clusterLabel % COLORS.length]}33`,
                                                  color: COLORS[pf.clusterLabel % COLORS.length]
                                              }}
                                          >
                                              {clusterNames[pf.clusterLabel] || `Klaster ${pf.clusterLabel + 1}`}
                                          </span>
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                          {`${Math.floor(pf.avgArrivalTime / 60)}:${String(Math.floor(pf.avgArrivalTime % 60)).padStart(2, "0")}`}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.total_terlambat}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.total_izin}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.jumlah_ip_berbeda}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.jumlah_perangkat_berbeda}</td>
                                  </tr>
                              ));
                          })()}
                      </tbody>
                  </table>
              </div>
               {(personnelFeatures.length === 0 && !isKmeansLoading) && <p className="text-center text-gray-500 py-4">Tidak ada data personel untuk ditampilkan.</p>}
          </div>

          {aiAnalysis && !isAnalyzing && (
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Insight Analisis AI</h3>
              <div
                className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none"
                dangerouslySetInnerHTML={{ __html: aiAnalysis || "<p>Belum ada analisis AI.</p>" }}
              />
            </div>
          )}
           {isAnalyzing && (
              <div className="mt-8 flex items-center justify-center p-6 bg-white rounded-lg shadow-md">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                  <p className="text-lg text-gray-700">Memproses analisis AI, mohon tunggu...</p>
              </div>
          )}
        </>
      ) : ( // Jika tidak loading, tidak error, TAPI tidak ada data cukup untuk klaster
        (!isKmeansLoading && !kmeansError) && ( // Hanya tampilkan jika tidak loading dan tidak ada error utama
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Scatter3D className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Analisis Klaster Belum Dapat Ditampilkan</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                    {rawData.length === 0
                    ? "Data absensi belum tersedia. Silakan unggah atau muat data terlebih dahulu pada halaman Beranda."
                    : "Data tidak cukup atau belum diproses untuk analisis klaster. Pastikan K-Means telah berhasil dijalankan."
                    }
                </p>
                {/* Tidak menampilkan tombol "Coba Ulang Analisis" di sini karena pemicunya adalah data dari props */}
                </div>
            </div>
        )
      )}
    </div>
  );
};

export default ClusterAnalysisView;
