package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.provider.ProviderHttp;
import com.dailybriefing.transit.*;
import org.junit.jupiter.api.Test;

class KakaoPlaceMapperTest {

  @Test
  void mapsCoordinateOrderRoadAddressAndRejectsMalformed() throws Exception {
    var dto = ProviderHttp.decode(
      Fixture.json("kakao-place").path("documents").get(0),
      KakaoPlaceResponse.class
    );
    var p = KakaoPlaceMapper.map(dto);
    assertThat(p.latitude()).isEqualTo(37.512);
    assertThat(p.longitude()).isEqualTo(127.059);
    assertThat(p.address()).contains("영동대로");
    assertThat(p.source()).isEqualTo(MobilityModels.Source.SEARCH);
    assertThatThrownBy(() ->
      KakaoPlaceMapper.map(
        new KakaoPlaceResponse("id", "장소", "", "지번", "", "NaN", "37")
      )
    ).isInstanceOf(com.dailybriefing.common.ApiException.class);
  }
}
