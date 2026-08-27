"""Credential-safety checks for EVE HTTP and WebSocket boundaries."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import HTTPException

from backend.auth import router as auth_router
from backend.auth import sso
from backend.models.user import User
from backend.services import deposit_worker
from backend.tools import bot_player, run_bots_server


class FakeResponse:
    def __init__(
        self,
        status_code: int,
        payload: object,
        *,
        response_text: str = "",
        headers: dict[str, str] | None = None,
    ) -> None:
        self.status_code = status_code
        self._payload = payload
        self.text = response_text
        self.headers = headers or {}

    def json(self) -> object:
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


class FakeAsyncClient:
    def __init__(
        self,
        response: FakeResponse | None = None,
        error: Exception | None = None,
    ) -> None:
        self.response = response
        self.error = error

    async def __aenter__(self) -> FakeAsyncClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, *args: object, **kwargs: object) -> FakeResponse:
        if self.error is not None:
            raise self.error
        assert self.response is not None
        return self.response

    async def get(self, *args: object, **kwargs: object) -> FakeResponse:
        return await self.post(*args, **kwargs)


@pytest.fixture(autouse=True)
def clear_pending_sso_logins() -> None:
    sso._pending_logins.clear()
    yield
    sso._pending_logins.clear()


@pytest.mark.parametrize(
    "response",
    [
        FakeResponse(
            401,
            {
                "access_token": "ACCESS_BODY_SENTINEL",
                "refresh_token": "REFRESH_BODY_SENTINEL",
            },
            response_text="ACCESS_BODY_SENTINEL REFRESH_BODY_SENTINEL",
        ),
        FakeResponse(200, RuntimeError("PARSER_EXCEPTION_SENTINEL")),
    ],
)
async def test_sso_exchange_failure_never_exposes_upstream_material(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    response: FakeResponse,
) -> None:
    monkeypatch.setattr(sso.httpx, "AsyncClient", lambda: FakeAsyncClient(response))
    sso._pending_logins["state"] = ("verifier", time.monotonic())

    with caplog.at_level(logging.WARNING), pytest.raises(sso.SSOFlowError) as raised:
        await sso.exchange_code("AUTHORIZATION_CODE_SENTINEL", "state")

    output = f"{raised.value}\n{caplog.text}"
    for secret in (
        "ACCESS_BODY_SENTINEL",
        "REFRESH_BODY_SENTINEL",
        "PARSER_EXCEPTION_SENTINEL",
        "AUTHORIZATION_CODE_SENTINEL",
    ):
        assert secret not in output


async def test_sso_refresh_network_exception_never_exposes_token_or_error(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    error_secret = "NETWORK_EXCEPTION_SENTINEL"
    refresh_secret = "BANK_REFRESH_TOKEN_SENTINEL"
    monkeypatch.setattr(
        sso.httpx,
        "AsyncClient",
        lambda: FakeAsyncClient(error=RuntimeError(error_secret)),
    )

    with caplog.at_level(logging.WARNING), pytest.raises(sso.SSOFlowError) as raised:
        await sso.refresh_access_token(refresh_secret)

    output = f"{raised.value}\n{caplog.text}"
    assert error_secret not in output
    assert refresh_secret not in output
    assert raised.value.__cause__ is None


async def test_auth_callback_never_exposes_sso_or_token_parser_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    upstream_secret = "UPSTREAM_EXCEPTION_SENTINEL"

    async def fail_exchange(code: str, state: str) -> dict:
        raise sso.SSOFlowError(upstream_secret)

    monkeypatch.setattr(auth_router, "exchange_code", fail_exchange)
    with pytest.raises(HTTPException) as exchange_error:
        await auth_router.callback("code", "state", None, None)  # type: ignore[arg-type]
    assert upstream_secret not in str(exchange_error.value.detail)

    async def malformed_token(code: str, state: str) -> dict:
        return {"access_token": "bad", "refresh_token": ""}

    monkeypatch.setattr(auth_router, "exchange_code", malformed_token)
    with pytest.raises(HTTPException) as parser_error:
        await auth_router.callback("code", "state", None, None)  # type: ignore[arg-type]
    assert parser_error.value.detail == "EVE SSO returned an invalid identity token"


async def test_auth_callback_does_not_retain_player_refresh_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    refresh_secret = "UNUSED_PLAYER_REFRESH_TOKEN_SENTINEL"
    user = User(
        id=7,
        character_id=90000001,
        character_name="Old Name",
        portrait_url="",
        balance=0,
        is_banned=False,
        is_admin=False,
        is_bot=False,
    )

    class Result:
        def scalar_one_or_none(self) -> User:
            return user

    class Session:
        committed = False

        async def execute(self, statement: object) -> Result:
            return Result()

        async def commit(self) -> None:
            self.committed = True

    async def exchange(code: str, state: str) -> dict:
        return {
            "access_token": "signed-access-token",
            "refresh_token": refresh_secret,
        }

    monkeypatch.setattr(auth_router, "exchange_code", exchange)
    monkeypatch.setattr(
        auth_router,
        "parse_character_from_jwt",
        lambda token: (90000001, "Current Name"),
    )
    monkeypatch.setattr(auth_router.app_jwt, "create_token", lambda *args, **kwargs: "app-token")
    session = Session()

    await auth_router.callback("code", "state", None, session)  # type: ignore[arg-type]

    assert session.committed is True
    assert "refresh_token" not in User.__table__.columns
    assert "refresh_token" not in user.__dict__
    assert refresh_secret not in repr(user.__dict__)


async def test_new_login_does_not_put_refresh_token_on_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    refresh_secret = "NEW_PLAYER_REFRESH_TOKEN_SENTINEL"

    class Result:
        def __init__(self, *, one: object = None, scalar: object = None) -> None:
            self.one = one
            self.scalar_value = scalar

        def scalar_one_or_none(self) -> object:
            return self.one

        def scalar(self) -> object:
            return self.scalar_value

    class Session:
        def __init__(self) -> None:
            self.results = [
                Result(one=None),
                Result(scalar=50),
                Result(one=None),
            ]
            self.added: list[object] = []

        async def execute(self, statement: object) -> Result:
            return self.results.pop(0)

        def add(self, value: object) -> None:
            self.added.append(value)

        async def flush(self) -> None:
            assert isinstance(self.added[0], User)
            self.added[0].id = 8

        async def commit(self) -> None:
            return None

    async def exchange(code: str, state: str) -> dict:
        return {
            "access_token": "signed-access-token",
            "refresh_token": refresh_secret,
        }

    monkeypatch.setattr(auth_router, "exchange_code", exchange)
    monkeypatch.setattr(
        auth_router,
        "parse_character_from_jwt",
        lambda token: (90000002, "New Pilot"),
    )
    monkeypatch.setattr(
        auth_router.app_jwt,
        "create_token",
        lambda *args, **kwargs: "app-token",
    )
    session = Session()
    request = SimpleNamespace(
        headers={},
        client=SimpleNamespace(host="127.0.0.1"),
    )

    await auth_router.callback("code", "state", request, session)  # type: ignore[arg-type]

    assert len(session.added) == 1
    created_user = session.added[0]
    assert isinstance(created_user, User)
    assert "refresh_token" not in created_user.__dict__
    assert refresh_secret not in repr(created_user.__dict__)


@pytest.mark.parametrize(
    "response",
    [
        FakeResponse(
            401,
            {"access_token": "BANK_ACCESS_BODY_SENTINEL"},
            response_text="BANK_ACCESS_BODY_SENTINEL BANK_REFRESH_BODY_SENTINEL",
        ),
        FakeResponse(200, RuntimeError("BANK_PARSER_EXCEPTION_SENTINEL")),
    ],
)
async def test_bank_refresh_failure_never_exposes_upstream_material(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    response: FakeResponse,
) -> None:
    monkeypatch.setattr(
        deposit_worker.httpx,
        "AsyncClient",
        lambda: FakeAsyncClient(response),
    )

    with caplog.at_level(logging.WARNING), pytest.raises(
        deposit_worker.DepositUpstreamError
    ) as raised:
        await deposit_worker._refresh_bank_token()

    output = f"{raised.value}\n{caplog.text}"
    for secret in (
        "BANK_ACCESS_BODY_SENTINEL",
        "BANK_REFRESH_BODY_SENTINEL",
        "BANK_PARSER_EXCEPTION_SENTINEL",
    ):
        assert secret not in output


@pytest.mark.parametrize(
    "failed_response",
    [
        FakeResponse(
            503,
            {"error": "FAILED_PAGE_BODY_SENTINEL"},
            response_text="FAILED_PAGE_BODY_SENTINEL",
        ),
        FakeResponse(200, RuntimeError("FAILED_PAGE_BODY_SENTINEL")),
        FakeResponse(
            200,
            [{"id": 200, "ref_type": "player_donation", "amount": 1}],
            headers={"x-pages": "FAILED_PAGE_BODY_SENTINEL"},
        ),
        FakeResponse(
            200,
            [{"id": 200, "ref_type": "player_donation", "amount": 1}],
        ),
        FakeResponse(
            200,
            [{"ref_type": "player_donation", "amount": 1}],
            headers={"x-pages": "2"},
        ),
        FakeResponse(
            200,
            [{"id": 200, "ref_type": "player_donation", "amount": 1}],
            headers={"x-pages": "1"},
        ),
        FakeResponse(200, [], headers={"x-pages": "2"}),
    ],
)
async def test_wallet_fetch_discards_earlier_pages_when_later_page_fails(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    failed_response: FakeResponse,
) -> None:
    response_secret = "FAILED_PAGE_BODY_SENTINEL"
    responses = [
        FakeResponse(
            200,
            [{"id": 300, "ref_type": "player_donation", "amount": 1}],
            headers={"x-pages": "2"},
        ),
        failed_response,
    ]
    requested_pages: list[int] = []

    class SequencedClient(FakeAsyncClient):
        async def get(self, *args: object, **kwargs: object) -> FakeResponse:
            params = kwargs.get("params")
            assert isinstance(params, dict)
            requested_pages.append(params["page"])
            return responses.pop(0)

    monkeypatch.setattr(deposit_worker.httpx, "AsyncClient", SequencedClient)

    with caplog.at_level(logging.WARNING), pytest.raises(
        deposit_worker.DepositUpstreamError
    ) as raised:
        await deposit_worker._fetch_wallet_journal("ACCESS_TOKEN_SENTINEL")

    assert requested_pages == [1, 2]
    assert response_secret not in f"{raised.value}\n{caplog.text}"


async def test_failed_wallet_fetch_cannot_advance_poll_cursor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Result:
        def scalar(self) -> int:
            return 77

    class Session:
        async def execute(self, statement: object) -> Result:
            return Result()

    class SessionContext:
        async def __aenter__(self) -> Session:
            return Session()

        async def __aexit__(self, *args: object) -> None:
            return None

    seen_cursors: list[int] = []

    async def refresh() -> str:
        return "access-token"

    async def fail_then_stop(access_token: str, since_ref_id: int = 0) -> list[dict]:
        seen_cursors.append(since_ref_id)
        if len(seen_cursors) == 1:
            raise deposit_worker.DepositUpstreamError("stable failure")
        raise asyncio.CancelledError

    async def no_delay(delay: float) -> None:
        return None

    monkeypatch.setattr(deposit_worker.settings, "bank_character_id", 123)
    monkeypatch.setattr(deposit_worker.settings, "bank_refresh_token", "configured")
    monkeypatch.setattr(deposit_worker, "async_session", SessionContext)
    monkeypatch.setattr(deposit_worker, "_refresh_bank_token", refresh)
    monkeypatch.setattr(deposit_worker, "_fetch_wallet_journal", fail_then_stop)
    monkeypatch.setattr(deposit_worker.asyncio, "sleep", no_delay)

    with pytest.raises(asyncio.CancelledError):
        await deposit_worker.deposit_poll_loop()

    assert seen_cursors == [77, 77]


async def test_deposit_poll_loop_does_not_log_arbitrary_exception_text(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    class Result:
        def scalar(self) -> int:
            return 0

    class Session:
        async def execute(self, statement: object) -> Result:
            return Result()

    class SessionContext:
        async def __aenter__(self) -> Session:
            return Session()

        async def __aexit__(self, *args: object) -> None:
            return None

    async def fail_refresh() -> str:
        raise RuntimeError("ARBITRARY_POLL_EXCEPTION_SENTINEL")

    async def stop_after_iteration(delay: float) -> None:
        raise asyncio.CancelledError

    monkeypatch.setattr(deposit_worker.settings, "bank_character_id", 123)
    monkeypatch.setattr(deposit_worker.settings, "bank_refresh_token", "configured")
    monkeypatch.setattr(deposit_worker, "async_session", SessionContext)
    monkeypatch.setattr(deposit_worker, "_refresh_bank_token", fail_refresh)
    monkeypatch.setattr(deposit_worker.asyncio, "sleep", stop_after_iteration)

    with caplog.at_level(logging.ERROR), pytest.raises(asyncio.CancelledError):
        await deposit_worker.deposit_poll_loop()

    assert "ARBITRARY_POLL_EXCEPTION_SENTINEL" not in caplog.text
    assert "internal error" in caplog.text


class RecordingWebSocket:
    def __init__(self) -> None:
        self.sent: list[str] = []
        self.open = True

    async def send(self, message: str) -> None:
        self.sent.append(message)

    def __aiter__(self) -> RecordingWebSocket:
        return self

    async def __anext__(self) -> Any:
        raise asyncio.CancelledError


class WebSocketContext:
    def __init__(self, websocket: RecordingWebSocket) -> None:
        self.websocket = websocket

    async def __aenter__(self) -> RecordingWebSocket:
        return self.websocket

    async def __aexit__(self, *args: object) -> None:
        return None


async def test_bot_player_uses_first_frame_auth_not_query_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    websocket = RecordingWebSocket()
    connected_urls: list[str] = []
    token = "BOT_JWT_SENTINEL"

    def connect(url: str) -> WebSocketContext:
        connected_urls.append(url)
        return WebSocketContext(websocket)

    monkeypatch.setattr(bot_player.websockets, "connect", connect)
    player = bot_player.BotPlayer("Bot", token, "micro-1", "https://example.test", 1)

    with pytest.raises(asyncio.CancelledError):
        await player.run()

    assert connected_urls == ["wss://example.test/ws/table/micro-1"]
    assert token not in connected_urls[0]
    assert json.loads(websocket.sent[0]) == {
        "type": "auth",
        "token": token,
        "schema_version": 1,
    }


async def test_server_bot_uses_first_frame_auth_not_query_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    websocket = RecordingWebSocket()
    connected_urls: list[str] = []
    token = "SERVER_BOT_JWT_SENTINEL"

    def connect(url: str) -> WebSocketContext:
        connected_urls.append(url)
        return WebSocketContext(websocket)

    monkeypatch.setattr(run_bots_server.websockets, "connect", connect)

    with pytest.raises(asyncio.CancelledError):
        await run_bots_server.bot("Bot", token, "micro-1")

    assert connected_urls == ["wss://pokerin.space/ws/table/micro-1"]
    assert token not in connected_urls[0]
    assert json.loads(websocket.sent[0]) == {
        "type": "auth",
        "token": token,
        "schema_version": 1,
    }
