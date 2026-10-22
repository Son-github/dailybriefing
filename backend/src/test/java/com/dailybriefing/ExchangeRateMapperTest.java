package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.exchange.*;
import com.dailybriefing.provider.ProviderHttp;
import org.junit.jupiter.api.Test;

class ExchangeRateMapperTest {

  @Test
  void preservesDecimalAndHundredYenUnit() throws Exception {
    var items = ProviderHttp.decode(
      Fixture.json("exchange"),
      KoreaEximResponse[].class
    );
    assertThat(ExchangeRateMapper.map(items[0]).displayUnit()).isEqualTo(100);
    assertThat(ExchangeRateMapper.map(items[0]).currency()).isEqualTo("JPY");
    assertThat(ExchangeRateMapper.map(items[1]).value()).isEqualByComparingTo(
      "1342.50"
    );
  }
}
