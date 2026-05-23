package com.moim.infra.naver;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;

import java.util.List;

@Getter
@JsonIgnoreProperties(ignoreUnknown = true)
public class NaverDirectionsResponse {

    private Route route;

    @Getter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Route {
        private List<Traoptimal> traoptimal;
    }

    @Getter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Traoptimal {
        private Summary summary;
    }

    @Getter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Summary {
        private int duration; // 밀리초
    }

    public Integer getDurationMinutes() {
        if (route == null || route.getTraoptimal() == null || route.getTraoptimal().isEmpty()) {
            return null;
        }
        return route.getTraoptimal().get(0).getSummary().getDuration() / 60_000;
    }
}
