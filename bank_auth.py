#!/usr/bin/env python3
"""
Bank character SSO auth — gets a refresh token with wallet read scope.
Opens browser, captures the token, saves to bank_token.json.
"""

import http.server
import urllib.parse
import webbrowser
import hashlib
import base64
import secrets
import json
import time

SSO_AUTH_URL = "https://login.eveonline.com/v2/oauth/authorize"
SSO_TOKEN_URL = "https://login.eveonline.com/v2/oauth/token"

# Use the pokerin.space client ID
CLIENT_ID = "018838babf9943a2a3644af51eae2197"
CALLBACK_PORT = 19847
CALLBACK_URL = f"http://localhost:{CALLBACK_PORT}/callback"

# Only need wallet read for the bank character
SCOPES = "publicData esi-wallet.read_character_wallet.v1"

token_result = None
server_should_stop = False


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global token_result, server_should_stop
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/callback":
            params = urllib.parse.parse_qs(parsed.query)
            if "code" in params:
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"<html><body><h2>Bank character authorized!</h2>"
                                b"<p>You can close this window.</p></body></html>")
                token_result = params["code"][0]
                server_should_stop = True
            elif "error" in params:
                self.send_response(400)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                error = params.get("error", ["unknown"])[0]
                desc = params.get("error_description", [""])[0]
                self.wfile.write(f"<html><body><h2>Error</h2><p>{error}: {desc}</p></body></html>".encode())
                server_should_stop = True
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    global token_result, server_should_stop

    # PKCE
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()

    state = secrets.token_urlsafe(32)
    auth_params = {
        "response_type": "code",
        "redirect_uri": CALLBACK_URL,
        "client_id": CLIENT_ID,
        "scope": SCOPES,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    auth_url = f"{SSO_AUTH_URL}?{urllib.parse.urlencode(auth_params)}"

    server = http.server.HTTPServer(("127.0.0.1", CALLBACK_PORT), CallbackHandler)
    server.timeout = 1

    print(f"\nOpening browser for EVE SSO login...")
    print(f"Log in as your BANK CHARACTER.\n")
    webbrowser.open(auth_url)

    print("Waiting for login...")
    while not server_should_stop:
        server.handle_request()
    server.server_close()

    if not token_result:
        print("Login failed.")
        return

    # Exchange code for tokens
    import requests
    print("Exchanging code for token...")
    resp = requests.post(SSO_TOKEN_URL, data={
        "grant_type": "authorization_code",
        "code": token_result,
        "client_id": CLIENT_ID,
        "redirect_uri": CALLBACK_URL,
        "code_verifier": verifier,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})

    if resp.status_code != 200:
        print(f"Token exchange failed: {resp.status_code}")
        print(resp.text)
        return

    data = resp.json()
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # Decode JWT to get character info
    parts = access_token.split(".")
    payload = parts[1] + "=" * (4 - len(parts[1]) % 4)
    decoded = json.loads(base64.urlsafe_b64decode(payload))

    char_name = decoded.get("name", "unknown")
    char_id = decoded.get("sub", "").split(":")[-1]

    print(f"\n{'='*50}")
    print(f"Character: {char_name}")
    print(f"Character ID: {char_id}")
    print(f"Refresh Token: {refresh_token[:20]}...")
    print(f"{'='*50}")

    output = {
        "character_name": char_name,
        "character_id": int(char_id),
        "refresh_token": refresh_token,
        "access_token": access_token,
        "obtained_at": time.time(),
    }
    with open("bank_token.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to bank_token.json")
    print(f"\nAdd these to the server .env:")
    print(f"  BANK_CHARACTER_ID={char_id}")
    print(f"  BANK_REFRESH_TOKEN={refresh_token}")


if __name__ == "__main__":
    main()
