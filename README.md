# BP AI Enrichment

SAP CAP demo showing AI-powered Business Partner masterdata enrichment using SAP AI Core and GPT-5.

## What it does

Exposes a `predictIndustry` action on Business Partners that fetches a BP from the SAP S/4HANA Business Partner API and uses an LLM via SAP AI Core to predict the missing industry — returning a human-readable label and a reasoning sentence.

## Prerequisites & Setup

Before you start, make sure you have:

- Node.js, cds and VS Code (with the REST Client extension)
- An SAP S-user with access to the SAP API Business Hub

The full step-by-step tutorial for building the project is in [STEPS.md](STEPS.md).

If you get stuck along the way, each step has its own branch with the finished intermediate state — just check one out:

| Step | Branch |
|---|---|
| 1 — CAP Project Setup | `step/01-cap-setup` |
| 2 — Insurance Service | `step/02-insurance-service` |
| 3 — Business Partner External Service | `step/03-bp-external-service` |
| 4 — AI Industry Prediction | `step/04-ai-enrichment` |

```sh
git checkout step/03-bp-external-service
```
