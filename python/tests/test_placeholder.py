"""Placeholder test to verify pytest is configured correctly."""


def test_eigenvue_imports() -> None:
    """Verify that the eigenvue package can be imported."""
    import eigenvue

    assert eigenvue.__version__ == "0.1.0"
