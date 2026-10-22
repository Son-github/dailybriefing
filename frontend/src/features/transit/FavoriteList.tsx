import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, PenLine } from "lucide-react";
import { api, body, queryClient } from "../../lib/api";
import { Button, Empty, Input, Notice, Sheet } from "../../components/ui";
import type { FavoriteRoute } from "../../types";
export function FavoriteList({
  favorites,
  choose,
}: {
  favorites: FavoriteRoute[];
  choose: (favorite: FavoriteRoute) => void;
}) {
  const [editing, setEditing] = useState<FavoriteRoute | null>(null);
  const [message, setMessage] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: ({
      f,
      remove = false,
      routeName = f.routeName,
      order = f.displayOrder,
    }: {
      f: FavoriteRoute;
      remove?: boolean;
      routeName?: string | null;
      order?: number;
    }) =>
      api(`/me/mobility/favorites/${f.id}`, {
        method: remove ? "DELETE" : "PATCH",
        ...(remove ? {} : body({ routeName, displayOrder: order })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      setEditing(null);
      setMessage("");
      setRemoveConfirm(false);
    },
    onError: (e) => setMessage(e.message),
  });
  return (
    <>
      <Notice message={!editing ? message : ""} error />
      {favorites.length ? (
        <div className="favorite-list">
          {favorites.map((f, i) => (
            <div className="favorite-row" key={f.id}>
              <button className="favorite-main" onClick={() => choose(f)}>
                <strong>
                  {f.routeName ||
                    `${f.start?.name || "출발지 재선택"} → ${f.end?.name || "도착지 재선택"}`}
                </strong>
                <small>
                  {f.start?.name || "출발지 재선택"} →{" "}
                  {f.end?.name || "도착지 재선택"}
                </small>
              </button>
              <div className="favorite-controls">
                <Button
                  variant="ghost"
                  aria-label={`${f.start?.name || "출발지 재선택"} 경로 위로 이동`}
                  disabled={i === 0 || mutation.isPending}
                  onClick={() => mutation.mutate({ f, order: i - 1 })}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`${f.start?.name || "출발지 재선택"} 경로 아래로 이동`}
                  disabled={i === favorites.length - 1 || mutation.isPending}
                  onClick={() => mutation.mutate({ f, order: i + 1 })}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`${f.start?.name || "출발지 재선택"} 경로 편집`}
                  onClick={() => {
                    setEditing(f);
                    setMessage("");
                    setRemoveConfirm(false);
                  }}
                >
                  <PenLine size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="자주 가는 경로를 저장해 보세요.">
          <p className="muted small">
            경로를 검색한 뒤 저장하면 다음부터 한 번에 찾을 수 있어요.
          </p>
        </Empty>
      )}
      {editing && (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open && !mutation.isPending) setEditing(null);
          }}
          title="저장한 경로 편집"
          description={`${editing.start?.name || "출발지 재선택"} → ${editing.end?.name || "도착지 재선택"}`}
        >
          <form
            className="sheet-body"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({
                f: editing,
                routeName: String(
                  new FormData(e.currentTarget).get("routeName"),
                ),
              });
            }}
          >
            <Input
              id="favorite-routeName"
              label="경로 이름"
              name="routeName"
              defaultValue={editing.routeName || ""}
              maxLength={30}
              required
              placeholder="출근, 주말 약속…"
            />
            <Notice message={message} error />
            <div className="form-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditing(null)}
                disabled={mutation.isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                이름 저장
              </Button>
            </div>
            {removeConfirm ? (
              <div className="delete-confirm">
                <p>이 저장 경로를 삭제할까요?</p>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => setRemoveConfirm(false)}
                >
                  유지하기
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ f: editing, remove: true })}
                >
                  경로 삭제 확인
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                type="button"
                onClick={() => setRemoveConfirm(true)}
              >
                저장 경로 삭제
              </Button>
            )}
          </form>
        </Sheet>
      )}
    </>
  );
}
