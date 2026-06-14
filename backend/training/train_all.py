"""Orchestrator script to train all ML models sequentially.

Runs XGBoost and TFT training scripts in order,
reports timing and success/failure for each.

Usage:
    python train_all.py
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path


def run_script(name: str, script: str, args: list[str] | None = None) -> bool:
    """Run a training script as a subprocess.

    Args:
        name: Display name for the script.
        script: Script filename (relative to this directory).
        args: Optional CLI arguments.

    Returns:
        True if script exited successfully, False otherwise.
    """
    script_path = Path(__file__).resolve().parent / script
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)

    print(f"\n{'='*60}")
    print(f"  Starting: {name}")
    print(f"  Command:  {' '.join(cmd)}")
    print(f"{'='*60}\n")

    start = time.time()
    try:
        result = subprocess.run(
            cmd,
            cwd=str(script_path.parent),
            check=False,
        )
        duration = time.time() - start
        if result.returncode == 0:
            print(f"\n  ✓ {name} completed successfully in {duration:.1f}s")
            return True
        else:
            print(f"\n  ✗ {name} FAILED (exit code {result.returncode}) after {duration:.1f}s")
            return False
    except Exception as exc:
        duration = time.time() - start
        print(f"\n  ✗ {name} ERROR: {exc} (after {duration:.1f}s)")
        return False


def main() -> None:
    total_start = time.time()

    print("=" * 60)
    print("  ML Model Training Pipeline - Full Run")
    print("=" * 60)
    print()
    print("  This will train all 2 models sequentially:")
    print("    1. XGBoost Rating Classifier")
    print("    2. TFT Macro Resilience Scorer")
    print()

    # Define output directories (relative to backend/)
    backend_dir = Path(__file__).resolve().parent.parent
    xgb_output = str(backend_dir / "model_artifacts" / "xgboost_rating")
    tft_output = str(backend_dir / "model_artifacts" / "tft_macro")

    # Training pipeline
    results = {}

    # 1. XGBoost
    results["XGBoost Rating Classifier"] = run_script(
        "XGBoost Rating Classifier",
        "train_xgboost.py",
        ["--n-estimators", "200", "--max-depth", "6", "--learning-rate", "0.1", "--output-dir", xgb_output],
    )

    # 2. TFT
    results["TFT Macro Resilience"] = run_script(
        "TFT Macro Resilience Scorer",
        "train_tft.py",
        ["--epochs", "100", "--batch-size", "16", "--learning-rate", "0.001", "--output-dir", tft_output],
    )

    # Summary
    total_duration = time.time() - total_start
    print("\n")
    print("=" * 60)
    print("  Training Pipeline Summary")
    print("=" * 60)
    print()

    all_passed = True
    for name, success in results.items():
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"  {status}  {name}")
        if not success:
            all_passed = False

    print()
    print(f"  Total duration: {total_duration:.1f}s ({total_duration/60:.1f} min)")
    print()

    if all_passed:
        print("  All models trained successfully!")
        print()
        print("  Model artifacts saved to:")
        print(f"    - {xgb_output}/model.json")
        print(f"    - {tft_output}/model.pt")
    else:
        print("  Some models failed. Check logs above for details.")
        sys.exit(1)

    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
