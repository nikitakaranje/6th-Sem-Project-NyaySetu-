import pytest
from ollama_client import OllamaClient

@pytest.fixture
def client():
    return OllamaClient()

def test_extract_facts_shape(client):
    import httpx
    try:
        result = client.extract_facts("Test case text")
        assert "facts_summary" in result
        assert "ipc_sections" in result
        assert "accused_profile" in result
        assert "key_issues" in result
        assert isinstance(result["ipc_sections"], list)
    except httpx.ConnectError:
        pytest.skip("Ollama not running")
    except httpx.HTTPStatusError:
        pytest.skip("Ollama model unavailable")

def test_chunk_text(client):
    text = "Ramesh Sharma arrested for theft under Section 379 IPC outside a grocery store."
    chunks = client.chunk_text(text, chunk_size=20, overlap=5)
    assert len(chunks) > 0
    assert any("Ramesh" in chunk["text"] for chunk in chunks)

def test_retrieve_relevant_chunks(client):
    chunks = [
        {"id": 0, "text": "Ramesh Sharma arrested for theft under Section 379 IPC outside a grocery store."},
        {"id": 1, "text": "The accused has no prior criminal records and claims false implication."},
        {"id": 2, "text": "The grocery owner claims the stolen item was valued at ₹5,000."}
    ]
    relevant = client.retrieve_relevant_chunks(chunks, "prior criminal record", top_k=1)
    assert len(relevant) == 1
    assert relevant[0]["id"] == 1
    
    relevant = client.retrieve_relevant_chunks(chunks, "grocery stolen", top_k=1)
    assert len(relevant) == 1
    assert relevant[0]["id"] in [0, 2]
