"use client";

import { Check, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_TREE,
  type ProductCategory,
  type ProductSubcategory,
} from "@/lib/categories";
import { usePreferences } from "@/components/preferences-provider";

export type CategorySelection = {
  categoryId: string | null;
  subcategoryId: string | null;
};

type SearchResult = {
  category: ProductCategory;
  subcategory: ProductSubcategory | null;
};

export function CategorySelector({
  value,
  onChange,
}: {
  value: CategorySelection;
  onChange: (next: CategorySelection) => void;
}) {
  const { language } = usePreferences();
  const ko = language === "ko";
  const selectedCategory = PRODUCT_CATEGORIES.find((item) => item.id === value.categoryId) ?? null;
  const selectedMajor = selectedCategory
    ? PRODUCT_CATEGORY_TREE.find((item) => item.id === selectedCategory.majorId) ?? null
    : null;
  const selectedSubcategory = selectedCategory?.subcategories.find((item) => item.id === value.subcategoryId) ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeMajorId, setActiveMajorId] = useState(selectedMajor?.id ?? PRODUCT_CATEGORY_TREE[0]?.id ?? "");
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategory?.id ?? "");

  const activeMajor = PRODUCT_CATEGORY_TREE.find((item) => item.id === activeMajorId) ?? PRODUCT_CATEGORY_TREE[0] ?? null;
  const activeCategory = activeMajor?.categories.find((item) => item.id === activeCategoryId) ?? null;

  const searchResults = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const results: SearchResult[] = [];
    for (const category of PRODUCT_CATEGORIES) {
      const major = PRODUCT_CATEGORY_TREE.find((item) => item.id === category.majorId);
      const categoryHaystack = `${major?.ko ?? ""} ${major?.en ?? ""} ${category.ko} ${category.en}`.toLowerCase();
      if (categoryHaystack.includes(needle)) results.push({ category, subcategory: null });
      for (const subcategory of category.subcategories) {
        const haystack = `${categoryHaystack} ${subcategory.ko} ${subcategory.en}`.toLowerCase();
        if (haystack.includes(needle)) results.push({ category, subcategory });
      }
    }
    return results.slice(0, 24);
  }, [query]);

  function openSelector() {
    const majorId = selectedMajor?.id ?? PRODUCT_CATEGORY_TREE[0]?.id ?? "";
    setActiveMajorId(majorId);
    setActiveCategoryId(selectedCategory?.id ?? "");
    setQuery("");
    setOpen(true);
  }

  function choose(category: ProductCategory, subcategory: ProductSubcategory | null) {
    onChange({ categoryId: category.id, subcategoryId: subcategory?.id ?? null });
    setOpen(false);
    setQuery("");
  }

  function chooseMajor(majorId: string) {
    setActiveMajorId(majorId);
    setActiveCategoryId("");
  }

  const label = selectedCategory
    ? [
        selectedMajor ? (ko ? selectedMajor.ko : selectedMajor.en) : null,
        ko ? selectedCategory.ko : selectedCategory.en,
        selectedSubcategory ? (ko ? selectedSubcategory.ko : selectedSubcategory.en) : null,
      ].filter(Boolean).join("  ›  ")
    : ko ? "대분류부터 차례대로 선택" : "Choose category step by step";

  return (
    <>
      <button type="button" className={selectedCategory ? "category-field is-selected" : "category-field"} onClick={openSelector}>
        <span>
          <small>{ko ? "제품 카테고리 · 선택사항" : "PRODUCT CATEGORY · OPTIONAL"}</small>
          <strong>{label}</strong>
        </span>
        <ChevronRight size={18} />
      </button>

      {open ? (
        <div className="category-dialog-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="category-dialog category-dialog--tree" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="category-dialog-head">
              <div>
                <span className="section-kicker">CATEGORY</span>
                <h2 id="category-dialog-title">{ko ? "대분류부터 하나씩 찾습니다." : "Find it one level at a time."}</h2>
                <p>{ko ? "많은 제품을 한 화면에 늘어놓지 않습니다. 대분류 → 중분류 → 소분류 순서로 범위만 좁히세요." : "No wall of tags. Narrow the scope from major category to category to product type."}</p>
              </div>
              <button type="button" className="category-dialog-close" onClick={() => setOpen(false)} aria-label={ko ? "닫기" : "Close"}><X size={19} /></button>
            </header>

            <label className="category-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ko ? "바로 검색: 노트북, 드릴, 청소기..." : "Quick search: laptop, drill, vacuum..."} autoFocus />
            </label>

            {query.trim() ? (
              <div className="category-search-results">
                <div className="category-result-head"><span>{ko ? "검색 결과" : "Search results"}</span><b>{searchResults.length}</b></div>
                {searchResults.length ? searchResults.map(({ category, subcategory }) => {
                  const major = PRODUCT_CATEGORY_TREE.find((item) => item.id === category.majorId);
                  return (
                    <button type="button" key={`${category.id}:${subcategory?.id ?? "all"}`} onClick={() => choose(category, subcategory)}>
                      <span>{major ? (ko ? major.ko : major.en) : ""}</span>
                      <ChevronRight size={13} />
                      <span>{ko ? category.ko : category.en}</span>
                      {subcategory ? <><ChevronRight size={13} /><strong>{ko ? subcategory.ko : subcategory.en}</strong></> : <strong>{ko ? "전체" : "All"}</strong>}
                    </button>
                  );
                }) : <div className="category-empty">{ko ? "일치하는 제품군이 없습니다." : "No matching category."}</div>}
              </div>
            ) : (
              <div className="category-tree" aria-label={ko ? "카테고리 3단계 탐색" : "Three-level category browser"}>
                <section className="category-tree-column">
                  <div className="category-tree-label"><b>1</b><span>{ko ? "대분류" : "Major"}</span></div>
                  <div className="category-tree-list">
                    {PRODUCT_CATEGORY_TREE.map((major) => (
                      <button className={activeMajor?.id === major.id ? "is-active" : ""} type="button" key={major.id} onClick={() => chooseMajor(major.id)}>
                        <span>{ko ? major.ko : major.en}</span><ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="category-tree-column">
                  <div className="category-tree-label"><b>2</b><span>{ko ? "중분류" : "Category"}</span></div>
                  <div className="category-tree-list">
                    {activeMajor?.categories.map((category) => (
                      <button className={activeCategory?.id === category.id ? "is-active" : ""} type="button" key={category.id} onClick={() => setActiveCategoryId(category.id)}>
                        <span>{ko ? category.ko : category.en}</span><ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="category-tree-column category-tree-column--leaf">
                  <div className="category-tree-label"><b>3</b><span>{ko ? "소분류" : "Product type"}</span></div>
                  {activeCategory ? (
                    <div className="category-tree-list">
                      <button type="button" className={!value.subcategoryId && value.categoryId === activeCategory.id ? "is-active" : ""} onClick={() => choose(activeCategory, null)}>
                        <span>{ko ? `${activeCategory.ko} 전체` : `All ${activeCategory.en}`}</span>{value.categoryId === activeCategory.id && !value.subcategoryId ? <Check size={16} /> : <ChevronRight size={16} />}
                      </button>
                      {activeCategory.subcategories.map((subcategory) => {
                        const active = value.categoryId === activeCategory.id && value.subcategoryId === subcategory.id;
                        return (
                          <button type="button" className={active ? "is-active" : ""} key={subcategory.id} onClick={() => choose(activeCategory, subcategory)}>
                            <span>{ko ? subcategory.ko : subcategory.en}</span>{active ? <Check size={16} /> : <ChevronRight size={16} />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="category-tree-empty">{ko ? "중분류를 선택하면 세부 제품이 여기에 표시됩니다." : "Choose a category to see product types."}</div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
