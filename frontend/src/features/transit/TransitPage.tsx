import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowDownUp, Search, Star, MapPin, LocateFixed } from "lucide-react";
import { api, body, queryClient } from "../../lib/api";
import { showError } from "../../lib/errors";
import { useSession } from "../../lib/store";
import {
  Button,
  Card,
  Input,
  Notice,
  Empty,
  DataMeta,
  Sheet,
} from "../../components/ui";
import { QueryContent } from "../../components/ui/WidgetState";
import type { Place, FavoriteRoute } from "../../types";
import { PlaceInput } from "./PlaceInput";
import { MapPicker } from "./MapPicker";
import { currentLocation, routeRequest } from "./location";
import { RouteCard } from "./RouteCard";
import { FavoriteList } from "./FavoriteList";
export function TransitPage() {
  const user = useSession((s) => s.user);
  const [params] = useSearchParams();
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [search, setSearch] = useState<{
    from: Place;
    to: Place;
  } | null>(null);
  const [map, setMap] = useState<"from" | "to" | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [repair, setRepair] = useState<string | null>(null);
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => api<FavoriteRoute[]>("/me/mobility/favorites"),
    enabled: !!user,
  });
  const picked = favorites.data?.find((f) => f.id === params.get("favorite"));
  const effective =
    search ||
    (picked?.start && picked.end
      ? { from: picked.start, to: picked.end }
      : null);
  const routes = useQuery({
    queryKey: ["routes", effective],
    queryFn: ({ signal }) =>
      routeRequest(effective!.from, effective!.to, signal),
    enabled: !!effective,
    staleTime: 0,
  });
  const saved = favorites.data?.some(
    (f) =>
      f.start &&
      f.end &&
      f.start.latitude === effective?.from.latitude &&
      f.start.longitude === effective?.from.longitude &&
      f.end.latitude === effective?.to.latitude &&
      f.end.longitude === effective?.to.longitude,
  );
  const save = useMutation({
    mutationFn: () =>
      api(
        repair ? `/me/mobility/favorites/${repair}` : "/me/mobility/favorites",
        {
          method: repair ? "PATCH" : "POST",
          ...body({
            routeName: name.trim(),
            start: effective!.from,
            end: effective!.to,
          }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      setSaveOpen(false);
      setRepair(null);
      setMessage("자주 가는 경로에 저장했어요.");
    },
  });
  function choose(f: FavoriteRoute) {
    if (!f.start || !f.end) {
      setRepair(f.id);
      setName(f.routeName);
      setMessage(
        "이전 경로의 장소 좌표가 없어요. 출발지와 도착지를 다시 선택한 뒤 저장해 주세요.",
      );
      setSearch(null);
      return;
    }
    setFrom(f.start);
    setTo(f.end);
    setSearch({ from: f.start, to: f.end });
    setMessage("");
    void queryClient.invalidateQueries({ queryKey: ["routes"] });
  }
  async function locate() {
    setLocating(true);
    setLocationError("");
    try {
      setFrom(await currentLocation());
    } catch (e) {
      const error = e as Error;
      setLocationError(
        error.message + " 장소 검색 또는 지도에서 선택해 주세요.",
      );
      showError(error, "현재 위치를 사용하지 못했어요.");
    } finally {
      setLocating(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A LITTLE CLOSER</div>
          <h1>어디로 가시나요?</h1>
          <p className="muted">
            지금 있는 곳부터 가고 싶은 곳까지, 가장 빠른 길 하나.
          </p>
        </div>
      </div>
      <div className="transit-layout">
        <Card className="transit-search-card">
          <h2>이동 경로 찾기</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to) {
                setSearch({ from, to });
                setMessage("");
                void queryClient.invalidateQueries({ queryKey: ["routes"] });
              }
            }}
          >
            <PlaceInput label="출발지" value={from} onChange={setFrom} />
            <div className="location-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void locate()}
                disabled={locating}
              >
                <LocateFixed size={16} />
                {locating ? "위치 확인 중…" : "현재 위치"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMap("from")}
              >
                <MapPin size={16} />
                출발지 지도 선택
              </Button>
            </div>
            <Notice message={locationError} error />
            <div className="swap-row">
              <Button
                type="button"
                variant="ghost"
                aria-label="출발지와 도착지 바꾸기"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
              >
                <ArrowDownUp size={18} />
                <span>서로 바꾸기</span>
              </Button>
            </div>
            <PlaceInput label="도착지" value={to} onChange={setTo} />
            <Button type="button" variant="ghost" onClick={() => setMap("to")}>
              <MapPin size={16} />
              도착지 지도 선택
            </Button>
            <p className="muted small">
              카카오맵이 제공하는 경로 중 소요시간이 가장 짧은 경로를 안내해요.
              출발 시각 지정은 지원하지 않아요. GPS는 저장 전까지 일시적으로
              사용해요.
            </p>
            <Button
              className="w-full"
              type="submit"
              disabled={
                !from ||
                !to ||
                (from.latitude === to.latitude &&
                  from.longitude === to.longitude) ||
                routes.isFetching
              }
            >
              <Search size={17} />
              {routes.isFetching ? "경로 찾는 중…" : "경로 찾기"}
            </Button>
          </form>
        </Card>
        <Card className="transit-favorites-card">
          <h2>
            <Star size={18} />
            자주 가는 경로
          </h2>
          {user ? (
            <QueryContent query={favorites}>
              {(data) => <FavoriteList favorites={data} choose={choose} />}
            </QueryContent>
          ) : (
            <Empty title="한 번 저장하면, 다음부터 더 빠르게.">
              <Link className="button secondary" to="/login">
                로그인하고 경로 저장
              </Link>
            </Empty>
          )}
        </Card>
      </div>
      <Notice message={message} />
      {picked?.needsLocation && !repair && (
        <Card>
          <p>이전 경로의 좌표를 다시 선택해야 해요.</p>
          <Button onClick={() => choose(picked)}>
            기존 이름으로 장소 다시 선택
          </Button>
        </Card>
      )}
      {effective && (
        <section className="route-results" aria-live="polite">
          <div className="results-heading">
            <h2>
              {effective.from.name} → {effective.to.name}
            </h2>
            {user && routes.data?.routes.length ? (
              <Button
                variant="secondary"
                disabled={!!saved && !repair}
                onClick={() => {
                  if (!repair) setName("");
                  setSaveOpen(true);
                }}
              >
                <Star size={16} />
                {saved && !repair ? "저장됨" : "경로 저장"}
              </Button>
            ) : null}
          </div>
          <QueryContent query={routes}>
            {(data) => (
              <>
                <p className="route-notice">{data.notice}</p>
                {data.routes.length ? (
                  <div className="route-candidates">
                    <RouteCard route={data.routes[0]} />
                  </div>
                ) : (
                  <Empty title="확인 가능한 경로가 없어요.">
                    <p className="muted">
                      출발지와 도착지를 다른 장소로 선택해 주세요.
                    </p>
                  </Empty>
                )}
                <DataMeta meta={data.meta} />
              </>
            )}
          </QueryContent>
        </section>
      )}
      {map && (
        <MapPicker
          purpose={map === "from" ? "출발지" : "도착지"}
          initial={map === "from" ? from : to}
          close={() => setMap(null)}
          select={(place) => {
            if (map === "from") setFrom(place);
            else setTo(place);
            setMap(null);
          }}
        />
      )}
      <Sheet
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="이 경로를 저장할까요?"
        description="다음부터 이름을 눌러 최신 경로를 바로 확인할 수 있어요."
      >
        <form
          className="sheet-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) save.mutate();
          }}
        >
          <Input
            id="route-name"
            label="경로 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            placeholder="출근, 본가, 주말 약속…"
          />
          <p className="muted">
            {effective?.from.name} → {effective?.to.name}
          </p>
          <p className="muted small">
            선택한 출발지와 도착지 좌표가 계정에 저장돼요. 경로 결과는 저장하지
            않아요.
          </p>
          <Button disabled={!name.trim() || save.isPending} type="submit">
            {save.isPending ? "저장 중…" : "저장"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
