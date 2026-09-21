"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { Link } from "@/i18n/navigation";
import {
  adminCategoryRecord, adminProductRecord, fulfillmentLabels,
  type AdminCategoryRecord, type AdminProductRecord, type AdminVariantRecord,
} from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { GalleryField } from "./gallery-field";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const productsSchema = z.array(adminProductRecord);
const categoriesSchema = z.array(adminCategoryRecord);
const fulfillments = ["PICKUP", "DOMESTIC", "INTERNATIONAL"] as const;

type VariantDraft = {
  readonly key: string;
  id?: string;
  sku: string;
  optionLabelKo: string;
  optionLabelEn: string;
  stockOnHand: number;
  billableWeightG: number;
  active: boolean;
  reservedStock: number;
};

const newVariant = (): VariantDraft => ({
  key: crypto.randomUUID(), sku: "", optionLabelKo: "", optionLabelEn: "",
  stockOnHand: 0, billableWeightG: 0, active: true, reservedStock: 0,
});
const toDraft = (variant: AdminVariantRecord): VariantDraft => ({ key: variant.id, ...variant });

export function ProductsAdmin() {
  const [products, setProducts] = useState<AdminProductRecord[]>([]);
  const [categories, setCategories] = useState<AdminCategoryRecord[]>([]);
  const [selected, setSelected] = useState<AdminProductRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [fulfillment, setFulfillment] = useState<string[]>(["PICKUP"]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const uploads = useRef(0);
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      adminRequest("/api/admin/products", productsSchema, { signal: abort.signal }),
      adminRequest("/api/admin/categories", categoriesSchema, { signal: abort.signal }),
    ])
      .then(([items, categoryItems]) => {
        if (abort.signal.aborted) return;
        setProducts(items); setCategories(categoryItems); setAuthenticated(true);
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [revision]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  function handleError(caught: unknown) {
    setError(errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }
  function uploadPending(value: boolean) { uploads.current += value ? 1 : -1; setUploading(uploads.current > 0); }
  async function leave() {
    if (busy.current || uploads.current > 0) return false;
    const accepted = !dirty || await confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 변경사항은 사라집니다.", confirmLabel: "버리기" });
    return accepted && !busy.current && uploads.current === 0;
  }
  function edit(product: AdminProductRecord | null) {
    setSelected(product);
    setImages(product?.imageUrl ? [product.imageUrl] : []);
    setVariants(product ? product.variants.map(toDraft) : [newVariant()]);
    setFulfillment(product ? [...product.allowedFulfillments] : ["PICKUP"]);
    setEditing(true); setDirty(false); setError(""); setMessage("");
  }
  function patchVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((current) => current.map((variant) => variant.key === key ? { ...variant, ...patch } : variant));
    setDirty(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired || uploads.current > 0) return;
    const form = new FormData(event.currentTarget);
    const input = {
      slug: String(form.get("slug")).trim(),
      titleKo: String(form.get("titleKo")).trim(),
      titleEn: String(form.get("titleEn")).trim(),
      descriptionKo: String(form.get("descriptionKo")),
      descriptionEn: String(form.get("descriptionEn")),
      imageUrl: images[0] ?? "",
      categoryId: String(form.get("categoryId") ?? ""),
      published: form.has("published"),
      memberOnly: false,
      priceKind: String(form.get("priceKind")),
      priceAmount: String(form.get("priceAmount")).trim(),
      listPriceAmount: String(form.get("listPriceAmount") ?? "").trim(),
      allowedFulfillments: fulfillment,
      variants: variants.map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),
        sku: variant.sku.trim(),
        optionLabelKo: variant.optionLabelKo.trim(),
        optionLabelEn: variant.optionLabelEn.trim(),
        stockOnHand: variant.stockOnHand,
        billableWeightG: variant.billableWeightG,
        active: variant.active,
      })),
    };
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/products${selected ? `/${selected.id}` : ""}`, z.unknown(),
        jsonBody(input, selected ? "PATCH" : "POST"));
      setEditing(false); setDirty(false); setMessage("저장했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function archive(product: AdminProductRecord) {
    if (busy.current || uploads.current > 0) return;
    const accepted = await confirm({
      title: "상품 비공개",
      description: `“${product.titleKo}”을(를) 비공개로 돌릴까요? 주문 기록이 남아 있어 삭제하지 않고 판매만 중단합니다.`,
      confirmLabel: "비공개로 전환",
    });
    if (!accepted || busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/products/${product.id}`, z.unknown(), { method: "DELETE" });
      setMessage("비공개로 전환했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  if (authenticated === null) {
    return error
      ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></>
      : <p role="status">로그인 확인 중…</p>;
  }
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;

  return <div className="events-admin-workspace">
    {dialog}
    <CommerceAdminNav current="/admin/products" disabled={pending} />
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>

    {editing ? <form className="events-form" key={selected?.id ?? "new"} onSubmit={(event) => void save(event)} onChange={() => setDirty(true)}>
      <h2>{selected ? "상품 수정" : "상품 등록"}</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <div className="events-field-grid">
          <label>상품명<FormControl><input name="titleKo" required maxLength={200} defaultValue={selected?.titleKo ?? ""} /></FormControl></label>
          <label>영어 상품명<FormControl><input name="titleEn" required maxLength={200} defaultValue={selected?.titleEn ?? ""} /></FormControl></label>
        </div>
        <label>URL 슬러그<FormControl><input name="slug" required defaultValue={selected?.slug ?? ""} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} placeholder="bitcoin-standard" aria-describedby="product-slug-help" /></FormControl></label>
        <p id="product-slug-help" className="muted">/shop/ 뒤에 붙는 주소입니다. 영문 소문자·숫자·하이픈을 사용해 주세요.</p>

        <div className="events-field-grid">
          <label>판매가<FormControl><input name="priceAmount" required inputMode="numeric" pattern="[1-9][0-9]*" defaultValue={selected?.priceAmount ?? ""} aria-describedby="product-price-help" /></FormControl></label>
          <label>가격 단위<FormControl>
            <select name="priceKind" defaultValue={selected?.priceKind ?? "KRW_FIXED"}>
              <option value="KRW_FIXED">원 (주문 시 사토시로 환산)</option>
              <option value="BTC_FIXED">사토시 고정</option>
            </select>
          </FormControl></label>
        </div>
        <p id="product-price-help" className="muted">원으로 매기면 주문할 때마다 거래소 시세로 사토시로 환산합니다. 사토시 고정은 시세와 무관하게 같은 금액을 받습니다.</p>
        <label>정가 (선택)<FormControl><input name="listPriceAmount" inputMode="numeric" pattern="[1-9][0-9]*" defaultValue={selected?.listPriceAmount ?? ""} aria-describedby="product-list-help" /></FormControl></label>
        <p id="product-list-help" className="muted">판매가보다 큰 값을 넣으면 할인 전 가격으로 함께 표시됩니다. 비워 두면 표시하지 않습니다.</p>

        <label>분류 (선택)<FormControl>
          <select name="categoryId" defaultValue={selected?.categoryId ?? ""}>
            <option value="">분류 없음</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.nameKo}</option>)}
          </select>
        </FormControl></label>

        <fieldset className="collection-kind"><legend>수령 방법</legend><div className="button-row">
          {fulfillments.map((mode) => <label className="events-checkbox" key={mode}>
            <ChoiceControl type="checkbox" checked={fulfillment.includes(mode)} onChange={(event) => {
              setFulfillment((current) => event.target.checked ? [...current, mode] : current.filter((value) => value !== mode));
              setDirty(true);
            }} />
            {fulfillmentLabels[mode]}
          </label>)}
        </div></fieldset>
        <p className="muted">택배를 선택하면 옵션마다 포장 무게를 1g 이상 입력해야 합니다. 배송비는 무게 구간으로 계산합니다.</p>

        <GalleryField locale="ko" images={images} onChange={(next) => { setImages(next.slice(0, 1)); setDirty(true); }} onPending={uploadPending} onExpired={() => setExpired(true)} />
        <p className="muted">첫 번째 사진만 상품 대표 이미지로 사용합니다.</p>

        <label>소개<FormControl><textarea name="descriptionKo" required rows={5} maxLength={100000} defaultValue={selected?.descriptionKo ?? ""} /></FormControl></label>
        <label>영어 소개<FormControl><textarea name="descriptionEn" required rows={4} maxLength={100000} defaultValue={selected?.descriptionEn ?? ""} /></FormControl></label>

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
          {variants.length > 1 && <div className="button-row"><Button variant="quiet" onClick={() => { setVariants((current) => current.filter((item) => item.key !== variant.key)); setDirty(true); }}>이 옵션 제거</Button></div>}
        </fieldset>)}
        <div className="button-row"><Button variant="secondary" onClick={() => { setVariants((current) => [...current, newVariant()]); setDirty(true); }}>옵션 추가</Button></div>

        <label className="events-checkbox"><ChoiceControl type="checkbox" name="published" defaultChecked={selected?.published ?? false} />공개</label>
      </fieldset>
      <div className="button-row">
        <Button type="submit" disabled={pending || uploading || expired}>{pending ? "저장 중…" : "저장"}</Button>
        <Button variant="secondary" disabled={pending || uploading} onClick={() => { void leave().then((accepted) => { if (accepted) { setEditing(false); setDirty(false); setRevision((value) => value + 1); } }); }}>취소</Button>
      </div>
    </form> : <>
      <div className="events-admin-toolbar">
        <h2>상품 목록</h2>
        <Button disabled={pending || expired} onClick={() => edit(null)}>상품 등록</Button>
      </div>
      <ul className="events-admin-list">
        {products.map((product) => <li key={product.id}>
          <div>
            <h3>{product.titleKo}</h3>
            <p className="muted">
              {product.published ? "공개" : "비공개"}
              {product.categoryNameKo ? ` · ${product.categoryNameKo}` : ""}
              {` · ${product.priceKind === "KRW_FIXED" ? `₩${new Intl.NumberFormat("ko").format(BigInt(product.priceAmount))}` : `${new Intl.NumberFormat("ko").format(BigInt(product.priceAmount))} sats`}`}
              {` · 재고 ${product.variants.filter((variant) => variant.active).reduce((sum, variant) => sum + variant.stockOnHand - variant.reservedStock, 0)}`}
            </p>
          </div>
          <div className="button-row">
            {product.published && <Link href={`/shop/${product.slug}`} locale="ko" className="button" data-variant="quiet">보기</Link>}
            <Button variant="secondary" disabled={pending || expired} onClick={() => edit(product)}>수정</Button>
            {product.published && <Button variant="quiet" disabled={pending || expired} onClick={() => void archive(product)}>비공개</Button>}
          </div>
        </li>)}
        {!products.length && <li>등록된 상품이 없습니다.</li>}
      </ul>
    </>}
  </div>;
}
