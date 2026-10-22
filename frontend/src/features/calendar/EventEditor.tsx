import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, body, queryClient } from "../../lib/api";
import { Button, Input, Notice, Sheet } from "../../components/ui";
import { DatePicker, TimePicker } from "../../components/ui/DateTimePicker";
import type { CalendarEvent } from "../../types";
export function EventEditor({
  event,
  date,
  close,
}: {
  event: CalendarEvent | null;
  date: string;
  close: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(event?.eventDate || date);
  const [selectedTime, setSelectedTime] = useState(
    event?.eventTime?.slice(0, 5) || "",
  );
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: async ({
      remove,
      values,
    }: {
      remove: boolean;
      values?: Record<string, unknown>;
    }) =>
      api(event ? `/me/calendar/events/${event.id}` : "/me/calendar/events", {
        method: remove ? "DELETE" : event ? "PATCH" : "POST",
        ...(remove ? {} : body(values)),
      }),
    onSuccess: () => {
      // 월 목록과 Dashboard의 가까운 일정은 별도 query라서 둘 다 갱신합니다.
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      close();
    },
    onError: (e) => setError(e.message),
  });
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    mutation.mutate({
      remove: false,
      values: {
        title: data.get("title"),
        eventDate: data.get("eventDate"),
        eventTime: data.get("eventTime") || null,
        location: data.get("location") || null,
        description: data.get("description") || null,
      },
    });
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close();
      }}
      title={event ? "일정 수정" : "새로운 일정"}
      description="제목과 날짜만 입력해도 충분해요."
    >
      <form className="sheet-body" onSubmit={save}>
        <Input
          id="event-title"
          name="title"
          label="일정 제목"
          defaultValue={event?.title || ""}
          placeholder="어떤 약속인가요?"
          required
          maxLength={120}
        />
        <div className="form-pair">
          <DatePicker
            name="eventDate"
            label="날짜"
            value={selectedDate}
            onChange={setSelectedDate}
          />
          <TimePicker
            name="eventTime"
            label="시간 · 선택"
            value={selectedTime}
            onChange={setSelectedTime}
          />
        </div>
        <Input
          id="event-location"
          name="location"
          label="장소 · 선택"
          defaultValue={event?.location || ""}
          maxLength={200}
          placeholder="약속 장소를 적어주세요"
        />
        <label className="field">
          <span>메모 · 선택</span>
          <textarea
            name="description"
            defaultValue={event?.description || ""}
            maxLength={2000}
            rows={3}
          />
        </label>
        <p className="muted small">
          서울 시간 기준이에요. 2년 이전의 일정은 매일 자동 정리돼요.
        </p>
        <Notice message={error} error />
        {confirm && (
          <div className="delete-confirm" role="alert">
            <p>이 일정을 삭제할까요? 삭제하면 복구할 수 없어요.</p>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setConfirm(false)}
              disabled={mutation.isPending}
            >
              유지하기
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ remove: true })}
            >
              일정 삭제 확인
            </Button>
          </div>
        )}
        <div className="form-actions">
          {event && !confirm && (
            <Button
              variant="ghost"
              type="button"
              disabled={mutation.isPending}
              onClick={() => setConfirm(true)}
            >
              일정 삭제
            </Button>
          )}
          <Button
            variant="secondary"
            type="button"
            disabled={mutation.isPending}
            onClick={close}
          >
            취소
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중…" : "일정 저장"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
