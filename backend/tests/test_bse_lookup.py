"""Tests for BSE scrip code lookup."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_resolve_symbol_maps_bse_code_and_passes_through_symbols():
    from nse_client import resolve_symbol

    assert resolve_symbol("500325") == "RELIANCE"
    assert resolve_symbol("reliance") == "RELIANCE"
    assert resolve_symbol("999999") == "999999"
    assert resolve_symbol(" tcs ") == "TCS"
