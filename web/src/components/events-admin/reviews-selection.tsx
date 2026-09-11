"use client";

import { Button, FormControl } from "@/components/ui/primitives";
import type { ReviewRecord, ReviewSelection } from "@/lib/reviews-contract";

export function ReviewsSelection({ records, value, disabled, dirty, onChange, onSave }: {
  readonly records: readonly ReviewRecord[]; readonly value: ReviewSelection; readonly disabled: boolean; readonly dirty: boolean;
  readonly onChange: (value: ReviewSelection) => void; readonly onSave: () => void;
}) {
  const publicRecords = records.filter((record) => record.is_active === 1);
  function options(selected: number | null, featured: boolean) {
    const eligible = publicRecords.filter((record) => !featured || Boolean(record.image));
    const current = records.find((record) => record.id === selected);
    return <><option value="">선택 안 함</option>
      {selected !== null && !eligible.some((record) => record.id === selected) && <option value={selected} disabled>{current ? `${current.title} (${current.is_active ? "사진 없음" : "비공개"} · 재선택 필요)` : `삭제된 후기 #${selected} · 재선택 필요`}</option>}
      {eligible.map((record) => <option key={record.id} value={record.id}>{record.title} · {record.author}</option>)}
    </>;
  }
  const invalid = (value.featured_id !== null && !publicRecords.some((record) => record.id === value.featured_id && record.image)) || value.home_ids.some((id) => !publicRecords.some((record) => record.id === id));
  return <form className="events-form" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
    <h2>대표·홈 후기 선택</h2>
    <p className="muted">공개 후기만 선택할 수 있습니다. 대표 후기는 사진이 있는 1개, 홈 후기는 표시 순서대로 최대 3개입니다. 선택을 해제하면 뒤의 후기가 앞으로 이동합니다.</p>
    <fieldset className="events-editor-fields" disabled={disabled}>
      <label>후기 페이지 대표<FormControl><select value={value.featured_id ?? ""} onChange={(event) => onChange({ ...value, featured_id: event.target.value ? Number(event.target.value) : null })}>{options(value.featured_id, true)}</select></FormControl></label>
      {[0, 1, 2].map((index) => <label key={index}>홈 후기 {index + 1}<FormControl><select disabled={index > value.home_ids.length} value={value.home_ids[index] ?? ""} onChange={(event) => {
        const slots: (number | null)[] = [value.home_ids[0] ?? null, value.home_ids[1] ?? null, value.home_ids[2] ?? null];
        slots[index] = event.target.value ? Number(event.target.value) : null;
        onChange({ ...value, home_ids: slots.filter((id): id is number => id !== null) });
      }}>{options(value.home_ids[index] ?? null, false)}</select></FormControl></label>)}
    </fieldset>
    {invalid && <p className="events-error" role="alert">비공개·삭제된 후기 또는 사진이 없는 대표 후기는 공개되지 않습니다. 해당 선택을 해제하거나 다른 후기로 바꾼 뒤 저장해 주세요.</p>}
    <div className="button-row"><Button type="submit" disabled={disabled || !dirty || invalid}>선택 저장</Button></div>
  </form>;
}
