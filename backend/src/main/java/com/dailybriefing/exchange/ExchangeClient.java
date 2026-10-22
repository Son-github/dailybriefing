package com.dailybriefing.exchange;

import com.dailybriefing.provider.ProviderModels;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ExchangeClient {

  private final KoreaEximClient client;

  public ExchangeClient(KoreaEximClient client) {
    this.client = client;
  }

  public ProviderModels.Exchange get(List<String> currencies) {
    return client.get(currencies);
  }
}
