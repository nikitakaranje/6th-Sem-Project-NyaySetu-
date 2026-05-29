import json
import uuid
from datetime import date
from typing import Optional

class Storage:
    def __init__(self, path: str = "data/cases.json"):
        self.path = path

    def _load(self) -> list:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save(self, data: list):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def list_cases(self) -> list:
        return self._load()

    def get_case(self, case_id: str) -> Optional[dict]:
        for c in self._load():
            if c["id"] == case_id:
                return c
        return None

    def create_case(self, data: dict) -> dict:
        cases = self._load()
        case = {
            **data,
            "id": uuid.uuid4().hex[:12],
            "created_at": date.today().isoformat(),
            "precedents": [],
        }
        cases.append(case)
        self._save(cases)
        return case

    def update_case(self, case_id: str, updates: dict) -> Optional[dict]:
        cases = self._load()
        for i, c in enumerate(cases):
            if c["id"] == case_id:
                cases[i].update(updates)
                self._save(cases)
                return cases[i]
        return None

    def delete_case(self, case_id: str) -> bool:
        cases = self._load()
        for i, c in enumerate(cases):
            if c["id"] == case_id:
                cases.pop(i)
                self._save(cases)
                return True
        return False
