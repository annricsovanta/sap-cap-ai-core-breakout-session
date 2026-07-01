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
