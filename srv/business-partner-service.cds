using { API_BUSINESS_PARTNER as external } from './external/API_BUSINESS_PARTNER';

service BusinessPartnerService {
    entity BusinessPartners as projection on external.A_BusinessPartner
        actions {
            action predictIndustry() returns { industry: String; reasoning: String; };
        };
}
