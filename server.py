import http.server
import json
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CMSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Clean URL rewrites for analytics sub-portal
        if self.path.startswith('/analytics'):
            path_part = self.path.split('?')[0]
            if path_part.endswith('/'):
                path_part = path_part[:-1]
                
            parts = [p for p in path_part.split('/') if p]
            if len(parts) == 1:
                self.path = '/analytics/frontend/pages/dashboard.html'
            elif len(parts) == 2:
                page_name = parts[1]
                potential_file = os.path.join(DIRECTORY, 'analytics', 'frontend', 'pages', f'{page_name}.html')
                if os.path.exists(potential_file):
                    self.path = f'/analytics/frontend/pages/{page_name}.html'
        
        # Route clean URL root asset requests back to the analytics folders
        elif self.path.startswith('/css/') or self.path.startswith('/js/') or self.path.startswith('/assets/') or self.path.startswith('/static/'):
            root_asset_path = os.path.join(DIRECTORY, self.path.lstrip('/'))
            if not os.path.exists(root_asset_path):
                if self.path.startswith('/static/'):
                    self.path = '/analytics/frontend/assets/' + self.path[8:]
                else:
                    self.path = '/analytics/frontend' + self.path
                    
        return super().do_GET()

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
                
                if file_path.endswith('.json'):
                    with open(safe_path, 'w', encoding='utf-8') as f:
                        json.dump(config, f, indent=4)
                    
                    # Run static compilation scripts automatically
                    import subprocess
                    if "homepage_config.json" in file_path or "pricing.json" in file_path:
                        subprocess.run(['node', 'scripts/update_homepage.js'], cwd=DIRECTORY, shell=True)
                        subprocess.run(['node', 'scripts/update_pricing.js'], cwd=DIRECTORY, shell=True)
                else:
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
                self.wfile.write(json.dumps(response).encode('utf-8'))
        elif self.path == '/api/upload-file':
            try:
                import cgi
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': self.headers['Content-Type']}
                )
                file_item = form['file']
                folder = form.getfirst('folder', '')
                
                if file_item.filename:
                    fn = os.path.basename(file_item.filename)
                    target_dir = os.path.join(DIRECTORY, folder)
                    os.makedirs(target_dir, exist_ok=True)
                    
                    with open(os.path.join(target_dir, fn), 'wb') as f:
                        f.write(file_item.file.read())
                        
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(b'{"success":true,"message":"File uploaded locally successfully."}')
                    return
                else:
                    raise ValueError("No file found in request")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'message': str(e)}).encode('utf-8'))
        elif self.path == '/api/git-push':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                commit_msg = payload.get('commitMessage', '').strip()
                if not commit_msg:
                    import datetime
                    commit_msg = f"CMS Update: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                
                import subprocess
                
                # 1. git add .
                add_res = subprocess.run(['git', 'add', '.'], capture_output=True, text=True, cwd=DIRECTORY, shell=True)
                if add_res.returncode != 0:
                    raise RuntimeError(f"git add failed:\nStdout: {add_res.stdout}\nStderr: {add_res.stderr}")
                
                # 2. Check if there are changes to commit
                status_res = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True, cwd=DIRECTORY, shell=True)
                if not status_res.stdout.strip():
                    # Nothing new to commit, but try pushing just in case there are unpushed commits
                    push_res = subprocess.run(['git', 'push'], capture_output=True, text=True, cwd=DIRECTORY, shell=True)
                    output_log = f"No new changes to commit.\ngit push output:\n{push_res.stdout}\n{push_res.stderr}"
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, 'message': output_log}).encode('utf-8'))
                    return

                # 3. git commit -m "message"
                commit_res = subprocess.run(['git', 'commit', '-m', commit_msg], capture_output=True, text=True, cwd=DIRECTORY, shell=True)
                if commit_res.returncode != 0:
                    raise RuntimeError(f"git commit failed:\nStdout: {commit_res.stdout}\nStderr: {commit_res.stderr}")
                
                # 4. git push
                push_res = subprocess.run(['git', 'push'], capture_output=True, text=True, cwd=DIRECTORY, shell=True)
                if push_res.returncode != 0:
                    raise RuntimeError(f"git push failed:\nStdout: {push_res.stdout}\nStderr: {push_res.stderr}")
                
                output_log = f"Staged, committed, and pushed changes successfully!\n\nCommit output:\n{commit_res.stdout}\n\nPush output:\n{push_res.stdout}\n{push_res.stderr}"
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'message': output_log}
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
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
