package com.dailybriefing.transit;

import com.dailybriefing.common.ApiException;

public final class KakaoPlaceMapper {

  public static MobilityModels.Place map(KakaoPlaceResponse raw) {
    try {
      double lat = Double.parseDouble(raw.y()),
        lon = Double.parseDouble(raw.x());
      if (
        !Double.isFinite(lat) ||
        !Double.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180 ||
        raw.place_name() == null ||
        raw.place_name().isBlank()
      ) throw new IllegalArgumentException();
      return new MobilityModels.Place(
        raw.id(),
        raw.place_name(),
        raw.road_address_name() != null && !raw.road_address_name().isBlank()
          ? raw.road_address_name()
          : raw.address_name(),
        lat,
        lon,
        MobilityModels.Source.SEARCH,
        raw.category_name()
      );
    } catch (Exception e) {
      throw new ApiException(
        502,
        "UPSTREAM_FORMAT",
        "장소 좌표를 확인할 수 없어요."
      );
    }
  }
}
