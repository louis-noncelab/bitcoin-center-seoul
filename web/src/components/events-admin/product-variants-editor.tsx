import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import type { AdminVariantRecord } from "@/lib/commerce-contract";

export type VariantDraft = {
  readonly key: string;
  readonly id?: string;
  readonly sku: string;
  readonly optionLabelKo: string;
  readonly optionLabelEn: string;
  readonly stockOnHand: number;
  readonly billableWeightG: number;
  readonly active: boolean;
  readonly reservedStock: number;
};

export const newVariant = (): VariantDraft => ({
  key: crypto.randomUUID(), sku: "", optionLabelKo: "", optionLabelEn: "",
  stockOnHand: 0, billableWeightG: 0, active: true, reservedStock: 0,
});
export const toDraft = (variant: AdminVariantRecord): VariantDraft => ({ key: variant.id, ...variant });

export const toVariantInput = (variant: VariantDraft) => ({
  ...(variant.id ? { id: variant.id } : {}),
  sku: variant.sku.trim(),
  optionLabelKo: variant.optionLabelKo.trim(),
  optionLabelEn: variant.optionLabelEn.trim(),
  stockOnHand: variant.stockOnHand,
  billableWeightG: variant.billableWeightG,
  active: variant.active,
});

export function ProductVariantsEditor({ variants, onChange }: {
  readonly variants: readonly VariantDraft[];
  readonly onChange: (variants: VariantDraft[]) => void;
}) {
  function patchVariant(key: string, patch: Partial<VariantDraft>) {
    onChange(variants.map((variant) => variant.key === key ? { ...variant, ...patch } : variant));
  }
  return <>
    <h3>옵션</h3>
    <p className="muted">SKU는 저장 뒤 바꿀 수 없습니다. 판매를 멈추려면 옵션을 삭제하지 말고 공개를 해제해 주세요. 결제 대기 중인 수량보다 재고를 적게 줄일 수 없습니다.</p>
    {variants.map((variant) => <fieldset className="events-editor-fields" key={variant.key}>
      <div className="events-field-grid">
        <label>SKU<FormControl><input value={variant.sku} required maxLength={100} pattern="[A-Za-z0-9_-]+" readOnly={Boolean(variant.id)} onChange={(event) => patchVariant(variant.key, { sku: event.target.value })} /></FormControl></label>
        <label>옵션 이름<FormControl><input value={variant.optionLabelKo} maxLength={200} onChange={(event) => patchVariant(variant.key, { optionLabelKo: event.target.value })} /></FormControl></label>
      </div>
      <div className="events-field-grid">
        <label>영어 옵션 이름<FormControl><input value={variant.optionLabelEn} maxLength={200} onChange={(event) => patchVariant(variant.key, { optionLabelEn: event.target.value })} /></FormControl></label>
        <label>재고<FormControl><input type="number" min={variant.reservedStock} max={1000000} step={1} value={variant.stockOnHand} onChange={(event) => patchVariant(variant.key, { stockOnHand: Number(event.target.value) })} /></FormControl></label>
      </div>
      <div className="events-field-grid">
        <label>포장 무게 (g)<FormControl><input type="number" min={0} max={1000000} step={1} value={variant.billableWeightG} onChange={(event) => patchVariant(variant.key, { billableWeightG: Number(event.target.value) })} /></FormControl></label>
        <label className="events-checkbox"><ChoiceControl type="checkbox" checked={variant.active} onChange={(event) => patchVariant(variant.key, { active: event.target.checked })} />판매 중</label>
      </div>
      {variant.reservedStock > 0 && <p className="muted">결제 대기 {variant.reservedStock}개</p>}
      {variants.length > 1 && <div className="button-row"><Button variant="quiet" onClick={() => { onChange(variants.filter((item) => item.key !== variant.key)); }}>이 옵션 제거</Button></div>}
    </fieldset>)}
    <div className="button-row"><Button variant="secondary" onClick={() => { onChange([...variants, newVariant()]); }}>옵션 추가</Button></div>

  </>;
}
