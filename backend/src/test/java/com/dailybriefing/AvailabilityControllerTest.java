package com.dailybriefing;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.dailybriefing.provider.AvailabilityController;
import org.springframework.boot.actuate.health.*;
import org.junit.jupiter.api.Test;
class AvailabilityControllerTest {
  @Test void reportsOnlyStatusAndDisablesCaching() {
    var endpoint=mock(HealthEndpoint.class);when(endpoint.health()).thenReturn(Health.up().withDetail("private","hidden").build());
    var response=new AvailabilityController(endpoint).get();
    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getBody()).containsOnlyKeys("status").containsEntry("status","UP");
    assertThat(response.getHeaders().getCacheControl()).contains("no-store");
  }
  @Test void unhealthyDependencyDoesNotAdvertiseLive() {
    var endpoint=mock(HealthEndpoint.class);when(endpoint.health()).thenReturn(Health.down().build());
    assertThat(new AvailabilityController(endpoint).get().getStatusCode().value()).isEqualTo(503);
  }
}
