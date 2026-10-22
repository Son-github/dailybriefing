package com.dailybriefing.transit;

import com.dailybriefing.common.ApiException;
import org.springframework.stereotype.Service;

@Service
public class MobilityService {

  private final KakaoMapRouteClient client;

  public MobilityService(KakaoMapRouteClient client) {
    this.client = client;
  }

  public MobilityModels.Routes routes(
    MobilityModels.Place start,
    MobilityModels.Place end
  ) {
    if (
      start.latitude().equals(end.latitude()) &&
      start.longitude().equals(end.longitude())
    ) throw new ApiException(
      400,
      "SAME_PLACE",
      "서로 다른 장소를 선택해 주세요."
    );
    return client.get(start, end);
  }
}
