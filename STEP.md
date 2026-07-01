# Step 1 — CAP Project Setup

## What we build
A clean SAP CAP project with a local domain model for an insurance use case. No services yet — just the data foundation.

## Key concepts
- CAP project structure (`db/`, `srv/`, `package.json`)
- CDS domain modelling with entities and associations
- Sample data via CSV files
- Running locally with SQLite in-memory

## Instructions

### 1. Install dependencies
```sh
npm install
```

### 2. Start the project
```sh
cds watch
```

CAP will serve the generic OData API automatically — no service definition needed yet. Open the served URL in your browser to explore the metadata.

### 3. Explore
- Open the CAP index page at `http://localhost:4004`
- Notice there are no services yet — only the domain model exists
- Look at `db/data-model.cds` to understand the two entities: `Policy` and `PolicyApplication`

## What's in this step

| File | Purpose |
|------|---------|
| `db/data-model.cds` | Domain model — `Policy` and `PolicyApplication` entities |
| `db/data/` | Sample CSV data loaded automatically by CAP |

## Next step
➡️ `step/02-insurance-service` — expose the data via a CAP service with a custom handler
