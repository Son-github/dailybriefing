import { errorGuide, type Failure } from "../../lib/errors";
import { useRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RefreshCw, ArrowUpRight } from "lucide-react";
import { clsx } from "clsx";
import type { Meta } from "../../types";
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return <button className={clsx("button", variant, className)} {...props} />;
}
export function Input({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
    </label>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <p>{title}</p>
      {children}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-group" role="status" aria-label="정보 불러오는 중">
      <div className="skeleton w-1/2" />
      <div className="skeleton h-16" />
      <div className="skeleton w-3/4" />
    </div>
  );
}
export function ErrorState({
  title = "정보를 불러오지 못했어요.",
  failure,
  retry,
  details,
}: {
  title?: string;
  failure?: Failure;
  retry: () => void;
  details?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{failure ? errorGuide(failure).title : title}</p>
      {failure && (
        <>
          <p className="muted small">{errorGuide(failure).cause}</p>
          <p className="small">
            오류 코드: <code>{failure.code || "UNKNOWN"}</code>
            {failure.requestId && (
              <>
                {" "}
                · 요청 번호: <code>{failure.requestId}</code>
              </>
            )}
          </p>
        </>
      )}
      <Button variant="secondary" onClick={retry}>
        <RefreshCw size={15} />
        다시 시도
      </Button>
      {details && (
        <Button variant="ghost" onClick={details}>
          문제 해결 방법
        </Button>
      )}
    </div>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <p
      className={clsx("notice", error && "error")}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  ) : null;
}
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="sheet"
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // 닫기 직후 사용자가 다른 입력을 눌렀다면 지연된 focus 복원이 입력을 빼앗지 않습니다.
            const active = document.activeElement as HTMLElement | null;
            if (
              active &&
              active !== document.body &&
              active.isConnected &&
              !active.closest('[role="dialog"]')
            )
              return;
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <div className="sheet-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="닫기">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function DataMeta({ meta }: { meta: Meta }) {
  return (
    <div className="data-meta">
      <span
        title={
          meta.mode === "DEMO"
            ? "샘플을 조회했으며 실제 외부 API는 호출하지 않았습니다."
            : "Backend가 외부 API에서 조회한 데이터입니다. 탭 전환 시에는 이미 받은 데이터를 사용할 수 있습니다."
        }
      >
        {meta.mode === "DEMO"
          ? "샘플 데이터 · 실제 API 미호출"
          : `실제 API 데이터 · ${meta.provider}`}
      </span>
      <time dateTime={meta.updatedAt}>
        {new Date(meta.updatedAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        업데이트
      </time>
    </div>
  );
}
export function ExternalLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return /^https?:\/\//.test(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={16} />
    </a>
  ) : (
    <span>{children}</span>
  );
}
