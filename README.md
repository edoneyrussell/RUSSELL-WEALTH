# RUSSELL WEALTH
FinTech Investment & Cybersecurity Lab

## Overview
RUSSELL WEALTH is a fictional FinTech investment platform and cybersecurity lab built to explore the full lifecycle of a financial application—from brand and interface design to software development, financial functionality, security testing, monitoring, incident response, remediation, and continuous improvement.

The project combines graphic design, UI/UX, computer science, finance, business, and cybersecurity within a single evolving platform.

## Workspace layout

- [backend/](backend/) contains the Flask API and its [tests](backend/tests/).
- [frontend/](frontend/) contains the React app, [source](frontend/src/), and [tests](frontend/tests/).
- [migrations/](migrations/) contains the versioned database migrations.
- [app.py](app.py) launches the backend from the repository root.
- [.env.example](.env.example) documents configuration without real credentials.
- [.vscode/settings.json](.vscode/settings.json) provides shared editor settings and uses the local `.venv` Python environment.

Recovery copies and old design exports are kept locally under `backups/`, outside Git. Cleanup archives preserve their original paths and include a checksum manifest. Keep future recovery copies there instead of beside active source files. Dependencies, generated builds, logs, local databases, and secrets are excluded from Git and hidden from the editor explorer.
