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
            @Value("${naver.directions.client-id}") String clientId,
            @Value("${naver.directions.client-secret}") String clientSecret) {
        this.webClient = webClientBuilder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public record PlaceResult(String name, String address, double lat, double lng) {}

    @SuppressWarnings("unchecked")
    public List<PlaceResult> search(String query) {
        try {
            Map<String, Object> response = webClient.get()
                .uri("https://maps.apigw.ntruss.com/map-geocode/v2/geocode",
                    uri -> uri.queryParam("query", query).build())
                .header("X-NCP-APIGW-API-KEY-ID", clientId)
                .header("X-NCP-APIGW-API-KEY", clientSecret)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (response == null) { log.warn("Naver Geocoding: null response"); return Collections.emptyList(); }

            log.info("Naver Geocoding status={}, totalCount={}", response.get("status"), ((Map<?,?>)response.getOrDefault("meta", Map.of())).get("totalCount"));

            List<Map<String, Object>> addresses = (List<Map<String, Object>>) response.get("addresses");
            if (addresses == null || addresses.isEmpty()) { log.warn("Naver Geocoding: empty addresses"); return Collections.emptyList(); }

            return addresses.stream()
                .map(a -> new PlaceResult(
                    (String) a.getOrDefault("roadAddress", a.getOrDefault("jibunAddress", query)),
                    (String) a.getOrDefault("roadAddress", a.getOrDefault("jibunAddress", "")),
                    Double.parseDouble(String.valueOf(a.get("y"))),
                    Double.parseDouble(String.valueOf(a.get("x")))
                ))
                .toList();

        } catch (Exception e) {
            log.error("Naver Geocoding API error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
