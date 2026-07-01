# Step 4 — AI Industry Prediction

## What we build
Add a `predictIndustry` bound action to the `BusinessPartners` entity. When called, it fetches the BP from S/4, sends its data to GPT-4o via SAP AI Core, and returns a predicted industry label with a reasoning sentence.

## Key concepts
- Bound actions in CDS
- SAP AI Core Orchestration Client (`@sap-ai-sdk/orchestration`)
- Prompt templates as separate modules
- Combining live external data (S/4) with AI inference (AI Core)

## Instructions

### 1. Set up credentials
Copy `.env.example` to `.env` and fill in all values:
```
BP_API_KEY=your-sap-api-hub-key

AI_CORE_DEPLOYMENT_ID=your-deployment-id
AI_CORE_RESOURCE_GROUP=your-resource-group
AICORE_SERVICE_KEY={"clientid":"...","clientsecret":"...","url":"...","serviceurls":{"AI_API_URL":"..."}}
```
The `AICORE_SERVICE_KEY` value is the full JSON from your AI Core BTP service key.

### 2. Install and start
```sh
npm install
cds watch
```

### 3. Test with the REST client
Open `rest-client/demo-requests.http`:
1. Run the **GET BusinessPartners** request — pick any `BusinessPartner` ID from the results
2. Replace `1000001` in the POST request with that ID
3. Run **POST predictIndustry** — observe the returned `industry` and `reasoning`

### 4. Explore the code
- `srv/business-partner-service.cds` — the `predictIndustry` action definition
- `srv/prompts/predict-industry.js` — the prompt template (separated for readability)
- `srv/business-partner-service.js` — the handler using `OrchestrationClient`

## What's new in this step

| File | Purpose |
|------|---------|
| `srv/business-partner-service.cds` | Added `predictIndustry` bound action |
| `srv/business-partner-service.js` | Handler — fetches BP, calls AI Core, returns prediction |
| `srv/prompts/predict-industry.js` | LLM prompt template |

## This is the final step 🎉
The full flow: **local mock data** (InsuranceService) + **live S/4 data** (BusinessPartnerService) + **AI enrichment** (predictIndustry) — all in one clean CAP project.
