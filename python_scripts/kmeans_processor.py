import sys
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

def run_kmeans(data_features, n_clusters_k):
    """
    Performs K-Means clustering on the provided features.

    Args:
        data_features (list of lists): A list where each inner list represents
                                       the features of a data point.
        n_clusters_k (int): The number of clusters (K).

    Returns:
        dict: A dictionary containing 'cluster_labels' (list of int) and
              'cluster_centers' (list of lists).
              Returns None if clustering fails or data is insufficient.
    """
    if not data_features or len(data_features) < n_clusters_k:
        return None

    try:
        # Convert to DataFrame for easier handling, though numpy array is also fine
        df = pd.DataFrame(data_features)

        # Standardize features
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(df)

        # Perform K-Means clustering
        kmeans = KMeans(n_clusters=n_clusters_k, random_state=42, n_init='auto')
        kmeans.fit(scaled_features)

        cluster_labels = kmeans.labels_.tolist()
        # Inverse transform cluster centers to original feature scale if needed for interpretation,
        # but for now, returning scaled centers might be fine or can be decided later.
        # For simplicity, we return the centers in the scaled space.
        # If original scale centers are needed: scaler.inverse_transform(kmeans.cluster_centers_).tolist()
        cluster_centers = kmeans.cluster_centers_.tolist()

        return {
            "cluster_labels": cluster_labels,
            "cluster_centers": cluster_centers
        }
    except Exception as e:
        # Log error to stderr for debugging by the calling Node.js process
        print(f"Error in K-Means processing: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        input_data = json.loads(input_json)

        features = input_data.get("features")
        k = input_data.get("k")

        if features is None or k is None:
            raise ValueError("Missing 'features' or 'k' in input JSON.")

        if not isinstance(features, list) or not all(isinstance(row, list) for row in features):
            raise ValueError("'features' must be a list of lists.")

        if not isinstance(k, int) or k <= 0:
            raise ValueError("'k' must be a positive integer.")

        result = run_kmeans(features, k)

        if result:
            print(json.dumps(result))
        else:
            # Output an error structure if clustering failed
            print(json.dumps({"error": "K-Means clustering failed or data insufficient."}))

    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input."}), file=sys.stderr)
    except ValueError as ve:
        print(json.dumps({"error": str(ve)}), file=sys.stderr)
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}), file=sys.stderr)
