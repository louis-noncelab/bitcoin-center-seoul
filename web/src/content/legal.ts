import { businessInformation } from "./legal-business";
import { privacyPolicy } from "./legal-privacy";
import { refundPolicy } from "./legal-refunds";
import { termsOfService } from "./legal-terms";

export const legalDocuments = {
  "business-info": businessInformation,
  "privacy-policy": privacyPolicy,
  "terms-of-service": termsOfService,
  "refund-policy": refundPolicy,
} as const;
