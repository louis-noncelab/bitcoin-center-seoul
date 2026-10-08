import type { AdminVariantRecord } from "./commerce-contract";
import type { ProductInput } from "@/server/catalog/validation";

export type VariantDraft = {
  readonly key: string;
  readonly sku: string;
  readonly optionLabelKo: string;
  readonly optionLabelEn: string;
  readonly stockOnHand: number;
  readonly stockOnHandDraft: string;
  readonly billableWeightG: number;
  readonly billableWeightGDraft: string;
  readonly active: boolean;
  readonly reservedStock: number;
} & (
  { readonly id?: undefined; readonly originalStockOnHand?: undefined }
  | { readonly id: string; readonly originalStockOnHand: number }
);

export const newVariant = (): VariantDraft => ({
  key: crypto.randomUUID(), sku: "", optionLabelKo: "", optionLabelEn: "",
  stockOnHand: 0, stockOnHandDraft: "0", billableWeightG: 0, billableWeightGDraft: "0", active: true, reservedStock: 0,
});
export const toDraft = (variant: AdminVariantRecord): VariantDraft => ({
  key: variant.id, ...variant, originalStockOnHand: variant.stockOnHand,
  stockOnHandDraft: String(variant.stockOnHand),
  billableWeightGDraft: String(variant.billableWeightG),
});

export function toVariantInput(variant: VariantDraft): ProductInput["variants"][number] {
  const fields = {
    sku: variant.sku.trim(),
    optionLabelKo: variant.optionLabelKo.trim(),
    optionLabelEn: variant.optionLabelEn.trim(),
    billableWeightG: variant.billableWeightG,
    active: variant.active,
  };
  if (!variant.id) return { ...fields, stockOnHand: variant.stockOnHand };
  if (variant.stockOnHand === variant.originalStockOnHand) return { ...fields, id: variant.id };
  return { ...fields, id: variant.id, stockOnHand: variant.stockOnHand, expectedStockOnHand: variant.originalStockOnHand };
}
