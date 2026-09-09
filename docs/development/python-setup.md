# Python gold evaluator

The optional [gold evaluator](../../agent/gold_evaluator.py) supplies application risk-assessment output. It does not replace physical appraisal or certify gold custody.

## Setup

From the repository root:

```sh
python3 -m venv agent/.venv
agent/.venv/bin/python -m pip install -r agent/requirements.txt
```

On Windows, create the environment with `py -m venv agent/.venv` and use `agent/.venv/Scripts/python.exe`.

Set backend `PYTHON_EXECUTABLE` to the absolute path of that environment's Python executable. Configure the evaluator from [agent/.env.example](../../agent/.env.example); do not commit populated environment files. The evaluator loads `.env` from its working directory, so running it manually from `agent/` and launching it through the backend may use different working directories.

## Manual check

From `agent/`, inspect the supported arguments before using sample data:

```sh
.venv/bin/python gold_evaluator.py --help
```

Use [sample_loan.json](../../agent/sample_loan.json) as a reference for input. Confirm external model/API dependencies are configured before expecting a complete evaluation.

## Troubleshooting

- “Python was not found”: verify the absolute `PYTHON_EXECUTABLE` path.
- Missing module: install requirements with the same interpreter the backend uses.
- Model/API failure: check the evaluator's environment and service connectivity; do not paste secrets into logs or issue reports.
- Invalid output: inspect the backend integration and evaluator logs, without treating incomplete output as an approved appraisal.

Railway packages the evaluator with the API. See the [production runbook](../deployment/production.md) before changing the Docker build.
