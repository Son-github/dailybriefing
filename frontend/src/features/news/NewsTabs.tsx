import { useId, useRef } from "react";
import { newsCategories, type NewsCategory } from "./model";
export function NewsTabs({
  value,
  onChange,
  children,
}: {
  value: NewsCategory;
  onChange: (value: NewsCategory) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <>
      <div
        className="category-tabs news-tabs"
        role="tablist"
        aria-label="뉴스 카테고리"
      >
        {newsCategories.map((category, index) => (
          <button
            key={category.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            id={`${id}-${category.value}`}
            aria-controls={`${id}-panel`}
            aria-selected={value === category.value}
            tabIndex={value === category.value ? 0 : -1}
            className={value === category.value ? "active" : ""}
            onClick={() => onChange(category.value)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % 5
                  : event.key === "ArrowLeft"
                    ? (index + 4) % 5
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 4
                        : null;
              if (next !== null) {
                event.preventDefault();
                onChange(newsCategories[next].value);
                refs.current[next]?.focus();
              }
            }}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
}
