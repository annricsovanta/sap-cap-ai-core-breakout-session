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
