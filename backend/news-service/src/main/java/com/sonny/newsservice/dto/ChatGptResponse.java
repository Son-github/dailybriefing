package com.sonny.newsservice.dto;

import lombok.Data;

@Data
public class ChatGptResponse {
    private Choice[] choices;

    @Data
    public static class Choice {
        private Message message;

        @Data
        public static class Message {
            private String content;
        }
    }
}
