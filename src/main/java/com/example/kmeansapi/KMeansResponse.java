package com.example.kmeansapi;

import java.util.List;

public class KMeansResponse {
    private List<Integer> clusterLabels;
    private List<List<Double>> clusterCenters;

    // Constructors
    public KMeansResponse() {
    }

    public KMeansResponse(List<Integer> clusterLabels, List<List<Double>> clusterCenters) {
        this.clusterLabels = clusterLabels;
        this.clusterCenters = clusterCenters;
    }

    // Getters and Setters
    public List<Integer> getClusterLabels() {
        return clusterLabels;
    }

    public void setClusterLabels(List<Integer> clusterLabels) {
        this.clusterLabels = clusterLabels;
    }

    public List<List<Double>> getClusterCenters() {
        return clusterCenters;
    }

    public void setClusterCenters(List<List<Double>> clusterCenters) {
        this.clusterCenters = clusterCenters;
    }
}
