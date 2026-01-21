package com.sonny.newsservice.service;

import com.sonny.newsservice.dto.TrendBadgeDto;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TrendScoringService {

    public List<TrendBadgeDto> makeTrendTop(Map<String, Integer> current, Map<String, Integer> prev, int limit) {
        List<Temp> temps = new ArrayList<>();
        for (var e : current.entrySet()) {
            String k = e.getKey();
            int cur = e.getValue();
            int p = prev.getOrDefault(k, 0);
            int delta = cur - p;

            // 설명 가능한 단순식
            double raw = (cur * 2.0) + (delta * 3.0);
            temps.add(new Temp(k, cur, p, delta, raw));
        }

        temps.sort(Comparator.comparingDouble(Temp::raw).reversed());
        List<Temp> top = temps.stream().limit(limit).toList();

        double max = top.stream().mapToDouble(Temp::raw).max().orElse(1.0);
        double min = top.stream().mapToDouble(Temp::raw).min().orElse(0.0);

        List<TrendBadgeDto> out = new ArrayList<>();
        for (int i = 0; i < top.size(); i++) {
            Temp t = top.get(i);

            int score;
            if (Math.abs(max - min) < 1e-9) score = 50;
            else score = (int) Math.round((t.raw - min) / (max - min) * 100.0);

            String direction = t.delta > 0 ? "UP" : (t.delta < 0 ? "DOWN" : "FLAT");
            int sizeLevel = scoreToSizeLevel(score);

            out.add(TrendBadgeDto.builder()
                    .rank(i + 1)
                    .keyword(t.keyword)
                    .score(score)
                    .sizeLevel(sizeLevel)
                    .direction(direction)
                    .currentCount(t.cur)
                    .previousCount(t.prev)
                    .delta(t.delta)
                    .build());
        }

        return out;
    }

    private int scoreToSizeLevel(int score) {
        if (score >= 80) return 5;
        if (score >= 60) return 4;
        if (score >= 40) return 3;
        if (score >= 20) return 2;
        return 1;
    }

    private record Temp(String keyword, int cur, int prev, int delta, double raw) {}
}
