package com.dailybriefing;

import com.fasterxml.jackson.databind.*;

final class Fixture {

  static JsonNode json(String name) throws Exception {
    try (
      var in = Fixture.class.getResourceAsStream("/fixtures/" + name + ".json")
    ) {
      return new ObjectMapper().readTree(in);
    }
  }
}
