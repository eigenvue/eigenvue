"""
Pytest configuration for shared types tests.

Adds the project root to sys.path so that 'shared' module can be imported.
"""

import sys
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
