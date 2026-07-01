module.exports = (bp) =>
    `Based on the following business partner data, predict the most fitting industry as a human-readable label (e.g. "Banking", "Automotive", "Retail", "Healthcare", "Technology").
Return a JSON object with two fields: "industry": a short human-readable industry label and "reasoning": one sentence explaining why you chose this industry. Business Partner data:
Full Name: ${bp.BusinessPartnerFullName},
Type: ${bp.BusinessPartnerType},
Category: ${bp.BusinessPartnerCategory},
Legal Form: ${bp.LegalForm},
Country: ${bp.NameCountry}.
Respond with valid JSON only. Do not respond with text.`;
