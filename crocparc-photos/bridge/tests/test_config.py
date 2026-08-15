"""La configuration est la source unique de verite : elle doit etre stricte."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import pytest

from bridge.config import Config, ConfigError, load_dotenv, parse_tz_offset


def test_inbox_est_obligatoire(monkeypatch, tmp_path):
    monkeypatch.delenv("WATCH_DIR", raising=False)
    with pytest.raises(ConfigError, match="WATCH_DIR"):
        Config.from_env(base_dir=tmp_path)


def test_dotenv_ne_recouvre_pas_l_environnement(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# commentaire\nWATCH_DIR=./depuis-le-fichier\nWATERMARK_TEXT='CROC PARC'\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("WATCH_DIR", str(tmp_path / "depuis-l-env"))
    config = Config.from_env(env_file=env_file, base_dir=tmp_path)
    assert config.watch_dir == tmp_path / "depuis-l-env"
    assert config.watermark_text == "CROC PARC"  # les quotes sont retirees


def test_chemins_relatifs_resolus_depuis_la_base(monkeypatch, tmp_path):
    monkeypatch.setenv("WATCH_DIR", "./inbox")
    monkeypatch.setenv("BRIDGE_DATA_DIR", "./donnees")
    config = Config.from_env(base_dir=tmp_path)
    assert config.watch_dir == (tmp_path / "inbox").resolve()
    assert config.db_path == (tmp_path / "donnees" / "bridge.db")


def test_valeurs_par_defaut(monkeypatch, tmp_path):
    monkeypatch.setenv("WATCH_DIR", str(tmp_path / "inbox"))
    config = Config.from_env(base_dir=tmp_path)
    assert config.preview_max_edge == 2048
    assert config.preview_quality == 82
    assert config.thumb_max_edge == 512
    assert config.thumb_quality == 75
    assert config.stable_seconds == 2.0
    assert config.session_ttl_days == 30
    assert config.extensions == (".jpg", ".jpeg")
    assert config.storage_backend == "local"
    assert config.registrar_backend == "none"


def test_decalage_horaire():
    assert parse_tz_offset("+04:00").utcoffset(None) == timedelta(hours=4)
    assert parse_tz_offset("-0330").utcoffset(None) == timedelta(hours=-3, minutes=-30)
    with pytest.raises(ConfigError):
        parse_tz_offset("Indian/Reunion")


@pytest.mark.parametrize(
    "name,value",
    [
        ("PREVIEW_MAX_EDGE", "grand"),
        ("BRIDGE_STABLE_SECONDS", "deux"),
        ("WATERMARK_OPACITY", "1.5"),
        ("BRIDGE_STORAGE_BACKEND", "s3"),
        ("BRIDGE_REGISTRAR_BACKEND", "make"),
    ],
)
def test_valeurs_invalides_refusees(monkeypatch, tmp_path, name, value):
    monkeypatch.setenv("WATCH_DIR", str(tmp_path / "inbox"))
    monkeypatch.setenv(name, value)
    with pytest.raises(ConfigError):
        Config.from_env(base_dir=tmp_path)


def test_ensure_dirs_cree_l_arborescence(config: Config):
    config.ensure_dirs()
    for directory in (config.watch_dir, config.work_dir, config.originals_dir, config.output_dir, config.log_dir):
        assert directory.is_dir()


def test_load_dotenv_absent_ne_leve_pas(tmp_path: Path):
    assert load_dotenv(tmp_path / "absent.env") == {}
