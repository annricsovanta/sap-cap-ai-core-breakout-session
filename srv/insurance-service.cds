using insurance from '../db/data-model';

service InsuranceService {
    entity Policies           as projection on insurance.Policy;
    entity PolicyApplications as projection on insurance.PolicyApplication;
}
