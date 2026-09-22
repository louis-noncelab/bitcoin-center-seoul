"use client";

import { MenuSelect } from "@/components/ui/menu-select";
import { Button, FormControl } from "@/components/ui/primitives";
import { DateField } from "@/components/ui/date-field";
import { fulfillmentLabels } from "@/lib/commerce-contract";

export function OrderFilters({ query, disabled, onChange }: {
  readonly query: string; readonly disabled: boolean; readonly onChange: (patch: Record<string, string>) => void;
}) {
  const params = new URLSearchParams(query);
  return <form className="events-form" onSubmit={(event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onChange(Object.fromEntries(["q", "fulfillment", "from", "to"].map((name) => [name, String(fields.get(name) ?? "").trim()])));
  }}>
    <fieldset disabled={disabled} className="events-field-grid">
      <label>주문 검색<FormControl><input name="q" maxLength={100} defaultValue={params.get("q") ?? ""} placeholder="주문 번호, 이름, 상품, 송장" /></FormControl></label>
      <label>수령 방식<FormControl><MenuSelect name="fulfillment" defaultValue={params.get("fulfillment") ?? ""}>
        <option value="">전체</option>{Object.entries(fulfillmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </MenuSelect></FormControl></label>
      <DateField name="from" label="시작일 (한국 시간)" defaultValue={params.get("from") ?? ""} onDirty={() => {}} />
      <DateField name="to" label="종료일 (한국 시간)" defaultValue={params.get("to") ?? ""} onDirty={() => {}} />
    </fieldset>
    <div className="button-row"><Button type="submit" disabled={disabled}>검색</Button><Button variant="quiet" disabled={disabled} onClick={() => onChange({ q: "", fulfillment: "", from: "", to: "" })}>검색 초기화</Button></div>
  </form>;
}
