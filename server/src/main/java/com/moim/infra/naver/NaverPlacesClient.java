package com.moim.infra.naver;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class NaverPlacesClient {

    private final WebClient webClient;
    private final String clientId;
    private final String clientSecret;

    public NaverPlacesClient(
            WebClient.Builder webClientBuilder,
            @Value("${naver.search.client-id}") String clientId,
            @Value("${naver.search.client-secret}") String clientSecret) {
        this.webClient = webClientBuilder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public record PlaceResult(String name, String address, double lat, double lng) {}

    @SuppressWarnings("unchecked")
    public List<PlaceResult> search(String query) {
        try {
            Map<String, Object> response = webClient.get()
                .uri("https://openapi.naver.com/v1/search/local.json",
                    uri -> uri.queryParam("query", query).queryParam("display", 5).build())
                .header("X-Naver-Client-Id", clientId)
                .header("X-Naver-Client-Secret", clientSecret)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (response == null) { log.warn("Naver Search: null response"); return Collections.emptyList(); }

            List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
            if (items == null || items.isEmpty()) { log.warn("Naver Search: empty items"); return Collections.emptyList(); }

            return items.stream()
                .map(item -> {
                    String title = String.valueOf(item.getOrDefault("title", "")).replaceAll("<[^>]+>", "");
                    String address = String.valueOf(item.getOrDefault("roadAddress",
                        item.getOrDefault("address", "")));
                    // mapx=경도×1e7, mapy=위도×1e7 (문자열 정수)
                    double lng = Double.parseDouble(String.valueOf(item.get("mapx"))) / 1e7;
                    double lat = Double.parseDouble(String.valueOf(item.get("mapy"))) / 1e7;
                    return new PlaceResult(title, address, lat, lng);
                })
                .toList();

        } catch (Exception e) {
            log.error("Naver Search API error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
