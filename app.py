"""Russell Wealth backend launcher."""

import os
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"

os.chdir(ROOT)
sys.path.insert(0, str(BACKEND))

runpy.run_path(
    str(BACKEND / "app.py"),
    run_name="__main__"
)
