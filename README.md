# BP AI Enrichment

SAP CAP demo showing AI-powered Business Partner masterdata enrichment using SAP AI Core and GPT-4o.

## What it does

Exposes a `predictIndustry` action on Business Partners that fetches a BP from the SAP S/4HANA Business Partner API and uses an LLM via SAP AI Core to predict the missing industry — returning a human-readable label and a reasoning sentence.

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials
2. `npm install`
3. `cds watch`

## Project structure

| Folder | Content |
|--------|---------|
| `db/` | Domain model and sample data |
| `srv/` | CAP services and handlers |
| `srv/external/` | SAP Business Partner API definition |
| `srv/prompts/` | LLM prompt templates |
| `rest-client/` | HTTP test requests |
