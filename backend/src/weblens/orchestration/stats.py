"""Durable aggregate usage counter.

The job store is deliberately ephemeral, but "how many websites has this deployment analyzed"
has to survive a restart to mean anything, so this is the one piece of server-side state that
is written to disk.

What is stored is only a total and the date counting began. No URL, host, IP, user agent, or
finding ever reaches this file: an aggregate counter does not need them, and storing them would
turn a vanity number into a log of what people looked at.

Writes take an exclusive ``flock`` and land through a temp file plus ``os.replace``, so a
concurrent worker or a crash mid-write cannot produce a torn or lost count.
"""

from __future__ import annotations

import asyncio
import fcntl
import json
import os
from dataclasses import dataclass
from pathlib import Path

from weblens.logging import get_logger
from weblens.utils.timing import utc_now

logger = get_logger(__name__)

_TOTAL_KEY = "total_scans"
_SINCE_KEY = "counting_since"


@dataclass(frozen=True)
class UsageStats:
    total_scans: int
    counting_since: str | None


class UsageCounter:
    """Append-only counter of completed scans.

    Disabled instances are still constructed so callers never need a null check; they simply
    report zero and never touch the filesystem.
    """

    def __init__(self, path: Path, enabled: bool = True) -> None:
        self._path = path
        self._enabled = enabled
        self._lock_path = path.with_name(f"{path.name}.lock")
        self._lock = asyncio.Lock()

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def read(self) -> UsageStats:
        if not self._enabled:
            return UsageStats(total_scans=0, counting_since=None)
        return await asyncio.to_thread(self._read_sync)

    async def record_scan(self) -> None:
        """Count one completed scan.

        Never raises. A counter is a nice-to-have, and a full disk or a read-only volume must not
        turn a successful scan into a failed one.
        """
        if not self._enabled:
            return
        try:
            async with self._lock:
                await asyncio.to_thread(self._increment_sync)
        except Exception as error:
            logger.warning("usage counter write failed", extra={"error_type": type(error).__name__})

    # --- blocking internals, always run in a worker thread ------------------------------

    def _read_sync(self) -> UsageStats:
        try:
            payload = json.loads(self._path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return UsageStats(total_scans=0, counting_since=None)
        except (OSError, json.JSONDecodeError) as error:
            logger.warning("usage counter unreadable", extra={"error_type": type(error).__name__})
            return UsageStats(total_scans=0, counting_since=None)
        return UsageStats(
            total_scans=_coerce_total(payload.get(_TOTAL_KEY)),
            counting_since=_coerce_since(payload.get(_SINCE_KEY)),
        )

    def _increment_sync(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        # Held across the read-modify-write so two workers cannot both write "n + 1".
        with open(self._lock_path, "a+", encoding="utf-8") as handle:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            try:
                current = self._read_sync()
                payload = {
                    _TOTAL_KEY: current.total_scans + 1,
                    _SINCE_KEY: current.counting_since or utc_now().isoformat(),
                }
                self._write_atomic(payload)
            finally:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def _write_atomic(self, payload: dict[str, object]) -> None:
        temp = self._path.with_name(f"{self._path.name}.{os.getpid()}.tmp")
        try:
            with open(temp, "w", encoding="utf-8") as handle:
                json.dump(payload, handle)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp, self._path)
        finally:
            temp.unlink(missing_ok=True)


def _coerce_total(value: object) -> int:
    """Tolerate a hand-edited or partially corrupt file instead of failing the endpoint."""
    if isinstance(value, bool) or not isinstance(value, int):
        return 0
    return max(0, value)


def _coerce_since(value: object) -> str | None:
    return value if isinstance(value, str) and value else None
