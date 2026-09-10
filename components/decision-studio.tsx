"use client";

import { useEffect, useRef, useState } from "react";
import { usePreferences } from "@/components/preferences-provider";
import { CategorySelector, type CategorySelection } from "@/components/category-selector";
import { findCategory } from "@/lib/categories";
import {
  ArrowRight,
  Camera,
  Check,
  FileImage,
  Grid2X2,
  Link2,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

type InputMode = "photo" | "link" | "name";
type EntryMode = "lens" | "category";

const modes: Array<{
  id: InputMode;
  label: { ko: string; en: string };
  icon: typeof Camera;
  placeholder: { ko: string; en: string };
}> = [
  { id: "photo", label: { ko: "사진 · 스크린샷", en: "Photo · screenshot" }, icon: Camera, placeholder: { ko: "", en: "" } },
  { id: "link", label: { ko: "상품 링크", en: "Product link" }, icon: Link2, placeholder: { ko: "상품 페이지 주소를 붙여 넣으세요", en: "Paste a product page link" } },
  { id: "name", label: { ko: "제품명", en: "Product name" }, icon: Search, placeholder: { ko: "예: 맥북 에어 M4 15인치", en: "e.g. MacBook Air M4 15-inch" } },
];

export function DecisionStudio({
  embedded = false,
  initialEntryMode = "lens",
}: {
  embedded?: boolean;
  initialEntryMode?: EntryMode;
}) {
  const { language } = usePreferences();
  const ko = language === "ko";
  const inputRef = useRef<HTMLInputElement>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>(initialEntryMode);
  const [mode, setMode] = useState<InputMode>("photo");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<CategorySelection>({ categoryId: null, subcategoryId: null });
  const [categoryNote, setCategoryNote] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("buysor-category-scope");
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<CategorySelection>;
      setCategory({
        categoryId: typeof parsed.categoryId === "string" ? parsed.categoryId : null,
        subcategoryId: typeof parsed.subcategoryId === "string" ? parsed.subcategoryId : null,
      });
    } catch {
      // A malformed local value must not block the purchase flow.
    }
  }, []);

  const lensReady = mode === "photo" ? Boolean(file) : value.trim().length > 2;
  const categoryReady = Boolean(category.categoryId);
  const hasInput = entryMode === "lens" ? lensReady : categoryReady;

  function changeEntryMode(next: EntryMode) {
    setEntryMode(next);
  }

  function continueToAdvisor() {
    if (!hasInput) return;

    if (entryMode === "category") {
      const { category: parent, subcategory } = findCategory(category.categoryId, category.subcategoryId);
      const label = [parent ? (ko ? parent.ko : parent.en) : null, subcategory ? (ko ? subcategory.ko : subcategory.en) : null]
        .filter(Boolean)
        .join(" · ");
      sessionStorage.setItem("buysor-category-scope", JSON.stringify(category));
      sessionStorage.setItem(
        "buysor-draft",
        JSON.stringify({
          type: "category",
          value: label || (ko ? "카테고리 탐색" : "Category search"),
          note: categoryNote.trim(),
          createdAt: Date.now(),
          categoryId: category.categoryId,
          subcategoryId: category.subcategoryId,
        }),
      );
    } else {
      sessionStorage.setItem(
        "buysor-draft",
        JSON.stringify({
          type: mode,
          value: mode === "photo" ? file?.name ?? (ko ? "사진" : "Photo") : value.trim(),
          createdAt: Date.now(),
        }),
      );
    }

    window.location.assign("/advisor");
  }

  return (
    <section className={embedded ? "decision-studio decision-studio--embedded" : "decision-studio"} id="decision-start">
      <div className="studio-input">
        <div className="entry-mode-tabs" role="tablist" aria-label={ko ? "시작 방식" : "Start method"}>
          <button type="button" className={entryMode === "lens" ? "active" : ""} onClick={() => changeEntryMode("lens")} role="tab" aria-selected={entryMode === "lens"}>
            <Camera size={16} />
            <span><strong>Lens</strong><small>{ko ? "사진 · 링크 · 제품명" : "Photo · link · product"}</small></span>
          </button>
          <button type="button" className={entryMode === "category" ? "active" : ""} onClick={() => changeEntryMode("category")} role="tab" aria-selected={entryMode === "category"}>
            <Grid2X2 size={16} />
            <span><strong>{ko ? "카테고리" : "Category"}</strong><small>{ko ? "제품군부터 찾기" : "Start from a product group"}</small></span>
          </button>
        </div>

        <div className="studio-heading">
          <div>
            <span className="section-kicker">
              {entryMode === "lens" ? <Sparkles aria-hidden="true" size={14} /> : <Grid2X2 aria-hidden="true" size={14} />}
              {entryMode === "lens" ? "BUYSOR LENS" : (ko ? "기본 탐색" : "BROWSE")}
            </span>
            <h2>{entryMode === "lens" ? (ko ? "고민 중인 제품을 보여주세요." : "Show us what you are considering.") : (ko ? "제품군부터 선택하세요." : "Choose the product group first.")}</h2>
          </div>
          {entryMode === "lens" ? <span className="credit-chip">Lens 1C</span> : null}
        </div>

        {entryMode === "lens" ? (
          <>
            <div className="input-tabs" role="tablist" aria-label={ko ? "입력 방식" : "Input method"}>
              {modes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={mode === item.id ? "active" : ""}
                    key={item.id}
                    onClick={() => {
                      setMode(item.id);
                      setValue("");
                      setFile(null);
                    }}
                    role="tab"
                    aria-selected={mode === item.id}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={16} /> {ko ? item.label.ko : item.label.en}
                  </button>
                );
              })}
            </div>

            {mode === "photo" ? (
              <div
                className={preview ? "upload-zone upload-zone--filled" : "upload-zone"}
                onClick={() => !preview && inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (!preview && (event.key === "Enter" || event.key === " ")) inputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
              >
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={ko ? "선택한 제품" : "Selected product"} />
                    <div className="upload-file-meta">
                      <FileImage aria-hidden="true" size={18} />
                      <span>{file?.name}</span>
                      <button type="button" aria-label={ko ? "선택한 사진 제거" : "Remove selected photo"} onClick={(event) => { event.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>
                        <X aria-hidden="true" size={17} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="upload-icon"><ScanLine aria-hidden="true" size={30} /></span>
                    <strong>{ko ? "사진을 놓거나 눌러서 선택" : "Drop or choose a photo"}</strong>
                    <span>{ko ? "제품 사진, 쇼핑 캡처, 중고 매물 모두 가능" : "Product photos, store captures, and used listings"}</span>
                    <small>JPG · PNG · WEBP</small>
                  </>
                )}
              </div>
            ) : (
              <div className="text-input-wrap">
                {mode === "link" ? <Link2 aria-hidden="true" size={20} /> : <Search aria-hidden="true" size={20} />}
                <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder={ko ? modes.find((item) => item.id === mode)?.placeholder.ko : modes.find((item) => item.id === mode)?.placeholder.en} aria-label={mode === "link" ? (ko ? "상품 링크" : "Product link") : (ko ? "제품명" : "Product name")} />
              </div>
            )}
          </>
        ) : (
          <div className="category-mode-panel">
            <CategorySelector value={category} onChange={setCategory} />
            <label className="category-note-field">
              <span>{ko ? "원하는 조건이나 제품이 있다면" : "Optional product or requirement"}</span>
              <input value={categoryNote} onChange={(event) => setCategoryNote(event.target.value)} maxLength={160} placeholder={ko ? "예: 가벼운 14인치 노트북, 중고도 괜찮음" : "e.g. lightweight 14-inch laptop, used is fine"} />
            </label>
          </div>
        )}

        <div className="studio-actions">
          <p><ShieldCheck aria-hidden="true" size={15} /> {ko ? "입력 내용은 구매 판단에만 사용됩니다." : "Your input is used only for this decision."}</p>
          <button type="button" disabled={!hasInput} onClick={continueToAdvisor}>
            {ko ? "내 조건 입력하기" : "Add my needs"} <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      <aside className="studio-readout" aria-label={ko ? "판단 준비 상태" : "Decision status"}>
        <div className="readout-topline">
          <span className={hasInput ? "live-dot live-dot--ready" : "live-dot"} />
          {hasInput ? (ko ? "입력 확인 완료" : "Input ready") : (ko ? "입력을 기다리는 중" : "Waiting for input")}
          <span>{hasInput ? "1 / 3" : "0 / 3"}</span>
        </div>
        <div className="scan-visual">
          <div className="scan-grid" />
          {entryMode === "lens" ? <ScanLine aria-hidden="true" size={52} /> : <Grid2X2 aria-hidden="true" size={52} />}
          <span>{hasInput ? (entryMode === "lens" ? (ko ? "제품 단서 확보" : "Product clues found") : (ko ? "제품군 선택 완료" : "Category selected")) : (entryMode === "lens" ? (ko ? "제품을 먼저 알려주세요" : "Add a product first") : (ko ? "카테고리를 선택하세요" : "Choose a category"))}</span>
        </div>
        <div className="readout-checks">
          <div className={hasInput ? "is-complete" : ""}>
            <span>{hasInput ? <Check size={14} /> : "01"}</span> {entryMode === "lens" ? (ko ? "제품 확인" : "Product") : (ko ? "제품군 확인" : "Category")}
          </div>
          <div><span>02</span> {ko ? "나의 조건" : "My needs"}</div>
          <div><span>03</span> {ko ? "최종 결정" : "Decision"}</div>
        </div>
        <div className="decision-lockup">
          <span>{ko ? "최종 결과" : "OUTCOME"}</span>
          <div><b>BUY</b><b>WAIT</b><b>SKIP</b></div>
          <p>{ko ? "추천 목록이 아니라 하나의 결정으로 답합니다." : "One decision, not another list."}</p>
        </div>
      </aside>
    </section>
  );
}
