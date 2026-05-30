from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/predict':
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        try:
            payload = json.loads(body)
        except:
            payload = {}
        prediction = 1 if payload.get('num_comments', 0) > 0 else 0
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'prediction': prediction}).encode('utf-8'))

    def log_message(self, format, *args):
        pass

server = HTTPServer(('127.0.0.1', 5000), H)
print('TEMP ML service listening on http://127.0.0.1:5000/predict')
server.serve_forever()
