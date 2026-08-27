"""Credential-safety tests for the local EVE bank authorization tool."""

from __future__ import annotations

import base64
import json
import os
import stat
from pathlib import Path

import httpx
import pytest

import bank_auth


class FakeResponse:
    def __init__(self, status_code: int, payload: object = None) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def _fake_access_token(character_id: int) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": f"CHARACTER:EVE:{character_id}"}).encode()
    ).rstrip(b"=").decode()
    return f"header.{payload}.signature"


def test_token_exchange_failure_never_exposes_response_body(monkeypatch) -> None:
    access_secret = "ACCESS_RESPONSE_SENTINEL"
    refresh_secret = "REFRESH_RESPONSE_SENTINEL"
    response = FakeResponse(
        401,
        {"access_token": access_secret, "refresh_token": refresh_secret},
    )
    monkeypatch.setattr(bank_auth.httpx, "post", lambda *args, **kwargs: response)

    with pytest.raises(bank_auth.BankAuthError) as exc_info:
        bank_auth._exchange_code("authorization-code", "pkce-verifier")

    message = str(exc_info.value)
    assert access_secret not in message
    assert refresh_secret not in message
    assert "HTTP 401" in message


def test_token_exchange_parser_exception_is_sanitized(monkeypatch) -> None:
    response_secret = "TOKEN_BODY_SENTINEL"
    response = FakeResponse(200, RuntimeError(response_secret))
    monkeypatch.setattr(bank_auth.httpx, "post", lambda *args, **kwargs: response)

    with pytest.raises(bank_auth.BankAuthError) as exc_info:
        bank_auth._exchange_code("authorization-code", "pkce-verifier")

    assert response_secret not in str(exc_info.value)
    assert exc_info.value.__cause__ is None
    assert exc_info.value.__context__ is None


def test_token_exchange_network_exception_is_sanitized(monkeypatch) -> None:
    response_secret = "NETWORK_EXCEPTION_SENTINEL"

    def fail_request(*args, **kwargs):
        request = httpx.Request("POST", bank_auth.SSO_TOKEN_URL)
        raise httpx.RequestError(response_secret, request=request)

    monkeypatch.setattr(bank_auth.httpx, "post", fail_request)

    with pytest.raises(bank_auth.BankAuthError) as exc_info:
        bank_auth._exchange_code("authorization-code", "pkce-verifier")

    assert response_secret not in str(exc_info.value)
    assert exc_info.value.__context__ is None


def test_credential_file_is_minimal_atomic_and_restrictive(
    tmp_path: Path,
    monkeypatch,
) -> None:
    output_path = tmp_path / "bank_token.json"
    refresh_secret = "REFRESH_FILE_SENTINEL"
    replacements: list[tuple[Path, Path]] = []
    real_replace = os.replace

    def observe_replace(source, destination) -> None:
        replacements.append((Path(source), Path(destination)))
        real_replace(source, destination)

    monkeypatch.setattr(bank_auth.os, "replace", observe_replace)
    bank_auth._write_credentials(
        output_path,
        character_id=123456,
        refresh_token=refresh_secret,
    )

    assert json.loads(output_path.read_text(encoding="utf-8")) == {
        "character_id": 123456,
        "refresh_token": refresh_secret,
    }
    assert replacements and replacements[0][1] == output_path
    assert replacements[0][0].parent == output_path.parent
    assert not replacements[0][0].exists()
    assert not list(tmp_path.glob(".bank_token.json.*.tmp"))
    if os.name == "posix":
        assert stat.S_IMODE(output_path.stat().st_mode) == 0o600


def test_atomic_write_failure_is_sanitized_and_cleans_up(
    tmp_path: Path,
    monkeypatch,
) -> None:
    output_path = tmp_path / "bank_token.json"
    refresh_secret = "REFRESH_WRITE_EXCEPTION_SENTINEL"

    def fail_replace(source, destination) -> None:
        raise OSError(refresh_secret)

    monkeypatch.setattr(bank_auth.os, "replace", fail_replace)
    with pytest.raises(bank_auth.BankAuthError) as exc_info:
        bank_auth._write_credentials(
            output_path,
            character_id=123456,
            refresh_token=refresh_secret,
        )

    assert refresh_secret not in str(exc_info.value)
    assert not output_path.exists()
    assert not list(tmp_path.glob(".bank_token.json.*.tmp"))


def test_main_uses_no_network_or_browser_and_never_outputs_tokens(
    tmp_path: Path,
    monkeypatch,
    capsys,
) -> None:
    output_path = tmp_path / "bank_token.json"
    code_secret = "AUTHORIZATION_CODE_SENTINEL"
    verifier_secret = "PKCE_VERIFIER_SENTINEL"
    access_secret = _fake_access_token(987654)
    refresh_secret = "REFRESH_OUTPUT_SENTINEL"

    monkeypatch.setattr(
        bank_auth,
        "_capture_authorization_code",
        lambda: (code_secret, verifier_secret),
    )
    monkeypatch.setattr(
        bank_auth,
        "_exchange_code",
        lambda code, verifier: (access_secret, refresh_secret),
    )
    monkeypatch.setattr(
        bank_auth.webbrowser,
        "open",
        lambda *args, **kwargs: pytest.fail("browser must not be opened in this test"),
    )
    monkeypatch.setattr(
        bank_auth.httpx,
        "post",
        lambda *args, **kwargs: pytest.fail("network must not be used in this test"),
    )

    assert bank_auth.main(output_path) == 0

    captured = capsys.readouterr()
    combined_output = captured.out + captured.err
    for secret in (code_secret, verifier_secret, access_secret, refresh_secret):
        assert secret not in combined_output
    assert str(output_path.resolve()) in combined_output
    assert "revoke the EVE SSO authorization" in combined_output
    assert "reauthorize" in combined_output
    assert set(json.loads(output_path.read_text(encoding="utf-8"))) == {
        "character_id",
        "refresh_token",
    }


def test_main_discards_unexpected_exception_text(monkeypatch, capsys) -> None:
    exception_secret = "UNEXPECTED_EXCEPTION_TOKEN_SENTINEL"

    def fail_before_exchange():
        raise RuntimeError(exception_secret)

    monkeypatch.setattr(bank_auth, "_capture_authorization_code", fail_before_exchange)

    assert bank_auth.main() == 1

    captured = capsys.readouterr()
    combined_output = captured.out + captured.err
    assert exception_secret not in combined_output
    assert "no token details were logged" in combined_output
