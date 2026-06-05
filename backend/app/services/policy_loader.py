import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..config import get_settings


@lru_cache
def load_json(name: str) -> Any:
    data_path = Path(get_settings().data_dir) / name
    with data_path.open("r", encoding="utf-8") as file:
        return json.load(file)


@lru_cache
def load_markdown(name: str) -> str:
    data_path = Path(get_settings().data_dir) / name
    return data_path.read_text(encoding="utf-8")


def get_policy_terms() -> dict[str, Any]:
    return load_json("policy_terms.json")


def get_test_cases() -> dict[str, Any]:
    return load_json("test_cases.json")


def get_adjudication_rules() -> str:
    return load_markdown("adjudication_rules.md")


def get_sample_document_templates() -> dict[str, Any]:
    return load_json("sample_document_templates.json")
