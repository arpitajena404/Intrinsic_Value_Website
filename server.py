import http.server
import json
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CMSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/save-config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                config = payload.get('config')
                file_path = payload.get('filePath')
                
                if not config or not file_path:
                    raise ValueError("Missing config or filePath in payload")
                
                # Resolve path safely to ensure it stays in DIRECTORY
                safe_path = os.path.abspath(os.path.join(DIRECTORY, file_path))
                if not safe_path.startswith(DIRECTORY):
                    raise PermissionError("Access denied: path is outside directory root")
                
                # Format javascript content based on the filename
                var_name = "VSL_CONFIG"
                if "live_config" in file_path:
                    var_name = "LIVE_CONFIG"
                
                js_content = f"var {var_name} = {json.dumps(config, indent=4)};\n"
                
                with open(safe_path, 'w', encoding='utf-8') as f:
                    f.write(js_content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'message': f'Config saved directly to {file_path}.'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': False, 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    print(f"Starting CMS Local Server on http://localhost:{PORT}")
    print(f"Serving directory: {DIRECTORY}")
    server = http.server.HTTPServer(('localhost', PORT), CMSRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
