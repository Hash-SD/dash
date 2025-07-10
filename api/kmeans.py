import sys
import json
from http.server import BaseHTTPRequestHandler

# Menambahkan direktori skrip kustom ke dalam path
sys.path.append('python_scripts')
from kmeans_processor import run_kmeans

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            input_data = json.loads(post_data)
            
            features = input_data.get("features")
            k = input_data.get("k")

            if features is None or k is None:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Input 'features' dan 'k' diperlukan"}).encode('utf-8'))
                return

            result = run_kmeans(features, k)

            if result:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Proses K-Means gagal"}).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        return
