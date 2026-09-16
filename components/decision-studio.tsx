"use client";

import { useEffect, useRef, useState } from "react";
import { usePreferences } from "@/components/preferences-provider";
import { CategorySelector, type CategorySelection } from "@/components/category-selector";
import { findCategory } from "@/lib/categories";
import type { DecisionDraft } from "@/lib/buysor-types";
import {
  ArrowRight,
  Camera,
  Check,
  FileImage,
  Grid2X2,
  Link2,
  LoaderCircle,
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
  { id: "link", label: { ko: "상품 링크", en: "Product link" }, icon: Link2, placeholder: { ko: "https://... 상품 페이지 주소", en: "https://... product page URL" } },
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
  const [encodedImage, setEncodedImage] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [inputError, setInputError] = useState("");
  const [category, setCategory] = useState<CategorySelection>({ categoryId: null, subcategoryId: null });
  const [categoryNote, setCategoryNote] = useState("");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("buysor-category-scope");
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<CategorySelection>;
      setCategory({
        categoryId: typeof parsed.categoryId === "string" ? parsed.categoryId : null,
        subcategoryId: typeof parsed.subcategoryId === "string" ? parsed.subcategoryId : null,
      });
    } catch {}
  }, []);

  const linkValid = mode !== "link" || isHttpUrl(value.trim());
  const lensReady = mode === "photo" ? Boolean(file && encodedImage && !imageBusy) : value.trim().length > 2 && linkValid;
  const categoryReady = Boolean(category.categoryId);
  const hasInput = entryMode === "lens" ? lensReady : categoryReady;

  function changeEntryMode(next: EntryMode) {
    setEntryMode(next);
    setInputError("");
  }

  async function onFileChange(nextFile: File | null) {
    setInputError("");
    setFile(null);
    setPreview(null);
    setEncodedImage(null);
    if (!nextFile) return;
    if (!/^image\/(jpeg|png|webp)$/.test(nextFile.type)) {
      setInputError(ko ? "JPG, PNG, WEBP 이미지만 사용할 수 있습니다." : "Use a JPG, PNG, or WEBP image.");
      return;
    }
    if (nextFile.size > 15 * 1024 * 1024) {
      setInputError(ko ? "이미지는 15MB 이하로 선택해 주세요." : "Choose an image under 15MB.");
      return;
    }

    setImageBusy(true);
    try {
      const dataUrl = await prepareImage(nextFile);
      setFile(nextFile);
      setEncodedImage(dataUrl);
      setPreview(dataUrl);
    } catch {
      setInputError(ko ? "이미지를 준비하지 못했습니다. 다른 사진을 선택해 주세요." : "Could not prepare this image. Try another one.");
    } finally {
      setImageBusy(false);
    }
  }

  function resetFile() {
    setFile(null);
    setPreview(null);
    setEncodedImage(null);
    setInputError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function continueToAdvisor() {
    if (!hasInput) {
      setInputError(mode === "link" && !linkValid
        ? (ko ? "http:// 또는 https://로 시작하는 상품 링크를 입력해 주세요." : "Enter a valid http:// or https:// product URL.")
        : (ko ? "먼저 제품 정보를 입력해 주세요." : "Add a product first."));
      return;
    }

    let draft: DecisionDraft;
    if (entryMode === "category") {
      const { category: parent, subcategory } = findCategory(category.categoryId, category.subcategoryId);
      const label = [parent ? (ko ? parent.ko : parent.en) : null, subcategory ? (ko ? subcategory.ko : subcategory.en) : null]
        .filter(Boolean)
        .join(" · ");
      draft = {
        type: "category",
        value: label || (ko ? "카테고리 탐색" : "Category search"),
        note: categoryNote.trim(),
        createdAt: Date.now(),
        categoryId: category.categoryId,
        subcategoryId: category.subcategoryId,
      };
      sessionStorage.setItem("buysor-category-scope", JSON.stringify(category));
    } else {
      draft = {
        type: mode,
        value: mode === "photo" ? file?.name ?? (ko ? "제품 사진" : "Product photo") : value.trim(),
        imageName: mode === "photo" ? file?.name : undefined,
        imageDataUrl: mode === "photo" ? encodedImage ?? undefined : undefined,
        createdAt: Date.now(),
      };
    }

    try {
      sessionStorage.setItem("buysor-draft", JSON.stringify(draft));
    } catch {
      setInputError(ko ? "브라우저 저장 공간이 부족합니다. 이미지 크기를 줄여 다시 시도해 주세요." : "Browser storage is full. Try a smaller image.");
      return;
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
                      resetFile();
                      setInputError("");
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
                onClick={() => !preview && !imageBusy && inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (!preview && !imageBusy && (event.key === "Enter" || event.key === " ")) inputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
              >
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)} />
                {imageBusy ? (
                  <><LoaderCircle className="spin" size={30}/><strong>{ko ? "사진 준비 중" : "Preparing image"}</strong><span>{ko ? "업로드 전에 크기를 최적화합니다." : "Optimizing before upload."}</span></>
                ) : preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={ko ? "선택한 제품" : "Selected product"} />
                    <div className="upload-file-meta">
                      <FileImage aria-hidden="true" size={18} />
                      <span>{file?.name}</span>
                      <button type="button" aria-label={ko ? "선택한 사진 제거" : "Remove selected photo"} onClick={(event) => { event.stopPropagation(); resetFile(); }}><X aria-hidden="true" size={17} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="upload-icon"><ScanLine aria-hidden="true" size={30} /></span>
                    <strong>{ko ? "사진을 놓거나 눌러서 선택" : "Drop or choose a photo"}</strong>
                    <span>{ko ? "제품 사진, 쇼핑 캡처, 중고 매물 모두 가능" : "Product photos, store captures, and used listings"}</span>
                    <small>JPG · PNG · WEBP · 15MB 이하</small>
                  </>
                )}
              </div>
            ) : (
              <div className="text-input-wrap">
                {mode === "link" ? <Link2 aria-hidden="true" size={20} /> : <Search aria-hidden="true" size={20} />}
                <input
                  autoFocus
                  value={value}
                  onChange={(event) => { setValue(event.target.value); setInputError(""); }}
                  placeholder={ko ? modes.find((item) => item.id === mode)?.placeholder.ko : modes.find((item) => item.id === mode)?.placeholder.en}
                  aria-label={mode === "link" ? (ko ? "상품 링크" : "Product link") : (ko ? "제품명" : "Product name")}
                />
              </div>
            )}
          </>
        ) : (
          <div className="category-mode-panel">
            <CategorySelector value={category} onChange={(next) => { setCategory(next); setInputError(""); }} />
            <label className="category-note-field">
              <span>{ko ? "원하는 조건이나 제품이 있다면" : "Optional product or requirement"}</span>
              <input value={categoryNote} onChange={(event) => setCategoryNote(event.target.value)} maxLength={300} placeholder={ko ? "예: 가벼운 14인치 노트북, 중고도 괜찮음" : "e.g. lightweight 14-inch laptop, used is fine"} />
            </label>
          </div>
        )}

        {inputError ? <p className="inline-error" role="alert">{inputError}</p> : null}

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
          <span>{hasInput ? (entryMode === "lens" ? (ko ? "제품 입력 준비 완료" : "Product input ready") : (ko ? "제품군 선택 완료" : "Category selected")) : (entryMode === "lens" ? (ko ? "제품을 먼저 알려주세요" : "Add a product first") : (ko ? "카테고리를 선택하세요" : "Choose a category"))}</span>
        </div>
        <div className="readout-checks">
          <div className={hasInput ? "is-complete" : ""}><span>{hasInput ? <Check size={14} /> : "01"}</span> {entryMode === "lens" ? (ko ? "제품 입력" : "Product") : (ko ? "제품군 확인" : "Category")}</div>
          <div><span>02</span> {ko ? "나의 조건" : "My needs"}</div>
          <div><span>03</span> {ko ? "AI 최종 판단" : "AI decision"}</div>
        </div>
        <div className="decision-lockup">
          <span>{ko ? "AI 연결 후 최종 결과" : "OUTCOME AFTER AI"}</span>
          <div><b>BUY</b><b>WAIT</b><b>SKIP</b></div>
          <p>{ko ? "입력 전에는 어떤 결론도 미리 정하지 않습니다." : "No verdict is preselected before your input."}</p>
        </div>
      </aside>
    </section>
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function prepareImage(file: File) {
  const original = await readAsDataUrl(file);
  if (file.size <= 1_500_000) return original;

  const image = await loadImage(original);
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return original;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/webp", 0.84);
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read failed"));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image decode failed"));
    image.src = src;
  });
}
