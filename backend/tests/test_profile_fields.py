"""Unit tests for ROCE, dividend yield and fiscal quarter helpers."""
import os
import sys
from datetime import date

import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from nse_client import compute_roce, dividend_yield_pct, fiscal_quarter_label


def test_fiscal_quarter_labels():
    assert fiscal_quarter_label(date(2025, 6, 30)) == "Q1 FY26"
    assert fiscal_quarter_label(date(2025, 9, 30)) == "Q2 FY26"
    assert fiscal_quarter_label(date(2025, 12, 31)) == "Q3 FY26"
    assert fiscal_quarter_label(date(2026, 3, 31)) == "Q4 FY26"


def test_dividend_yield_from_rate_and_price():
    assert dividend_yield_pct({"dividendRate": 100.0}, 2500.0) == 4.0
    assert dividend_yield_pct({"dividendRate": 10.0}, 2400.0) == 0.42


def test_dividend_yield_missing_data_is_zero():
    assert dividend_yield_pct({}, 2500.0) == 0.0
    assert dividend_yield_pct({"dividendRate": 10.0}, 0) == 0.0


def _frames(ebit_values, assets, current_liabilities):
    cols = pd.to_datetime(["2025-12-31", "2025-09-30", "2025-06-30", "2025-03-31"][: len(ebit_values)])
    fin = pd.DataFrame({c: [v] for c, v in zip(cols, ebit_values)}, index=["EBIT"])
    bal = pd.DataFrame({cols[0]: [assets, current_liabilities]}, index=["Total Assets", "Current Liabilities"])
    return fin, bal


def test_roce_uses_trailing_four_quarters():
    fin, bal = _frames([25.0, 25.0, 25.0, 25.0], 1200.0, 200.0)
    assert compute_roce(fin, bal) == 10.0


def test_roce_annualises_when_fewer_quarters():
    fin, bal = _frames([25.0, 25.0], 1200.0, 200.0)
    assert compute_roce(fin, bal) == 10.0


def test_roce_unavailable_returns_zero():
    assert compute_roce(None, None) == 0.0
    fin, bal = _frames([25.0], 100.0, 200.0)
    assert compute_roce(fin, bal) == 0.0
