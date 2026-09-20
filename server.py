import http.server
import socketserver
import ssl
import os
import threading
import datetime
import ipaddress
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

import socket

HTTPS_PORT = 8443
HTTP_PORT = 8085
CERT_FILE = "cert.pem"
KEY_FILE = "key.pem"

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '172.30.1.25'

LOCAL_IP = get_local_ip()

def create_self_signed_cert():
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        return True

    print(f"생성 중: 태블릿 마이크 전용 HTTPS 보안 인증서 (IP: {LOCAL_IP})...")
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "KR"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Gemini Math Live HUD"),
        x509.NameAttribute(NameOID.COMMON_NAME, LOCAL_IP),
    ])

    san_list = [
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.IPv4Address(LOCAL_IP)),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
    ]

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3650))
        .add_extension(x509.SubjectAlternativeName(san_list), critical=False)
        .sign(key, hashes.SHA256())
    )

    with open(CERT_FILE, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    with open(KEY_FILE, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))

    print(f"인증서 생성 완료: {CERT_FILE}, {KEY_FILE}")
    return True

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Feature-Policy', "microphone *")
        self.send_header('Permissions-Policy', "microphone=(self)")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def run_servers():
    create_self_signed_cert()
    
    CustomHandler.extensions_map.update({
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.css': 'text/css'
    })

    # 1. HTTP 서버 스레드 (크롬 플래그 및 터널링 전용 포트)
    def start_http():
        try:
            http_server = ThreadedHTTPServer(('0.0.0.0', HTTP_PORT), CustomHandler)
            http_server.serve_forever()
        except Exception as err:
            print(f"HTTP 서버 실행 오류: {err}")

    t_http = threading.Thread(target=start_http, daemon=True)
    t_http.start()

    # 2. HTTPS 서버 (사설 인증서 포트)
    httpd = ThreadedHTTPServer(('0.0.0.0', HTTPS_PORT), CustomHandler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    print("==================================================================")
    print("  [Gemini Math Live HUD - HTTP & HTTPS 듀얼 서버 가동 완료]")
    print(f"  ★ [방법 1] 크롬 플래그 순수 HTTP: http://{LOCAL_IP}:{HTTP_PORT}")
    print(f"  ★ [기존] 사설 인증서 HTTPS:       https://{LOCAL_IP}:{HTTPS_PORT}")
    print(f"  ★ [PC 로컬]:                     http://localhost:{HTTP_PORT}")
    print("==================================================================")
    
    httpd.serve_forever()

if __name__ == '__main__':
    run_servers()
