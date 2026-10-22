package com.dailybriefing.transit;

import com.dailybriefing.provider.ProviderHttp;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KakaoPlaceClient {

  private final ProviderHttp http;
  private final String url, key;

  public KakaoPlaceClient(
    ProviderHttp http,
    @Value("${app.kakao-place-url}") String url,
    @Value("${app.kakao-key}") String key
  ) {
    this.http = http;
    this.url = url;
    this.key = key;
  }

  public List<MobilityModels.Place> search(String query) {
    if (http.demo()) return List.of(
      new MobilityModels.Place(
        "demo-seongbok",
        "성복역",
        "경기도 용인시 수지구 · 샘플 위치",
        37.313,
        127.080,
        MobilityModels.Source.SEARCH,
        "샘플 지하철역"
      ),
      new MobilityModels.Place(
        "demo-coex",
        "코엑스",
        "서울 강남구 · 샘플 위치",
        37.512,
        127.059,
        MobilityModels.Source.SEARCH,
        "샘플 전시장"
      ),
      new MobilityModels.Place(
        "demo-gangnam",
        "강남역",
        "서울 강남구 · 샘플 위치",
        37.498,
        127.028,
        MobilityModels.Source.SEARCH,
        "샘플 지하철역"
      ),
      new MobilityModels.Place(
        "demo-seoul",
        "서울역",
        "서울 용산구 · 샘플 위치",
        37.555,
        126.971,
        MobilityModels.Source.SEARCH,
        "샘플 기차역"
      )
    )
      .stream()
      .filter(p -> p.name().contains(query))
      .toList();
    ProviderHttp.requireKey(key);
    // 변수로 UTF-8 인코딩 후 URI로 직접 전달합니다. 한글·공백·+의 중복 인코딩을 방지합니다.
    var uri = UriComponentsBuilder.fromUriString(
      url + "/v2/local/search/keyword.json"
    )
      .queryParam("query", "{query}")
      .queryParam("size", 15)
      .encode()
      .buildAndExpand(query)
      .toUri();
    var raw = http.get(
      "KakaoPlace",
      uri,
      Map.of("Authorization", "KakaoAK " + key)
    );
    return Arrays.stream(
      ProviderHttp.decode(raw.path("documents"), KakaoPlaceResponse[].class)
    )
      .map(KakaoPlaceMapper::map)
      .toList();
  }

  public MobilityModels.Place reverse(double lat, double lon) {
    if (http.demo()) return new MobilityModels.Place(
      null,
      "선택한 위치",
      "샘플 위치 · 실제 주소 확인은 LIVE에서 제공",
      lat,
      lon,
      MobilityModels.Source.MAP,
      null
    );
    ProviderHttp.requireKey(key);
    var uri = UriComponentsBuilder.fromUriString(
      url + "/v2/local/geo/coord2address.json"
    )
      .queryParam("x", lon)
      .queryParam("y", lat)
      .build()
      .toUri();
    var docs = http
      .get("KakaoReverse", uri, Map.of("Authorization", "KakaoAK " + key))
      .path("documents");
    String address = "";
    if (docs.isArray() && !docs.isEmpty()) {
      var d = docs.get(0);
      address = d.path("road_address").path("address_name").asText();
      if (address.isBlank()) address = d
        .path("address")
        .path("address_name")
        .asText();
    }
    return new MobilityModels.Place(
      null,
      address.isBlank() ? "선택한 위치" : address,
      address,
      lat,
      lon,
      MobilityModels.Source.MAP,
      null
    );
  }
}
