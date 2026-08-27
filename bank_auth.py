#!/usr/bin/env python3
"""Authorize the EVE bank character and protect its refresh credential."""

from __future__ import annotations

import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import tempfile
import urllib.parse
import webbrowser
from pathlib import Path

import httpx

SSO_AUTH_URL = "https://login.eveonline.com/v2/oauth/authorize"
SSO_TOKEN_URL = "https://login.eveonline.com/v2/oauth/token"

# Use the pokerin.space client ID.
CLIENT_ID = "018838babf9943a2a3644af51eae2197"
CALLBACK_PORT = 19847
CALLBACK_URL = f"http://localhost:{CALLBACK_PORT}/callback"

# Only wallet read is required for the bank character.
SCOPES = "publicData esi-wallet.read_character_wallet.v1"
TOKEN_FILE = Path("bank_token.json")
TOKEN_REQUEST_TIMEOUT_SECONDS = 30.0

token_result: str | None = None
expected_state: str | None = None
server_should_stop = False


class BankAuthError(RuntimeError):
    """A safe operator-facing authorization failure."""


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def _send_html(self, status: int, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        global token_result, server_should_stop

        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self._send_html(404, b"<html><body><h2>Not found</h2></body></html>")
            return

        params = urllib.parse.parse_qs(parsed.query)
        returned_state = params.get("state", [None])[0]
        if returned_state != expected_state:
            self._send_html(
                400,
                b"<html><body><h2>Authorization could not be verified.</h2>"
                b"<p>Close this window and try again.</p></body></html>",
            )
            server_should_stop = True
            return

        if "code" in params:
            self._send_html(
                200,
                b"<html><body><h2>Bank character authorized!</h2>"
                b"<p>You can close this window.</p></body></html>",
            )
            token_result = params["code"][0]
            server_should_stop = True
            return

        self._send_html(
            400,
            b"<html><body><h2>Authorization failed.</h2>"
            b"<p>Close this window and try again.</p></body></html>",
        )
        server_should_stop = True

    def log_message(self, format: str, *args: object) -> None:
        # The default handler logs the callback URL, including its one-time code.
        return


def _capture_authorization_code() -> tuple[str, str]:
    """Run the local PKCE callback flow and return its code and verifier."""
    global expected_state, server_should_stop, token_result

    token_result = None
    server_should_stop = False

    verifier = secrets.token_urlsafe(64)[:128]
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()

    state = secrets.token_urlsafe(32)
    expected_state = state
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
    try:
        print("Opening browser for EVE SSO login.")
        print("Log in as the bank character.")
        webbrowser.open(auth_url)

        print("Waiting for login...")
        while not server_should_stop:
            server.handle_request()
    finally:
        server.server_close()
        expected_state = None

    if not token_result:
        raise BankAuthError("EVE SSO authorization did not return a code; try again")
    return token_result, verifier


def _exchange_code(code: str, verifier: str) -> tuple[str, str]:
    """Exchange an authorization code without exposing response contents."""
    request_failed = False
    try:
        response = httpx.post(
            SSO_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": CLIENT_ID,
                "redirect_uri": CALLBACK_URL,
                "code_verifier": verifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TOKEN_REQUEST_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError:
        request_failed = True

    if request_failed:
        raise BankAuthError(
            "The EVE token exchange request failed; try authorization again"
        )

    if response.status_code != 200:
        raise BankAuthError(
            f"The EVE token exchange returned HTTP {response.status_code}; "
            "try authorization again"
        )

    invalid_response = False
    try:
        data = response.json()
        access_token = data["access_token"]
        refresh_token = data["refresh_token"]
        if not isinstance(access_token, str) or not access_token:
            raise ValueError
        if not isinstance(refresh_token, str) or not refresh_token:
            raise ValueError
    except Exception:
        invalid_response = True

    if invalid_response:
        # JSON/parser exceptions can carry response fragments. Raise only after
        # leaving the handler so the safe error has no token-bearing context.
        raise BankAuthError(
            "The EVE token exchange returned an invalid response; try authorization again"
        )

    return access_token, refresh_token


def _character_id_from_access_token(access_token: str) -> int:
    """Read the EVE character ID from the short-lived JWT payload."""
    invalid_token = False
    try:
        payload_segment = access_token.split(".")[1]
        padding = "=" * (-len(payload_segment) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_segment + padding))
        character_id = int(payload["sub"].rsplit(":", 1)[-1])
        if character_id <= 0:
            raise ValueError
    except Exception:
        invalid_token = True

    if invalid_token:
        raise BankAuthError(
            "EVE returned an access token without a valid character ID; "
            "try authorization again"
        )
    return character_id


def _write_credentials(
    output_path: Path,
    *,
    character_id: int,
    refresh_token: str,
) -> None:
    """Atomically write the minimal long-lived credential file.

    ``mkstemp`` creates the temporary file as owner-only on POSIX. We also set
    that mode explicitly before the atomic replacement. On platforms without
    POSIX modes, the file inherits the containing directory's access controls.
    """
    output_path = Path(output_path)
    temporary_path: Path | None = None
    descriptor = -1
    write_failed = False
    try:
        descriptor, temporary_name = tempfile.mkstemp(
            dir=output_path.parent,
            prefix=f".{output_path.name}.",
            suffix=".tmp",
        )
        temporary_path = Path(temporary_name)
        if os.name == "posix":
            os.fchmod(descriptor, 0o600)

        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            descriptor = -1
            json.dump(
                {
                    "character_id": character_id,
                    "refresh_token": refresh_token,
                },
                handle,
                indent=2,
            )
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())

        os.replace(temporary_path, output_path)
        temporary_path = None
    except Exception:
        if descriptor >= 0:
            os.close(descriptor)
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                pass
        write_failed = True

    if write_failed:
        raise BankAuthError(
            "Could not save the bank credential file; check directory permissions"
        )


def _report_success(output_path: Path, character_id: int) -> None:
    protected_path = Path(output_path).resolve()
    print(f"Bank character {character_id} authorized.")
    print(f"Credential saved atomically to: {protected_path}")
    print("Owner-only file permissions were applied where the platform supports them.")
    print(
        "Keep that file private. To invalidate the credential, revoke the EVE SSO "
        "authorization; run this tool again to reauthorize."
    )


def main(output_path: Path = TOKEN_FILE) -> int:
    try:
        code, verifier = _capture_authorization_code()
        print("Exchanging the authorization code securely...")
        access_token, refresh_token = _exchange_code(code, verifier)
        character_id = _character_id_from_access_token(access_token)
        _write_credentials(
            output_path,
            character_id=character_id,
            refresh_token=refresh_token,
        )
    except BankAuthError as exc:
        print(f"Bank authorization failed: {exc}", file=sys.stderr)
        return 1
    except Exception:
        # Never render arbitrary exception text: HTTP/JSON exceptions may carry
        # response data, and OAuth responses can contain credential material.
        print(
            "Bank authorization failed unexpectedly; no token details were logged. "
            "Try again.",
            file=sys.stderr,
        )
        return 1

    _report_success(output_path, character_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
