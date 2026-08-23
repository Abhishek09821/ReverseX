"""Coverage for the aggregate usage counter and its endpoint."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from tests.conftest import FakeCollector, build_client
from weblens.config import Settings
from weblens.domain.evidence import RawEvidence
from weblens.orchestration.stats import UsageCounter

TEST_URL = "https://example.test/"


async def test_stats_start_at_zero_before_any_scan(
    api_client: tuple[httpx.AsyncClient, FakeCollector],
) -> None:
    client, _ = api_client
    response = await client.get("/api/v1/stats")

    assert response.status_code == 200
    assert response.json() == {"total_scans": 0, "counting_since": None, "enabled": True}


async def test_completed_scan_increments_the_public_total(
    settings: Settings, sample_evidence: RawEvidence
) -> None:
    collector = FakeCollector(sample_evidence)

    async with build_client(settings, collector) as (client, _):
        accepted = await client.post("/api/v1/scans", json={"url": TEST_URL})
        scan_id = accepted.json()["scan_id"]
        await _await_terminal(client, scan_id)

        body = (await client.get("/api/v1/stats")).json()

    assert body["total_scans"] == 1
    assert body["counting_since"] is not None


async def test_total_survives_a_restart(settings: Settings, sample_evidence: RawEvidence) -> None:
    """The counter is the one piece of server state that must outlive the process."""
    async with build_client(settings, FakeCollector(sample_evidence)) as (client, _):
        accepted = await client.post("/api/v1/scans", json={"url": TEST_URL})
        await _await_terminal(client, accepted.json()["scan_id"])

    # A fresh app over the same stats path stands in for a restart.
    async with build_client(settings, FakeCollector(sample_evidence)) as (client, _):
        body = (await client.get("/api/v1/stats")).json()

    assert body["total_scans"] == 1


async def test_disabled_counter_reports_zero_and_writes_nothing(
    settings: Settings, sample_evidence: RawEvidence
) -> None:
    disabled = settings.model_copy(update={"stats_enabled": False})

    async with build_client(disabled, FakeCollector(sample_evidence)) as (client, _):
        accepted = await client.post("/api/v1/scans", json={"url": TEST_URL})
        await _await_terminal(client, accepted.json()["scan_id"])
        body = (await client.get("/api/v1/stats")).json()

    assert body == {"total_scans": 0, "counting_since": None, "enabled": False}
    assert not disabled.stats_path.exists()


async def test_counter_stores_no_target_information(
    settings: Settings, sample_evidence: RawEvidence
) -> None:
    """An aggregate total must not become a log of what people scanned."""
    async with build_client(settings, FakeCollector(sample_evidence)) as (client, _):
        accepted = await client.post("/api/v1/scans", json={"url": TEST_URL})
        await _await_terminal(client, accepted.json()["scan_id"])

    raw = settings.stats_path.read_text(encoding="utf-8")
    assert "example.test" not in raw
    assert set(json.loads(raw)) == {"total_scans", "counting_since"}


async def test_concurrent_increments_do_not_lose_counts(tmp_path: Path) -> None:
    counter = UsageCounter(tmp_path / "stats.json")

    await asyncio.gather(*(counter.record_scan() for _ in range(25)))

    assert (await counter.read()).total_scans == 25


async def test_separate_counters_on_one_file_do_not_lose_counts(tmp_path: Path) -> None:
    """Stands in for multiple workers sharing the file; flock must serialise them."""
    path = tmp_path / "stats.json"
    first, second = UsageCounter(path), UsageCounter(path)

    await asyncio.gather(
        *(first.record_scan() for _ in range(10)),
        *(second.record_scan() for _ in range(10)),
    )

    assert (await first.read()).total_scans == 20


@pytest.mark.parametrize(
    "content",
    ['{"total_scans": "many"}', '{"total_scans": -5}', "not json at all", "{}"],
)
async def test_corrupt_counter_file_reads_as_zero(tmp_path: Path, content: str) -> None:
    path = tmp_path / "stats.json"
    path.write_text(content, encoding="utf-8")
    counter = UsageCounter(path)

    assert (await counter.read()).total_scans == 0

    # And a corrupt file must not block future counting.
    await counter.record_scan()
    assert (await counter.read()).total_scans == 1


async def test_unwritable_location_never_breaks_a_scan(tmp_path: Path) -> None:
    """A counter is a nice-to-have; it must not turn a good scan into a failure."""
    blocker = tmp_path / "blocked"
    blocker.write_text("not a directory", encoding="utf-8")
    counter = UsageCounter(blocker / "stats.json")

    await counter.record_scan()

    assert (await counter.read()).total_scans == 0


async def _await_terminal(client: httpx.AsyncClient, scan_id: str) -> None:
    for _ in range(200):
        state = (await client.get(f"/api/v1/scans/{scan_id}")).json()
        if state["status"] in {"completed", "completed_with_errors", "failed", "cancelled"}:
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"scan {scan_id} did not reach a terminal state")
