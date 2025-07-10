// File Location: app/api/kmeans/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { kmeans } from "ml-kmeans";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { features, k } = body;

    // Robust input validation
    if (!Array.isArray(features) || features.length < k) {
      return NextResponse.json(
        { error: "Data tidak valid atau jumlah data kurang dari nilai K." },
        { status: 400 }
      );
    }

    const result = kmeans(features, k, { initialization: "kmeans++" });

    const response = {
      cluster_labels: result.clusters,
      cluster_centers: result.centroids.map(c => c.centroid),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error("Error in K-Means API (JavaScript):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server.", details: error.message },
      { status: 500 }
    );
  }
}
