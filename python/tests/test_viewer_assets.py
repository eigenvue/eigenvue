"""Tests for the standalone viewer assets shipped in the Python package.

These verify that ``eigenvue.show()`` / ``eigenvue.jupyter()`` serve the REAL
Canvas rendering engine (the same one the web app uses), not a placeholder
JSON-dump viewer. They are the regression guard for the "ship the real
renderer" contract: if the bundled ``visualizer.js`` ever degrades to a stub,
these tests fail.

The bundle is produced by ``scripts/build-standalone-viewer.mjs`` and lives in
``src/eigenvue/data/web/`` (committed to the repository).
"""

from __future__ import annotations

from eigenvue.catalog import _get_data_dir

WEB_DIR = _get_data_dir() / "web"


class TestViewerAssetsPresent:
    def test_all_three_files_exist(self) -> None:
        for name in ("index.html", "styles.css", "visualizer.js"):
            assert (WEB_DIR / name).is_file(), f"{name} should be bundled"


class TestRealRendererBundled:
    def test_bundle_is_not_a_stub(self) -> None:
        js = (WEB_DIR / "visualizer.js").read_text(encoding="utf-8")
        # The full engine + 13 layouts is ~85 KB minified; the old stub was ~3.5 KB.
        assert len(js) > 40_000
        assert "getContext" in js  # real Canvas 2D rendering

    def test_layouts_from_all_domains_bundled(self) -> None:
        js = (WEB_DIR / "visualizer.js").read_text(encoding="utf-8")
        for layout in (
            "array-with-pointers",  # classical
            "loss-landscape",  # deep learning
            "attention-heatmap",  # generative AI
            "bloch-sphere",  # quantum
        ):
            assert layout in js, f"layout {layout} should be bundled"

    def test_index_html_uses_canvas(self) -> None:
        html = (WEB_DIR / "index.html").read_text(encoding="utf-8")
        assert "<!doctype html>" in html.lower()
        assert "<canvas" in html
        assert "/static/visualizer.js" in html
        assert "/static/styles.css" in html
