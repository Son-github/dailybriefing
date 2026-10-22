package com.dailybriefing.calendar;

import com.dailybriefing.provider.*;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class HolidayService {

  private final KasiHolidayClient client;
  private final ProviderHttp http;

  public HolidayService(KasiHolidayClient client, ProviderHttp http) {
    this.client = client;
    this.http = http;
  }

  public record View(
    List<KasiHolidayClient.Holiday> holidays,
    ProviderModels.Meta meta
  ) {}

  public View get(int year, int month) {
    return new View(client.get(year, month), http.meta("한국천문연구원"));
  }
}
