"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { MenuSelect } from "@/components/ui/menu-select";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { Link } from "@/i18n/navigation";
import {
  adminCategoryRecord, adminProductRecord, fulfillmentLabels,
  type AdminCategoryRecord, type AdminProductRecord,
} from "@/lib/commerce-contract";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { ProductVariantsEditor, newVariant, toDraft, toVariantInput, type VariantDraft } from "./product-variants-editor";
import { GalleryField } from "./gallery-field";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const productsSchema = z.array(adminProductRecord);
const categoriesSchema = z.array(adminCategoryRecord);
const fulfillments = ["PICKUP", "DOMESTIC", "INTERNATIONAL"] as const;

export function ProductsAdmin() {
  const [products, setProducts] = useState<AdminProductRecord[]>([]);
  const [categories, setCategories] = useState<AdminCategoryRecord[]>([]);
  const [category, setCategory] = useState<AdminCategoryRecord | null>(null);
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
    setImages(product?.images.length ? [...product.images] : product?.imageUrl ? [product.imageUrl] : []);
    setVariants(product ? product.variants.map(toDraft) : [newVariant()]);
    setFulfillment(product ? [...product.allowedFulfillments] : ["PICKUP"]);
    setEditing(true); setDirty(false); setError(""); setMessage("");
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
      images,
      categoryId: String(form.get("categoryId") ?? ""),
      published: form.has("published"),
      memberOnly: false,
      priceKind: String(form.get("priceKind")),
      priceAmount: String(form.get("priceAmount")).trim(),
      listPriceAmount: String(form.get("listPriceAmount") ?? "").trim(),
      allowedFulfillments: fulfillment,
      variants: variants.map(toVariantInput),
    };
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/products${selected ? `/${selected.id}` : ""}`, z.unknown(),
        jsonBody(input, selected ? "PATCH" : "POST"));
      setEditing(false); setDirty(false); setMessage("저장했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", z.unknown(), jsonBody({
        slug: String(data.get("categorySlug")).trim(),
        nameKo: String(data.get("categoryNameKo")).trim(),
        nameEn: String(data.get("categoryNameEn")).trim(),
        sortOrder: Number(data.get("categorySortOrder")),
        active: category?.active ?? true,
      }, category ? "PATCH" : "POST"));
      setCategory(null); setDirty(false);
      setMessage(category ? "분류를 수정했습니다." : "분류를 추가했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }

  async function deactivateCategory(item: AdminCategoryRecord) {
    if (busy.current) return;
    const accepted = await confirm({
      title: "분류 끄기",
      description: `“${item.nameKo}” 분류를 끌까요? 상품은 삭제되지 않고 분류만 목록에서 빠집니다.`,
      confirmLabel: "끄기",
    });
    if (!accepted || busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/categories/${item.id}`, z.unknown(), { method: "DELETE" });
      if (category?.id === item.id) setCategory(null);
      setMessage("분류를 껐습니다."); setRevision((value) => value + 1);
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
    <CommerceAdminNav current="/admin/products" disabled={pending || uploading} onLeave={leave} />
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
            <MenuSelect name="priceKind" defaultValue={selected?.priceKind ?? "KRW_FIXED"}>
              <option value="KRW_FIXED">원화로 지정</option>
              <option value="BTC_FIXED">사토시로 지정</option>
            </MenuSelect>
          </FormControl></label>
        </div>
        <p id="product-price-help" className="muted">원화로 지정하면 주문할 때마다 그 시점 시세로 사토시가 정해집니다. 사토시로 지정하면 시세와 상관없이 그 사토시를 받습니다.</p>
        <label>정가 (선택)<FormControl><input name="listPriceAmount" inputMode="numeric" pattern="[1-9][0-9]*" defaultValue={selected?.listPriceAmount ?? ""} aria-describedby="product-list-help" /></FormControl></label>
        <p id="product-list-help" className="muted">판매가보다 큰 값을 넣으면 할인 전 가격으로 함께 표시됩니다. 비워 두면 표시하지 않습니다.</p>

        <label>분류 (선택)<FormControl>
          <MenuSelect name="categoryId" defaultValue={selected?.categoryId ?? ""}>
            <option value="">분류 없음</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.nameKo}</option>)}
          </MenuSelect>
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

        <GalleryField locale="ko" images={images} onChange={(next) => { setImages(next.slice(0, 12)); setDirty(true); }} onPending={uploadPending} onExpired={() => setExpired(true)} />
        <p className="muted">첫 번째 사진만 상품 대표 이미지로 사용합니다.</p>

        <label>소개<FormControl><textarea name="descriptionKo" required rows={5} maxLength={100000} defaultValue={selected?.descriptionKo ?? ""} /></FormControl></label>
        <label>영어 소개<FormControl><textarea name="descriptionEn" required rows={4} maxLength={100000} defaultValue={selected?.descriptionEn ?? ""} /></FormControl></label>

        <ProductVariantsEditor variants={variants} onChange={(next) => { setVariants(next); setDirty(true); }} />

        <label className="events-checkbox"><ChoiceControl type="checkbox" name="published" defaultChecked={selected?.published ?? false} />공개</label>
      </fieldset>
      <div className="button-row">
        <Button type="submit" disabled={pending || uploading || expired}>{pending ? "저장 중…" : "저장"}</Button>
        <Button variant="secondary" disabled={pending || uploading} onClick={() => { void leave().then((accepted) => { if (accepted) { setEditing(false); setDirty(false); setRevision((value) => value + 1); } }); }}>취소</Button>
      </div>
    </form> : <>
      <div className="events-admin-toolbar">
        <h2>상품 목록</h2>
        <Button disabled={pending || expired} onClick={() => { void leave().then((accepted) => { if (accepted) edit(null); }); }}>상품 등록</Button>
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
            <Button variant="secondary" disabled={pending || expired} onClick={() => { void leave().then((accepted) => { if (accepted) edit(product); }); }}>수정</Button>
            {product.published && <Button variant="quiet" disabled={pending || expired} onClick={() => void archive(product)}>비공개</Button>}
          </div>
        </li>)}
        {!products.length && <li>등록된 상품이 없습니다.</li>}
      </ul>

      <form key={category?.id ?? "new-category"} className="events-form" onSubmit={(event) => void saveCategory(event)} onChange={() => setDirty(true)}>
        <h2>{category ? "분류 수정" : "분류"}</h2>
        <ul className="events-admin-list">
          {categories.map((item) => <li key={item.id}>
            <div><h3>{item.nameKo}</h3><p className="muted">{item.slug} · 상품 {item.productCount}개{item.active ? "" : " · 비활성"}</p></div>
            <div className="button-row">
              <Button type="button" variant="secondary" disabled={pending || expired} onClick={() => { setCategory(item); setDirty(false); setError(""); }}>수정</Button>
              {item.active && <Button type="button" variant="quiet" disabled={pending || expired} onClick={() => void deactivateCategory(item)}>끄기</Button>}
            </div>
          </li>)}
          {!categories.length && <li>등록된 분류가 없습니다. 분류 없이도 상품을 판매할 수 있습니다.</li>}
        </ul>
        <fieldset className="events-editor-fields" disabled={pending}>
          <div className="events-field-grid">
            <label>분류 이름<FormControl><input name="categoryNameKo" required maxLength={80} placeholder="책" defaultValue={category?.nameKo ?? ""} /></FormControl></label>
            <label>영어 이름<FormControl><input name="categoryNameEn" required maxLength={80} placeholder="Books" defaultValue={category?.nameEn ?? ""} /></FormControl></label>
          </div>
          <div className="events-field-grid">
            <label>슬러그<FormControl><input name="categorySlug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} placeholder="books" defaultValue={category?.slug ?? ""} /></FormControl></label>
            <label>표시 순서<FormControl><input name="categorySortOrder" type="number" required min={-100000} max={100000} step={1} defaultValue={category?.sortOrder ?? 0} /></FormControl></label>
          </div>
        </fieldset>
        <div className="button-row">
          <Button type="submit" variant="secondary" disabled={pending || expired}>{category ? "분류 저장" : "분류 추가"}</Button>
          {category && <Button type="button" variant="quiet" disabled={pending || expired} onClick={() => { setCategory(null); setDirty(false); }}>새 분류</Button>}
        </div>
      </form>
    </>}
  </div>;
}
