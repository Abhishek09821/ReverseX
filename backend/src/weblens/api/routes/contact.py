"""Secure support contact delivery over deployment-configured SMTP."""

from __future__ import annotations

import asyncio
import ipaddress
import math
import re
import smtplib
import ssl
import time
import unicodedata
from collections import OrderedDict, deque
from contextlib import suppress
from datetime import UTC, datetime
from email.message import EmailMessage
from typing import Literal
from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from weblens.api.deps import SettingsDep
from weblens.config import Settings
from weblens.domain.errors import ContactRateLimitedError, ContactUnavailableError
from weblens.logging import get_logger
from weblens.utils.ids import is_ulid
from weblens.utils.urls import redact_url

router = APIRouter(prefix="/api/contact", tags=["contact"])
logger = get_logger(__name__)

_SUBJECT = "ReverseX Support — New User Query"
_UNAVAILABLE_DETAIL = "Support contact is temporarily unavailable. Please try again later."
_EMAIL_LOCAL = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$")
_DOMAIN_LABEL = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")
_PRUNE_BATCH_SIZE = 32


class ContactRequest(BaseModel):
    """Bounded client input; all delivery routing remains server-controlled."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=254)
    message: str = Field(min_length=1, max_length=5000)
    current_page: str = Field(max_length=2048)
    scan_id: str | None = None
    website: str = Field(default="", max_length=200, exclude=True)

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        sanitized = _sanitize_single_line(value)
        return sanitized or None

    @field_validator("email", mode="before")
    @classmethod
    def _validate_email(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            if not _is_valid_email(value):
                raise ValueError("email must be a valid email address")
        return value

    @field_validator("message")
    @classmethod
    def _message_must_have_content(cls, value: str) -> str:
        sanitized = _sanitize_text(value)
        if not sanitized:
            raise ValueError("message must contain visible text")
        return sanitized

    @field_validator("current_page")
    @classmethod
    def _validate_current_page(cls, value: str) -> str:
        if any(char.isspace() or unicodedata.category(char) == "Cc" for char in value):
            raise ValueError("current_page must be an absolute HTTP(S) URL")
        try:
            parts = urlsplit(value)
            _ = parts.port
        except ValueError as exc:
            raise ValueError("current_page must be an absolute HTTP(S) URL") from exc
        host = parts.hostname
        if (
            parts.scheme.lower() not in {"http", "https"}
            or not host
            or not _is_valid_host(host)
            or "@" in parts.netloc
            or parts.username is not None
            or parts.password is not None
        ):
            raise ValueError("current_page must be an absolute HTTP(S) URL without userinfo")
        without_fragment = urlunsplit(
            (parts.scheme.lower(), parts.netloc, parts.path, parts.query, "")
        )
        return redact_url(without_fragment)

    @field_validator("scan_id")
    @classmethod
    def _validate_scan_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.upper()
        if not is_ulid(normalized) or normalized[0] not in "01234567":
            raise ValueError("scan_id must be a valid ULID")
        return normalized


class HoneypotRequest(BaseModel):
    """Permissive decoy shape so bots are trapped before ordinary-field validation."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    website: str = Field(min_length=1, max_length=200)


class ContactResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["accepted"] = "accepted"


class SlidingWindowRateLimiter:
    """Per-app bounded sliding-window limiter keyed by the direct network peer."""

    def __init__(self, limit: int, window_seconds: float, max_clients: int) -> None:
        self._limit = limit
        self._window_seconds = window_seconds
        self._max_clients = max_clients
        self._events: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = asyncio.Lock()

    async def consume(self, key: str) -> int | None:
        """Consume one allowance, or return the whole-second retry delay."""
        async with self._lock:
            now = time.monotonic()
            cutoff = now - self._window_seconds
            self._prune_inactive(cutoff)

            events = self._events.get(key)
            if events is None:
                if len(self._events) >= self._max_clients:
                    self._events.popitem(last=False)
                events = deque()
                self._events[key] = events
            else:
                self._events.move_to_end(key)

            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= self._limit:
                return max(1, math.ceil(events[0] + self._window_seconds - now))
            events.append(now)
            return None

    def _prune_inactive(self, cutoff: float) -> None:
        for key in list(self._events)[:_PRUNE_BATCH_SIZE]:
            events = self._events[key]
            if events and events[-1] > cutoff:
                break
            del self._events[key]


def _get_rate_limiter(request: Request, settings: Settings) -> SlidingWindowRateLimiter:
    limiter: SlidingWindowRateLimiter | None = getattr(
        request.app.state, "contact_rate_limiter", None
    )
    if limiter is None:
        limiter = SlidingWindowRateLimiter(
            limit=settings.contact_rate_limit_requests,
            window_seconds=settings.contact_rate_limit_window_seconds,
            max_clients=settings.contact_rate_limit_max_clients,
        )
        request.app.state.contact_rate_limiter = limiter
    return limiter


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send a support request",
    responses={
        429: {"description": "The direct client has sent too many support requests."},
        503: {"description": "Support contact is disabled or temporarily unavailable."},
    },
)
async def contact(
    payload: HoneypotRequest | ContactRequest, request: Request, settings: SettingsDep
) -> ContactResponse:
    """Rate-limit first, silently trap bots, then wait for the SMTP handoff."""
    client_key = request.client.host if request.client is not None else "unknown"
    retry_after = await _get_rate_limiter(request, settings).consume(client_key)
    if retry_after is not None:
        raise ContactRateLimitedError(
            "Too many support requests. Please try again later.",
            retry_after_seconds=retry_after,
        )

    if isinstance(payload, HoneypotRequest) or payload.website:
        return ContactResponse()

    if not _smtp_is_configured(settings):
        raise ContactUnavailableError(_UNAVAILABLE_DETAIL)

    message = _build_message(payload, settings)
    try:
        await asyncio.to_thread(_send_smtp, message, settings)
    except Exception as exc:
        logger.warning("contact SMTP handoff failed", extra={"error_type": type(exc).__name__})
        raise ContactUnavailableError(_UNAVAILABLE_DETAIL) from exc
    return ContactResponse()


def _build_message(payload: ContactRequest, settings: Settings) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = _SUBJECT
    message["From"] = settings.contact_from_email.strip()
    message["To"] = settings.contact_to_email.strip()
    if payload.email:
        message["Reply-To"] = payload.email

    body_lines = [
        f"Name: {_display_value(payload.name)}",
        f"Visitor email: {_display_value(payload.email)}",
        "Message:",
        _sanitize_text(payload.message),
        f"Current page: {_sanitize_text(payload.current_page)}",
        f"Timestamp: {datetime.now(UTC).isoformat()}",
    ]
    if payload.scan_id:
        body_lines.append(f"Scan ID: {_sanitize_text(payload.scan_id)}")
    message.set_content("\n".join(body_lines))
    return message


def _send_smtp(message: EmailMessage, settings: Settings) -> None:
    host = settings.contact_smtp_host.strip()
    password = settings.contact_smtp_password.get_secret_value()
    context = ssl.create_default_context()
    smtp: smtplib.SMTP

    if settings.contact_smtp_security == "ssl":
        smtp = smtplib.SMTP_SSL(
            host,
            settings.contact_smtp_port,
            timeout=settings.contact_smtp_timeout_seconds,
            context=context,
        )
    else:
        smtp = smtplib.SMTP(
            host,
            settings.contact_smtp_port,
            timeout=settings.contact_smtp_timeout_seconds,
        )

    try:
        if settings.contact_smtp_security != "ssl":
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
        _authenticate_and_send(smtp, message, settings, password)
    except Exception:
        with suppress(Exception):
            smtp.close()
        raise

    # send_message returning is the handoff boundary. A provider can accept the message and then
    # fail its QUIT reply; that teardown failure must not invite a duplicate-producing retry.
    try:
        smtp.quit()
    except Exception:
        with suppress(Exception):
            smtp.close()


def _authenticate_and_send(
    smtp: smtplib.SMTP, message: EmailMessage, settings: Settings, password: str
) -> None:
    username = settings.contact_smtp_username.strip()
    if username:
        smtp.login(username, password)
    smtp.send_message(
        message,
        from_addr=settings.contact_from_email.strip(),
        to_addrs=[settings.contact_to_email.strip()],
    )


def _smtp_is_configured(settings: Settings) -> bool:
    username = settings.contact_smtp_username.strip()
    password = settings.contact_smtp_password.get_secret_value()
    return bool(
        settings.contact_enabled
        and settings.contact_smtp_host.strip()
        and _is_valid_email(settings.contact_to_email.strip())
        and _is_valid_email(settings.contact_from_email.strip())
        and bool(username) == bool(password)
    )


def _display_value(value: str | None) -> str:
    return _sanitize_single_line(value) if value else "Not provided"


def _sanitize_single_line(value: str) -> str:
    sanitized = "".join(
        " " if unicodedata.category(char) in {"Cc", "Zl", "Zp"} else char for char in value
    )
    return " ".join(sanitized.split())


def _sanitize_text(value: str) -> str:
    normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(
        char if char == "\n" or unicodedata.category(char) != "Cc" else " " for char in normalized
    ).strip()


def _is_valid_host(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
    except ValueError:
        normalized = host.rstrip(".")
        if not normalized or len(normalized) > 253:
            return False
        try:
            ascii_host = normalized.encode("idna").decode("ascii")
        except UnicodeError:
            return False
        return all(_DOMAIN_LABEL.fullmatch(label) for label in ascii_host.split("."))
    return True


def _is_valid_email(value: str) -> bool:
    if (
        not value
        or len(value) > 254
        or value.count("@") != 1
        or any(char.isspace() or unicodedata.category(char) == "Cc" for char in value)
    ):
        return False
    local, domain = value.rsplit("@", 1)
    if (
        not local
        or len(local) > 64
        or local.startswith(".")
        or local.endswith(".")
        or ".." in local
        or _EMAIL_LOCAL.fullmatch(local) is None
        or not domain
        or len(domain) > 253
    ):
        return False
    labels = domain.rstrip(".").split(".")
    return len(labels) >= 2 and all(_DOMAIN_LABEL.fullmatch(label) for label in labels)
