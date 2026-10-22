import { errorGuide, type Failure } from "../../lib/errors";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Place } from "../../types";
export function PlaceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const shown = value?.name || text;
  // 입력마다 외부 API를 호출하지 않도록 debounce. TanStack Query가 검색어별 결과를 재사용합니다.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(text), 350);
    return () => clearTimeout(timer);
  }, [text]);
  const q = useQuery({
    queryKey: ["places", term],
    queryFn: ({ signal }) =>
      api<Place[]>(`/mobility/places?query=${encodeURIComponent(term)}`, {
        signal,
      }),
    enabled: open && term.trim().length > 0,
    staleTime: 300000,
  });
  function select(place: Place) {
    onChange(place);
    setText(place.name);
    setOpen(false);
    setActive(-1);
  }
  return (
    <div className="place-field">
      <label className="field" htmlFor={id}>
        <span>{label}</span>
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          value={shown}
          placeholder="장소 이름을 입력해 주세요"
          maxLength={40}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            onChange(null);
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            const options = q.data || [];
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((n) => Math.min(n + 1, options.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((n) => Math.max(0, n - 1));
            }
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (options[active]) select(options[active]);
            }
          }}
        />
      </label>
      {open && (
        <div
          className="place-options"
          id={`${id}-options`}
          role="listbox"
          aria-label={`${label} 검색 결과`}
        >
          {!term.trim() ? (
            <p>장소 이름을 입력해 주세요.</p>
          ) : q.isPending ? (
            <p role="status">장소를 찾고 있어요…</p>
          ) : q.isError ? (
            <div role="alert">
              <p>{errorGuide(q.error).title}</p>
              <p>{errorGuide(q.error).cause}</p>
              <p>
                오류 코드: <code>{(q.error as Failure).code || "UNKNOWN"}</code>
              </p>
            </div>
          ) : q.data?.length ? (
            q.data.map((s, i) => (
              <button
                key={s.id || `${s.latitude}-${s.longitude}`}
                type="button"
                role="option"
                id={`${id}-${i}`}
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s)}
              >
                <strong>{s.name}</strong>
                <small>{s.address}</small>
              </button>
            ))
          ) : (
            <p>검색 결과가 없어요. 다른 검색어인지 확인해 주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
