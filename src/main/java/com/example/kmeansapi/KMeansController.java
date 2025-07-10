package com.example.kmeansapi;

import org.apache.commons.math3.ml.clustering.Cluster;
import org.apache.commons.math3.ml.clustering.DoublePoint;
import org.apache.commons.math3.ml.clustering.KMeansPlusPlusClusterer;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin; // Tambahkan impor ini

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Mengizinkan request dari semua origin, sesuaikan jika perlu
public class KMeansController {

    @PostMapping("/kmeans")
    public ResponseEntity<Object> runKMeans(@RequestBody KMeansRequest request) {
        try {
            if (request.getFeatures() == null || request.getFeatures().isEmpty()) {
                return ResponseEntity.badRequest().body("{\"error\": \"Fitur tidak boleh kosong.\"}");
            }
            if (request.getK() <= 0) {
                return ResponseEntity.badRequest().body("{\"error\": \"Jumlah cluster (k) harus lebih besar dari 0.\"}");
            }
            if (request.getFeatures().size() < request.getK()) {
                return ResponseEntity.badRequest().body("{\"error\": \"Jumlah fitur harus lebih besar atau sama dengan jumlah cluster (k).\"}");
            }

            // Konversi List<List<Double>> menjadi List<DoublePoint> untuk Apache Commons Math
            List<DoublePoint> points = request.getFeatures().stream()
                    .map(featureList -> new DoublePoint(featureList.stream().mapToDouble(Double::doubleValue).toArray()))
                    .collect(Collectors.toList());

            // Inisialisasi K-Means++ Clusterer
            KMeansPlusPlusClusterer<DoublePoint> clusterer = new KMeansPlusPlusClusterer<>(request.getK());

            // Jalankan clustering
            List<Cluster<DoublePoint>> clusterResults = clusterer.cluster(points);

            // Siapkan hasil response
            List<Integer> clusterLabels = new ArrayList<>(points.size());
            // Inisialisasi label dengan -1 (atau nilai default lain jika perlu)
            for (int i = 0; i < points.size(); i++) {
                clusterLabels.add(-1);
            }

            List<List<Double>> clusterCenters = new ArrayList<>();

            for (int i = 0; i < clusterResults.size(); i++) {
                Cluster<DoublePoint> cluster = clusterResults.get(i);
                // Ambil pusat cluster
                double[] center = cluster.getCenter().getPoint();
                clusterCenters.add(Arrays.stream(center).boxed().collect(Collectors.toList()));

                // Tetapkan label untuk setiap titik dalam cluster ini
                for (DoublePoint point : cluster.getPoints()) {
                    // Cari indeks titik asli untuk menetapkan label
                    for (int j = 0; j < points.size(); j++) {
                        if (points.get(j).equals(point)) {
                            clusterLabels.set(j, i); // Label cluster adalah indeks cluster
                            break;
                        }
                    }
                }
            }

            // Pastikan semua poin memiliki label
            // Ini penting karena cara commons-math mengembalikan poin per cluster
            // mungkin tidak secara langsung memberi kita pemetaan 1:1 ke poin input asli
            // dengan urutan yang sama. Kita perlu mencocokkannya kembali.
            int[] labelsArray = new int[points.size()];
            for(int i=0; i < points.size(); i++){
                DoublePoint currentPoint = points.get(i);
                int closestClusterIndex = -1;
                double minDistance = Double.MAX_VALUE;
                for(int clusterIdx = 0; clusterIdx < clusterCenters.size(); clusterIdx++){
                    DoublePoint centerPoint = new DoublePoint(clusterCenters.get(clusterIdx).stream().mapToDouble(Double::doubleValue).toArray());
                    double distance = currentPoint.distanceFrom(centerPoint);
                    if(distance < minDistance){
                        minDistance = distance;
                        closestClusterIndex = clusterIdx;
                    }
                }
                labelsArray[i] = closestClusterIndex;
            }
            clusterLabels = Arrays.stream(labelsArray).boxed().collect(Collectors.toList());


            KMeansResponse response = new KMeansResponse(clusterLabels, clusterCenters);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            // Log exception e
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Terjadi kesalahan internal saat memproses K-Means: " + e.getMessage() + "\"}");
        }
    }
}
