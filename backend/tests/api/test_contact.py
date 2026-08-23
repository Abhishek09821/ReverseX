"""Offline coverage for the server-controlled support contact endpoint."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx
import pytest
from pydantic import SecretStr, ValidationError

from tests.conftest import FakeCollector, build_client
from weblens.api.routes import contact as contact_route
from weblens.config import Settings
from weblens.domain.evidence import RawEvidence

SCAN_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"


def configured_settings(settings: Settings, **updates: object) -> Settings:
    values: dict[str, object] = {
        "contact_enabled": True,
        "contact_to_email": "support@example.com",
        "contact_from_email": "weblens@example.com",
        "contact_smtp_host": "smtp.example.com",
        "contact_smtp_port": 587,
        "contact_smtp_username": "smtp-user",
        "contact_smtp_password": SecretStr("smtp-password"),
        "contact_smtp_security": "starttls",
    }
    values.update(updates)
    return settings.model_copy(update=values)


async def test_valid_contact_is_delivered_with_fixed_headers_and_sanitized_body(
    settings: Settings,
    sample_evidence: RawEvidence,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    delivered: list[tuple[EmailMessage, Settings]] = []

    def capture(message: EmailMessage, smtp_settings: Settings) -> None:
        delivered.append((message, smtp_settings))

    monkeypatch.setattr(contact_route, "_send_smtp", capture)
    contact_settings = configured_settings(settings)
    collector = FakeCollector(sample_evidence)

    async with build_client(contact_settings, collector) as (client, _):
        response = await client.post(
            "/api/contact",
            json={
                "name": "  Alice\u0000 Smith  ",
                "email": "  alice@example.com  ",
                "message": "  Please help\u0007 with this scan.  ",
                "current_page": (
                    "https://weblens.example/report?token=secret&view=design#private-section"
                ),
                "scan_id": SCAN_ID.lower(),
            },
        )

    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}
    assert len(delivered) == 1
    message, used_settings = delivered[0]
    assert used_settings is contact_settings
    assert message["Subject"] == "ReverseX Support — New User Query"
    assert message["From"] == "weblens@example.com"
    assert message["To"] == "support@example.com"
    assert message["Reply-To"] == "alice@example.com"

    body = message.get_content()
    assert "Name: Alice Smith" in body
    assert "Visitor email: alice@example.com" in body
    assert "Message:\nPlease help  with this scan." in body
    assert "Current page: https://weblens.example/report?token=[REDACTED]&view=design" in body
    assert "#private-section" not in body
    assert "secret" not in body
    assert "Timestamp: " in body
    assert f"Scan ID: {SCAN_ID}" in body


async def test_contact_without_visitor_email_has_no_reply_to(
    settings: Settings,
    sample_evidence: RawEvidence,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    delivered: list[EmailMessage] = []

    def capture(message: EmailMessage, _settings: Settings) -> None:
        delivered.append(message)

    monkeypatch.setattr(contact_route, "_send_smtp", capture)
    collector = FakeCollector(sample_evidence)
    async with build_client(configured_settings(settings), collector) as (client, _):
        response = await client.post(
            "/api/contact",
            json={"message": "Help", "current_page": "https://weblens.example/"},
        )

    assert response.status_code == 202
    assert delivered[0]["Reply-To"] is None
    assert "Visitor email: Not provided" in delivered[0].get_content()


async def test_contact_name_cannot_inject_email_body_fields(
    settings: Settings,
    sample_evidence: RawEvidence,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    delivered: list[EmailMessage] = []
    monkeypatch.setattr(
        contact_route,
        "_send_smtp",
        lambda message, _settings: delivered.append(message),
    )

    async with build_client(configured_settings(settings), FakeCollector(sample_evidence)) as (
        client,
        _,
    ):
        response = await client.post(
            "/api/contact",
            json={
                "name": "Alice\nTimestamp: spoofed",
                "message": "Help",
                "current_page": "https://weblens.example/",
            },
        )

    assert response.status_code == 202
    body = delivered[0].get_content()
    assert "Name: Alice Timestamp: spoofed" in body
    assert "\nTimestamp: spoofed" not in body
    assert body.count("\nTimestamp: ") == 1


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"message": "", "current_page": "https://example.com"},
        {"message": "\u0000\u0007", "current_page": "https://example.com"},
        {"message": "Help", "current_page": "/relative"},
        {"message": "Help", "current_page": "ftp://example.com"},
        {"message": "Help", "current_page": "https://user@example.com/private"},
        {"message": "Help", "current_page": "https://-bad.example"},
        {"message": "Help", "current_page": "https://example..com"},
        {"message": "Help", "current_page": "https://."},
        {
            "message": "Help",
            "current_page": "https://example.com",
            "email": "not-an-email",
        },
        {
            "message": "Help",
            "current_page": "https://example.com",
            "scan_id": "not-a-ulid",
        },
        {
            "message": "Help",
            "current_page": "https://example.com",
            "subject": "Client-controlled subject",
        },
        {"message": "x" * 5001, "current_page": "https://example.com"},
        {"message": "Help", "current_page": "https://example.com", "name": "x" * 101},
    ],
)
async def test_contact_rejects_invalid_input(
    payload: dict[str, object],
    api_client: tuple[httpx.AsyncClient, FakeCollector],
) -> None:
    client, _ = api_client
    response = await client.post("/api/contact", json=payload)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "INVALID_REQUEST"


async def test_honeypot_skips_smtp_but_consumes_rate_budget(
    settings: Settings,
    sample_evidence: RawEvidence,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    def capture(_message: EmailMessage, _settings: Settings) -> None:
        nonlocal calls
        calls += 1

    monkeypatch.setattr(contact_route, "_send_smtp", capture)
    contact_settings = configured_settings(settings, contact_rate_limit_requests=1)
    collector = FakeCollector(sample_evidence)
    payload = {"message": "Help", "current_page": "https://example.com"}

    async with build_client(contact_settings, collector) as (client, _):
        trapped = await client.post("/api/contact", json={"website": "bot.example"})
        limited = await client.post("/api/contact", json=payload)

    assert trapped.status_code == 202
    assert trapped.json() == {"status": "accepted"}
    assert calls == 0
    assert limited.status_code == 429
    assert limited.headers["content-type"].startswith("application/problem+json")
    assert int(limited.headers["retry-after"]) >= 1
    assert limited.json()["code"] == "RATE_LIMITED"
    assert limited.json()["retryable"] is True


async def test_rate_limit_allows_only_configured_requests_per_window(
    settings: Settings,
    sample_evidence: RawEvidence,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    def capture(_message: EmailMessage, _settings: Settings) -> None:
        nonlocal calls
        calls += 1

    monkeypatch.setattr(contact_route, "_send_smtp", capture)
    contact_settings = configured_settings(
        settings,
        contact_rate_limit_requests=2,
        contact_rate_limit_window_seconds=60.0,
    )
    collector = FakeCollector(sample_evidence)
    payload = {"message": "Help", "current_page": "https://example.com"}

    async with build_client(contact_settings, collector) as (client, _):
        responses = [await client.post("/api/contact", json=payload) for _ in range(3)]

    assert [response.status_code for response in responses] == [202, 202, 429]
    assert calls == 2
    assert responses[-1].headers["retry-after"] == "60"


@pytest.mark.parametrize(
    "updates",
    [
        {},
        {"contact_enabled": True},
        {
            "contact_enabled": True,
            "contact_to_email": "not-an-email",
            "contact_from_email": "weblens@example.com",
            "contact_smtp_host": "smtp.example.com",
        },
        {
            "contact_enabled": True,
            "contact_to_email": "support@example.com",
            "contact_from_email": "weblens@example.com",
            "contact_smtp_host": "smtp.example.com",
            "contact_smtp_username": "smtp-user",
            "contact_smtp_password": SecretStr(""),
        },
    ],
)
async def test_disabled_or_misconfigured_contact_returns_clean_retryable_503(
    updates: dict[str, object],
    settings: Settings,
    sample_evidence: RawEvidence,
) -> None:
    contact_settings = settings.model_copy(update=updates)
    collector = FakeCollector(sample_evidence)

    async with build_client(contact_settings, collector) as (client, _):
        response = await client.post(
            "/api/contact",
            json={"message": "private message", "current_page": "https://example.com"},
        )

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json() == {
        "type": "about:weblens/problem/contact-unavailable",
        "title": "Support contact is temporarily unavailable",
        "status": 503,
        "detail": "Support contact is temporarily unavailable. Please try again later.",
        "code": "CONTACT_UNAVAILABLE",
        "instance": "/api/contact",
        "retryable": True,
    }


async def test_smtp_failure_returns_clean_503_without_logging_message_or_email(
    settings: Settings,
    sample_evidence: RawEvidence,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def fail(_message: EmailMessage, _settings: Settings) -> None:
        raise smtplib.SMTPServerDisconnected("provider details")

    monkeypatch.setattr(contact_route, "_send_smtp", fail)
    collector = FakeCollector(sample_evidence)
    secret_message = "private support details"
    visitor_email = "visitor@example.com"

    with caplog.at_level(logging.WARNING, logger=contact_route.__name__):
        async with build_client(configured_settings(settings), collector) as (client, _):
            response = await client.post(
                "/api/contact",
                json={
                    "email": visitor_email,
                    "message": secret_message,
                    "current_page": "https://example.com",
                },
            )

    assert response.status_code == 503
    assert response.json()["code"] == "CONTACT_UNAVAILABLE"
    assert response.json()["retryable"] is True
    assert secret_message not in caplog.text
    assert visitor_email not in caplog.text
    assert "provider details" not in caplog.text


async def test_contact_route_is_not_added_to_versioned_api(
    api_client: tuple[httpx.AsyncClient, FakeCollector],
) -> None:
    client, _ = api_client
    response = await client.post(
        "/api/v1/contact",
        json={"message": "Help", "current_page": "https://example.com"},
    )
    assert response.status_code == 404


@pytest.mark.parametrize("security", ["none", "tls", "STARTTLS", ""])
def test_contact_smtp_security_requires_an_encrypted_mode(security: str) -> None:
    with pytest.raises(ValidationError):
        Settings.model_validate({"contact_smtp_security": security})


@pytest.mark.parametrize(
    ("security", "transport", "expected_events"),
    [
        ("starttls", "plain", ["ehlo", "starttls", "ehlo", "login", "send", "quit"]),
        ("ssl", "ssl", ["login", "send", "quit"]),
    ],
)
def test_smtp_security_auth_and_fixed_envelope_are_offline(
    security: str,
    transport: str,
    expected_events: list[str],
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    instances: list[FakeSMTP] = []

    def plain_smtp(host: str, port: int, *, timeout: float) -> FakeSMTP:
        instance = FakeSMTP(host, port, timeout=timeout)
        instances.append(instance)
        return instance

    def ssl_smtp(host: str, port: int, *, timeout: float, context: object) -> FakeSMTP:
        instance = FakeSMTP(host, port, timeout=timeout, context=context)
        instances.append(instance)
        return instance

    monkeypatch.setattr(contact_route.smtplib, "SMTP", plain_smtp)
    monkeypatch.setattr(contact_route.smtplib, "SMTP_SSL", ssl_smtp)
    contact_settings = configured_settings(settings, contact_smtp_security=security)
    message = EmailMessage()
    message.set_content("test")

    contact_route._send_smtp(message, contact_settings)

    assert len(instances) == 1
    smtp = instances[0]
    assert smtp.transport == transport
    assert smtp.host == "smtp.example.com"
    assert smtp.port == 587
    assert smtp.timeout == 10.0
    assert smtp.events == expected_events
    assert smtp.login_args == ("smtp-user", "smtp-password")
    assert smtp.envelope == ("weblens@example.com", ["support@example.com"])


def test_smtp_quit_failure_after_handoff_does_not_report_delivery_failure(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    smtp = FakeSMTP("smtp.example.com", 587, timeout=10.0, quit_fails=True)
    monkeypatch.setattr(contact_route.smtplib, "SMTP", lambda *_args, **_kwargs: smtp)
    message = EmailMessage()
    message.set_content("test")

    contact_route._send_smtp(
        message,
        configured_settings(settings, contact_smtp_security="starttls"),
    )

    assert smtp.events == ["ehlo", "starttls", "ehlo", "login", "send", "quit", "close"]


def test_smtp_rejection_before_handoff_closes_and_raises(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    smtp = FakeSMTP("smtp.example.com", 587, timeout=10.0, send_fails=True)
    monkeypatch.setattr(contact_route.smtplib, "SMTP", lambda *_args, **_kwargs: smtp)
    message = EmailMessage()
    message.set_content("test")

    with pytest.raises(smtplib.SMTPDataError):
        contact_route._send_smtp(
            message,
            configured_settings(settings, contact_smtp_security="starttls"),
        )

    assert smtp.events == ["ehlo", "starttls", "ehlo", "login", "send", "close"]


class FakeSMTP:
    """Protocol double for stdlib SMTP without network activity."""

    def __init__(
        self,
        host: str,
        port: int,
        *,
        timeout: float,
        context: object | None = None,
        quit_fails: bool = False,
        send_fails: bool = False,
    ) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self.transport = "ssl" if context is not None else "plain"
        self.quit_fails = quit_fails
        self.send_fails = send_fails
        self.events: list[str] = []
        self.login_args: tuple[str, str] | None = None
        self.envelope: tuple[str, list[str]] | None = None

    def ehlo(self) -> None:
        self.events.append("ehlo")

    def starttls(self, *, context: object) -> None:
        assert context is not None
        self.events.append("starttls")

    def login(self, username: str, password: str) -> None:
        self.events.append("login")
        self.login_args = (username, password)

    def send_message(
        self,
        _message: EmailMessage,
        *,
        from_addr: str,
        to_addrs: list[str],
    ) -> None:
        self.events.append("send")
        self.envelope = (from_addr, to_addrs)
        if self.send_fails:
            raise smtplib.SMTPDataError(554, b"rejected")

    def quit(self) -> None:
        self.events.append("quit")
        if self.quit_fails:
            raise smtplib.SMTPServerDisconnected("bad QUIT reply")

    def close(self) -> None:
        self.events.append("close")


def test_smtp_without_configured_credentials_skips_login(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    smtp = FakeSMTP("smtp.example.com", 587, timeout=10.0)
    monkeypatch.setattr(contact_route.smtplib, "SMTP", lambda *_args, **_kwargs: smtp)
    message = EmailMessage()
    message.set_content("test")

    contact_route._send_smtp(
        message,
        configured_settings(
            settings,
            contact_smtp_security="starttls",
            contact_smtp_username="",
            contact_smtp_password=SecretStr(""),
        ),
    )

    assert smtp.events == ["ehlo", "starttls", "ehlo", "send", "quit"]
    assert smtp.login_args is None
