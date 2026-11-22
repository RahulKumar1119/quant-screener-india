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


def test_resolve_symbol_maps_renamed_symbols():
    from nse_client import resolve_symbol

    assert resolve_symbol("HEG") == "HEGAM"
    assert resolve_symbol("icicipruli") == "ICICILIFE"


def test_etfs_are_flagged_in_master():
    from nse_client import is_etf

    assert is_etf("NIFTYBEES")
    assert is_etf("niftybees")
    assert not is_etf("TCS")
