# Presenter Guide — BP AI Enrichment

Live coding session. Build the project step by step from scratch.
Each section maps to a branch (`step/01` → `step/04`) — use the branches as checkpoints if something breaks.

---

## Before you start

Make sure you have ready:

For...
- **Step 1 & 2:** Node.js and VS Code (see first requirement in the README), with the REST Client extension installed. Terminal and VS Code open.
- **Step 3:** SAP API Business Hub API key (`BP_API_KEY`)
- **Step 4:** AI Core service key JSON (`AICORE_SERVICE_KEY`), AI Core deployment ID (`AI_CORE_DEPLOYMENT_ID`) and resource group

---

## Step 1 — CAP Project Setup

### Commands

```sh
cds init bp-ai-enrichment
cd bp-ai-enrichment
cds add nodejs
npm install
```

### Create the domain model

Create the file `db/data-model.cds` add the following content:

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

Create `.env` in the project root (ensure that the env file is added to your gitignore when using git):

```
BP_API_KEY=your-api-key-here
```

### Download the API specification

1. In the SAP Business Accelerator Hub, go to the Business Partner API (A2X): https://api.sap.com/api/API_BUSINESS_PARTNER/overview
2. In the Overview, select **API Specification**.
3. From the list of files, download the OData EDMX file. The file name when downloaded is `API_BUSINESS_PARTNER.edmx`.
4. Place the downloaded file in the project root folder.

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
      "model": "srv/external/API_BUSINESS_PARTNER"
    }
  }
}
```

### Add the sandbox credentials

The `credentials` block pointing to the S/4 sandbox is not generated automatically — add it by hand to the `API_BUSINESS_PARTNER` entry in `package.json`:

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
npm add @sap-cloud-sdk/http-client@3.x @sap-cloud-sdk/util@3.x @sap-cloud-sdk/connectivity@3.x @sap-cloud-sdk/resilience@3.x
```

### Start your app again

Verify if it is starting without errors.

```sh
cds watch
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

Add a `predictIndustry` action to the `BusinessPartners` entity.

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

Create `srv/prompts/predict-industry.json`:

```json
{
    "role": "You are a business data expert who classifies companies into industries.",
    "task": "Assign the business partner data provided in context to exactly one of the industries listed in industries.",
    "rules": [
        "Respond only with a valid JSON object according to outputFormat, with no additional text.",
        "For industry, choose exclusively a value from the industries list.",
        "If the data is ambiguous, choose the most likely industry and briefly justify it in reasoning."
    ],
    "industries": [
        "Financial Services",
        "Manufacturing & Automotive",
        "Retail & Consumer Goods",
        "Healthcare",
        "Technology & Telecommunications",
        "Energy & Utilities",
        "Logistics & Transportation",
        "Public Sector & Other"
    ],
    "context": {
        "fullName": "{{BusinessPartnerFullName}}",
        "type": "{{BusinessPartnerType}}",
        "category": "{{BusinessPartnerCategory}}",
        "legalForm": "{{LegalForm}}",
        "country": "{{NameCountry}}"
    },
    "outputFormat": {
        "type": "json",
        "schema": {
            "industry": "string – one of the values from industries",
            "reasoning": "string – one sentence explaining the choice of industry"
        }
    },
    "outputExample": {
        "industry": "Manufacturing & Automotive",
        "reasoning": "The company name and legal form suggest an automotive supplier."
    }
}

```

### Update the service handler

Extend the service handler with the `predictIndustry` function. It imports the prompt template and uses it to send a request to AI Core.

Replace `srv/business-partner-service.js`:

```js
const predictIndustryPrompt = require('./prompts/predict-industry.json');

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
                    model: { name: 'gpt-5', version: 'latest' },
                },
            },
            { resourceGroup: process.env.AI_CORE_RESOURCE_GROUP ?? 'default' }
        );

        const context = Object.fromEntries(
            Object.entries(predictIndustryPrompt.context).map(([key, placeholder]) => [
                key,
                placeholder.replace(/{{(\w+)}}/, (_, field) => bp[field] ?? ''),
            ])
        );

        const response = await client.chatCompletion({
            messages: [
                { role: 'user', content: JSON.stringify({ ...predictIndustryPrompt, context }) },
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

1. Run the POST request with `1000001` as a real Business Partner ID in the sandbox.
2. Observe the returned `industry` and `reasoning`.
3. Optionally, run the GET request first to browse other real Business Partner IDs and try the POST with one of those instead.

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
