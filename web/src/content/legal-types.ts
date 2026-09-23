export type LegalSection = {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
};

export type LegalDocument = {
  readonly title: string;
  readonly description: string;
  readonly introduction?: string;
  readonly effectiveDate?: string;
  readonly details?: readonly {
    readonly label: string;
    readonly value: string;
    readonly href?: string;
  }[];
  readonly sections?: readonly LegalSection[];
};

export type LegalKind =
  | "business-info"
  | "privacy-policy"
  | "terms-of-service"
  | "refund-policy";
