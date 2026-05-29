import json, tempfile, os, pytest
from storage import Storage

@pytest.fixture
def storage():
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump([], tmp)
    tmp.close()
    s = Storage(tmp.name)
    yield s
    os.unlink(tmp.name)

def test_list_cases_empty(storage):
    assert storage.list_cases() == []

def test_create_and_get_case(storage):
    case = storage.create_case({"title": "Test"})
    assert "id" in case
    assert len(case["id"]) == 12
    assert storage.get_case(case["id"])["title"] == "Test"

def test_update_case(storage):
    case = storage.create_case({"title": "Test"})
    storage.update_case(case["id"], {"title": "Updated"})
    assert storage.get_case(case["id"])["title"] == "Updated"

def test_get_nonexistent_case(storage):
    assert storage.get_case("nonexistent") is None

def test_update_nonexistent_case(storage):
    assert storage.update_case("nonexistent", {"title": "Nope"}) is None
