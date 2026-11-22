# Recipe: API & Backend

## 1. What is checked
- Endpoint contract: exact HTTP status codes (`200`/`201`, `400` on invalid input, `401`/`403` on unauthorized access, `404` on missing resources).
- JSON response shape, required fields, and error messages match the contract.
- Input validation guards reject malformed JSON, missing fields, wrong types, and boundary values cleanly without unhandled exceptions.

## 2. Tools
- Team test runner (`node --test`, `vitest`, `jest`, `pytest`, `supertest`) hitting real handler/server endpoints.
- Schema validators (`zod`, `pydantic`, JSON Schema / OpenAPI checks).

## 3. Evidence produced
- Contract test execution in `.agents/evidence/report.{md,json}` via `mtsk verify`.
- Observed status codes and payload assertions for both happy paths and invalid inputs.

## 4. Typical mistakes the reviewer hunts for
- Malformed JSON body triggering uncaught `SyntaxError` -> `500` instead of `400`.
- Returning `200` on empty/invalid email or missing required fields.
- Mocking away validation middleware or testing helper functions instead of the real HTTP route.
- Leaking stack traces, database errors, or credentials inside `4xx`/`5xx` error payloads.
