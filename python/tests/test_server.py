"""Tests for the Flask visualization server."""

from __future__ import annotations

import json

import pytest

from eigenvue.server import _create_app


@pytest.fixture()
def client():
    """Create a Flask test client for binary-search."""
    app = _create_app("binary-search", None)
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestServerRoutes:
    def test_index_returns_html(self, client) -> None:
        response = client.get("/")
        assert response.status_code == 200
        assert b"<!DOCTYPE html>" in response.data

    def test_api_steps_returns_json(self, client) -> None:
        response = client.get("/api/steps")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "algorithmId" in data
        assert data["algorithmId"] == "binary-search"
        assert "steps" in data
        assert isinstance(data["steps"], list)
        assert len(data["steps"]) > 0

    def test_api_steps_has_meta(self, client) -> None:
        response = client.get("/api/steps")
        data = json.loads(response.data)
        assert "meta" in data
        assert data["meta"]["id"] == "binary-search"

    def test_api_health_returns_ok(self, client) -> None:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "ok"
        assert data["algorithmId"] == "binary-search"

    def test_static_css_available(self, client) -> None:
        response = client.get("/static/styles.css")
        assert response.status_code == 200

    def test_static_js_available(self, client) -> None:
        response = client.get("/static/visualizer.js")
        assert response.status_code == 200


class TestServerWithCustomInputs:
    def test_custom_inputs(self) -> None:
        app = _create_app("binary-search", {"array": [1, 2, 3], "target": 2})
        app.config["TESTING"] = True
        with app.test_client() as client:
            response = client.get("/api/steps")
            data = json.loads(response.data)
            # Should have steps for searching 2 in [1,2,3]
            assert len(data["steps"]) > 0
