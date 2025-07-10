package com.example.kmeansapi;

import java.util.List;

public class KMeansRequest {
    private List<List<Double>> features;
    private int k;

    // Constructors
    public KMeansRequest() {
    }

    public KMeansRequest(List<List<Double>> features, int k) {
        this.features = features;
        this.k = k;
    }

    // Getters and Setters
    public List<List<Double>> getFeatures() {
        return features;
    }

    public void setFeatures(List<List<Double>> features) {
        this.features = features;
    }

    public int getK() {
        return k;
    }

    public void setK(int k) {
        this.k = k;
    }
}
