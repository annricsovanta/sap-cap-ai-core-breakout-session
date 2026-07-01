# Presenter Guide — BP AI Enrichment

Live coding session. Build the project step by step from scratch.
Each section maps to a branch (`step/01` → `step/04`) — use the branches as checkpoints if something breaks.

---

## Before you start

Make sure you have ready:
- SAP API Business Hub API key (`BP_API_KEY`)
- AI Core service key JSON (`AICORE_SERVICE_KEY`)
- AI Core deployment ID (`AI_CORE_DEPLOYMENT_ID`) and resource group

Terminal open, VS Code open, REST client extension installed.

---

## Step 1 — CAP Project Setup

### Commands

```sh
cds init bp-ai-enrichment
cd bp-ai-enrichment
npm install
```

### Create the domain model

Open `db/data-model.cds` and replace its contents:

```cds
namespace insurance;

entity Policy {
  key ID          : UUID;
      type        : String(50);
      description : String(255);
}

entity PolicyApplication {
  key ID                : UUID;
      businessPartnerId : String(10);
      policy            : Association to Policy;
      status            : String(20);
      riskScore         : Integer;
      riskExplanation   : String(1000);
      appliedOn         : Date;
}
```

### Add sample data

Create `db/data/insurance-Policy.csv`:

```csv
ID,type,description
f1000001-0000-0000-0000-000000000001,Car,Coverage for personal and commercial vehicles
f1000001-0000-0000-0000-000000000002,Health,Medical and hospitalization coverage for individuals
f1000001-0000-0000-0000-000000000003,Property,Coverage for residential and commercial properties
```

Create `db/data/insurance-PolicyApplication.csv`:

```csv
ID,businessPartnerId,policy_ID,status,riskScore,riskExplanation,appliedOn
a2000001-0000-0000-0000-000000000001,1000001,f1000001-0000-0000-0000-000000000001,approved,22,Low risk customer with stable profile.,2024-01-15
a2000001-0000-0000-0000-000000000002,1000002,f1000001-0000-0000-0000-000000000002,review,61,Medium risk due to incomplete company data.,2024-02-20
a2000001-0000-0000-0000-000000000003,1000003,f1000001-0000-0000-0000-000000000003,rejected,88,High risk profile flagged for further review.,2024-03-05
```

### Run it

```sh
cds watch
```

Open `http://localhost:4004` — notice there are no services yet, only the domain model is registered.

---

## Step 2 — Insurance Service

### Create the service definition

Create `srv/insurance-service.cds`:

```cds
using insurance from '../db/data-model';

service InsuranceService {
    entity Policies           as projection on insurance.Policy;
    entity PolicyApplications as projection on insurance.PolicyApplication;
}
```

### Create the service handler

Create `srv/insurance-service.js`:

```js
module.exports = async (srv) => {
    srv.after('READ', 'PolicyApplications', (applications) => {
        for (const app of applications) {
            if (!app.status) {
                app.status = 'pending'
            }
        }
    });
};
```

### Create the REST client file

Create `rest-client/demo-requests.http`:

```http
# Get all Policy Applications (local mock data)
GET http://localhost:4004/odata/v4/insurance/PolicyApplications?$expand=policy
Accept: application/json
```

### Test it

Run the request in the REST client. You should see three policy applications with their expanded policy.

---

## Step 3 — Business Partner External Service

### Set up credentials

Create `.env` in the project root:

```
BP_API_KEY=your-api-key-here
```

### Import the external API

Run in the terminal (point to where you have the EDMX file):

```sh
cds import API_BUSINESS_PARTNER.edmx --as cds
```

This generates `srv/external/API_BUSINESS_PARTNER.cds` — the full API definition, auto-generated.

It also adds this to `package.json` automatically:

```json
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      "kind": "odata-v2",
      "model": "srv/external/API_BUSINESS_PARTNER",
      "credentials": {
        "url": "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER"
      }
    }
  }
}
```

### Install the SAP Cloud SDK

```sh
npm add @sap-cloud-sdk/connectivity @sap-cloud-sdk/http-client
```

### Create the service definition

Create `srv/business-partner-service.cds`:

```cds
using { API_BUSINESS_PARTNER as external } from './external/API_BUSINESS_PARTNER';

service BusinessPartnerService {
    entity BusinessPartners as projection on external.A_BusinessPartner;
}
```

### Create the service handler

Create `srv/business-partner-service.js`:

```js
module.exports = async (srv) => {
    const bpApi = await cds.connect.to('API_BUSINESS_PARTNER');

    bpApi.before('*', (req) => {
        req.headers ??= {};
        req.headers['APIKey'] = process.env.BP_API_KEY;
    });

    srv.on('READ', 'BusinessPartners', async (req) => {
        return bpApi.run(req.query);
    });
};
```

### Add to the REST client

Add to `rest-client/demo-requests.http`:

```http
###

# Get Business Partners from S/4 sandbox
GET http://localhost:4004/odata/v4/business-partner/BusinessPartners?$top=10&$select=BusinessPartner,BusinessPartnerFullName,BusinessPartnerType,LegalForm,NameCountry,Industry
Accept: application/json
```

### Test it

Run the GET request — you should see live Business Partners from the S/4 sandbox. Notice the `Industry` field is empty on most of them.

---

## Step 4 — AI Industry Prediction

### Set up AI Core credentials

Add to `.env`:

```
AI_CORE_DEPLOYMENT_ID=your-deployment-id
AI_CORE_RESOURCE_GROUP=default
AICORE_SERVICE_KEY={"clientid":"...","clientsecret":"...","url":"...","serviceurls":{"AI_API_URL":"..."}}
```

The `AICORE_SERVICE_KEY` is the full JSON from your AI Core BTP service key.

### Install the SAP AI SDK

```sh
npm add @sap-ai-sdk/orchestration
```

### Update the service definition

Update `srv/business-partner-service.cds`:

```cds
using { API_BUSINESS_PARTNER as external } from './external/API_BUSINESS_PARTNER';

service BusinessPartnerService {
    entity BusinessPartners as projection on external.A_BusinessPartner
        actions {
            action predictIndustry() returns { industry: String; reasoning: String; };
        };
}
```

### Create the prompt template

Create `srv/prompts/predict-industry.js`:

```js
module.exports = (bp) =>
    `Based on the following business partner data, predict the most fitting industry as a human-readable label (e.g. "Banking", "Automotive", "Retail", "Healthcare", "Technology").
Return a JSON object with two fields: "industry": a short human-readable industry label and "reasoning": one sentence explaining why you chose this industry. Business Partner data:
Full Name: ${bp.BusinessPartnerFullName},
Type: ${bp.BusinessPartnerType},
Category: ${bp.BusinessPartnerCategory},
Legal Form: ${bp.LegalForm},
Country: ${bp.NameCountry}.
Respond with valid JSON only. Do not respond with text.`;
```

### Update the service handler

Replace `srv/business-partner-service.js`:

```js
const predictIndustryPrompt = require('./prompts/predict-industry');

module.exports = async (srv) => {
    const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
    const bpApi = await cds.connect.to('API_BUSINESS_PARTNER');

    bpApi.before('*', (req) => {
        req.headers ??= {};
        req.headers['APIKey'] = process.env.BP_API_KEY;
    });

    srv.on('READ', 'BusinessPartners', async (req) => {
        return bpApi.run(req.query);
    });

    srv.on('predictIndustry', 'BusinessPartners', async (req) => {
        const { BusinessPartner } = req.params[0];

        const bp = await bpApi.run(
            SELECT.one
                .from('API_BUSINESS_PARTNER.A_BusinessPartner')
                .where({ BusinessPartner })
        );
        if (!bp) return req.error(404, `Business Partner ${BusinessPartner} not found`);

        const client = new OrchestrationClient(
            {
                promptTemplating: {
                    model: { name: 'gpt-4o', version: 'latest' },
                },
            },
            { resourceGroup: process.env.AI_CORE_RESOURCE_GROUP ?? 'default' }
        );

        const response = await client.chatCompletion({
            messages: [
                { role: 'system', content: 'You are a business data expert who classifies companies into industries.' },
                { role: 'user', content: predictIndustryPrompt(bp) },
            ],
            response_format: { type: 'json_object' },
        });

        const { industry, reasoning } = JSON.parse(response.getContent());
        return { industry, reasoning };
    });
};
```

### Add to the REST client

Add to `rest-client/demo-requests.http`:

```http
###

# Predict industry for a Business Partner
POST http://localhost:4004/odata/v4/business-partner/BusinessPartners('1000001')/predictIndustry
Content-Type: application/json

{}
```

### Test it

1. First run the GET to find a real Business Partner ID from the sandbox
2. Replace `1000001` in the POST with that ID
3. Run the POST — observe the returned `industry` and `reasoning`

---

## Full demo flow (summary)

| Request | What it shows |
|---------|--------------|
| `GET PolicyApplications` | Local CAP data with mock insurance applications |
| `GET BusinessPartners` | Live S/4 data — notice empty Industry field |
| `POST predictIndustry` | AI enrichment — industry predicted from sparse BP data |

---

## If something breaks

| Problem | Fix |
|---------|-----|
| 401 on BusinessPartners | Check `BP_API_KEY` in `.env` |
| 404 on predictIndustry | Check `AI_CORE_DEPLOYMENT_ID` and resource group in AI Launchpad |
| 401 on AI Core | `AICORE_SERVICE_KEY` JSON may be malformed — check for unescaped characters |
| BP not found | Use a real ID from the GET request first |

Fallback: `git checkout step/04-ai-enrichment` — fully working state.
