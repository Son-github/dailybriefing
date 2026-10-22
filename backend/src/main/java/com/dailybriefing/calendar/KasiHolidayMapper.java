package com.dailybriefing.calendar;

import com.dailybriefing.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

public final class KasiHolidayMapper {

  public static List<KasiHolidayClient.Holiday> map(JsonNode raw) {
    var out = new ArrayList<KasiHolidayClient.Holiday>();
    if (
      raw.isMissingNode() ||
      raw.isNull() ||
      (raw.isTextual() && raw.asText().isBlank())
    ) return out;
    var list = raw.isObject() ? List.of(raw) : new ArrayList<JsonNode>();
    if (raw.isArray()) raw.forEach(list::add);
    try {
      for (var item : list) {
        var dto = com.dailybriefing.provider.ProviderHttp.decode(
          item,
          KasiHolidayItem.class
        );
        if ("Y".equals(dto.isHoliday())) out.add(
          new KasiHolidayClient.Holiday(
            LocalDate.parse(dto.locdate(), DateTimeFormatter.BASIC_ISO_DATE),
            dto.dateName(),
            true,
            "PUBLIC"
          )
        );
      }
      return out;
    } catch (Exception e) {
      throw new ApiException(
        502,
        "UPSTREAM_FORMAT",
        "공휴일 정보 형식을 확인할 수 없어요."
      );
    }
  }
}
