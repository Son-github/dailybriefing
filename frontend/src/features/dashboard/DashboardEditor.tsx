import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Sheet, Button, Notice } from "../../components/ui";
import { api, body, queryClient } from "../../lib/api";
import { useSession } from "../../lib/store";
import type { Dashboard, Widget, WidgetType } from "../../types";
import { widgetRegistry } from "./registry";
function SortableRow({
  widget,
  index,
  count,
  move,
  remove,
}: {
  widget: Widget;
  index: number;
  count: number;
  move: (from: number, to: number) => void;
  remove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });
  const title = widgetRegistry[widget.type]?.title || widget.type;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="edit-row"
      data-widget-id={widget.id}
    >
      <button
        ref={setActivatorNodeRef}
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`${title} 드래그하여 순서 변경`}
      >
        <GripVertical size={19} />
      </button>
      <span className="edit-title">
        <small>{String(index + 1).padStart(2, "0")}</small>
        {title}
      </span>
      <div className="edit-actions">
        <Button
          variant="ghost"
          aria-label={`${title} 위로 이동`}
          disabled={index === 0}
          onClick={() => move(index, index - 1)}
        >
          <ArrowUp size={17} />
        </Button>
        <Button
          variant="ghost"
          aria-label={`${title} 아래로 이동`}
          disabled={index === count - 1}
          onClick={() => move(index, index + 1)}
        >
          <ArrowDown size={17} />
        </Button>
        <Button variant="ghost" aria-label={`${title} 삭제`} onClick={remove}>
          <Trash2 size={17} />
        </Button>
      </div>
    </div>
  );
}
export function DashboardEditor({
  dashboard,
  close,
}: {
  dashboard: Dashboard;
  close: () => void;
}) {
  const user = useSession((s) => s.user);
  const [draft, setDraft] = useState(() =>
    dashboard.widgets.filter((w) => w.enabled),
  );
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const move = (from: number, to: number) =>
    setDraft((old) => arrayMove(old, from, to));
  const save = useMutation({
    mutationFn: async () => {
      const next = {
        version: dashboard.version,
        widgets: draft.map((w, order) => ({ ...w, order })),
      };
      if (user)
        return api<Dashboard>("/dashboard", { method: "PUT", ...body(next) });
      localStorage.setItem("db-guest-dashboard", JSON.stringify(next));
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["dashboard", user?.id], next);
      close();
    },
    onError: (e) => setError(e.message),
  });
  const drag = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id)
      move(
        draft.findIndex((w) => w.id === e.active.id),
        draft.findIndex((w) => w.id === e.over!.id),
      );
  };
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) close();
      }}
      title="나만의 대시보드"
      description="필요한 정보만 고르고, 편한 순서로 정리하세요."
    >
      <div className="sheet-body">
        <div className="section-caption">
          내 위젯 <span>{draft.length}개</span>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={drag}
        >
          <SortableContext
            items={draft.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            {draft.map((w, i) => (
              <SortableRow
                key={w.id}
                widget={w}
                index={i}
                count={draft.length}
                move={move}
                remove={() =>
                  setDraft((old) => old.filter((v) => v.id !== w.id))
                }
              />
            ))}
          </SortableContext>
        </DndContext>
        {!draft.length && (
          <p className="muted py-4">아래에서 첫 위젯을 추가해 보세요.</p>
        )}
        <div className="section-caption mt-7">위젯 추가</div>
        <div className="widget-catalog">
          {Object.entries(widgetRegistry).map(([type, info]) => {
            const added = draft.some((w) => w.type === type);
            return (
              <button
                key={type}
                disabled={added}
                className="catalog-item"
                onClick={() =>
                  setDraft((old) => [
                    ...old,
                    {
                      id: crypto.randomUUID(),
                      type: type as WidgetType,
                      enabled: true,
                      order: old.length,
                      size: info.size,
                      settings: {},
                    },
                  ])
                }
              >
                <info.icon size={20} />
                <span>
                  <strong>{info.title}</strong>
                  <small>{info.description}</small>
                </span>
                {added ? <Check size={18} /> : <Plus size={18} />}
              </button>
            );
          })}
        </div>
        {!user && (
          <p className="muted small mt-5">
            게스트 설정은 이 브라우저에 저장돼요. 로그인하면 기기 간 설정을
            저장할 수 있어요.
          </p>
        )}
        <Notice message={error} error />
      </div>
      <div className="sheet-footer">
        <Button variant="secondary" onClick={close} disabled={save.isPending}>
          취소
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "저장 중…" : "이 구성으로 저장"}
        </Button>
      </div>
    </Sheet>
  );
}
