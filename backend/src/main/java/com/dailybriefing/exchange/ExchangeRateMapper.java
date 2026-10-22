package com.dailybriefing.exchange;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.ProviderModels;
import java.math.BigDecimal;

public final class ExchangeRateMapper {

  public static ProviderModels.Rate map(KoreaEximResponse raw) {
    try {
      if (raw.result() != 1) throw new IllegalArgumentException();
      int unit = raw.cur_unit().endsWith("(100)") ? 100 : 1;
      String code = raw.cur_unit().replace("(100)", "");
      var value = new BigDecimal(raw.deal_bas_r().replace(",", ""));
      if (value.signum() <= 0) throw new IllegalArgumentException();
      return new ProviderModels.Rate(
        code,
        code + "/KRW",
        value,
        null,
        null,
        raw.cur_nm(),
        unit
      );
    } catch (Exception e) {
      throw new ApiException(
        502,
        "UPSTREAM_FORMAT",
        "환율 정보 형식을 확인할 수 없어요."
      );
    }
  }
}
