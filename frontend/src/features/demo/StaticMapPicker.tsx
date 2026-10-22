import { useState } from "react";
import { Button, Sheet } from "../../components/ui";
import { PlaceInput } from "../transit/PlaceInput";
import type { Place } from "../../types";
export function StaticMapPicker({
  select,
  close,
  purpose = "위치",
}: {
  initial: Place | null;
  select: (p: Place) => void;
  close: () => void;
  purpose?: string;
}) {
  const [place, setPlace] = useState<Place | null>(null);
  return (
    <Sheet
      open
      title="장소 선택 · 샘플"
      description="정적 체험에서는 실제 지도/GPS를 호출하지 않아요. 서울역·강남역·코엑스 샘플을 검색해 보세요."
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div className="sheet-body">
        <PlaceInput
          label={`${purpose} 검색`}
          value={place}
          onChange={setPlace}
        />
        {place && <p>{place.address}</p>}
        <Button
          disabled={!place}
          onClick={() => {
            if (place) select(place);
          }}
        >
          이 샘플 위치로 설정
        </Button>
      </div>
    </Sheet>
  );
}
