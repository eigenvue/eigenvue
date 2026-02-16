"""Basic smoke test to verify the eigenvue package can be imported."""


def test_eigenvue_imports() -> None:
    """Verify that the eigenvue package can be imported."""
    import eigenvue

    assert eigenvue.__version__ == "1.0.1"
