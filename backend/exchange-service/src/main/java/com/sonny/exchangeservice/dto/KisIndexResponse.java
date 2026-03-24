package com.sonny.exchangeservice.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class KisIndexResponse {

    private Output output;

    @Getter
    @NoArgsConstructor
    public static class Output {

        // 현재 지수
        private String bstp_nmix_prpr;

        // 등락률
        private String prdy_ctrt;

        // 전일 대비 부호
        private String prdy_vrss_sign;
    }
}
