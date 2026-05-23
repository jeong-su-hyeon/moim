package com.moim.infra.naver;

import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Slf4j
@Component
public class NaverDirectionsClient {

    private final WebClient webClient;
    private final String clientId;
    private final String clientSecret;
    private final String baseUrl;

    public NaverDirectionsClient(
            WebClient.Builder webClientBuilder,
            @Value("${naver.directions.client-id}") String clientId,
            @Value("${naver.directions.client-secret}") String clientSecret,
            @Value("${naver.directions.base-url}") String baseUrl) {
        this.webClient = webClientBuilder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseUrl = baseUrl;
    }

    public int getDrivingDurationMinutes(double startLng, double startLat,
                                          double goalLng, double goalLat) {
        try {
            NaverDirectionsResponse response = webClient.get()
                .uri(baseUrl + "/map-direction/v1/driving",
                    uri -> uri
                        .queryParam("start", startLng + "," + startLat)
                        .queryParam("goal",  goalLng  + "," + goalLat)
                        .build())
                .header("X-NCP-APIGW-API-KEY-ID", clientId)
                .header("X-NCP-APIGW-API-KEY",    clientSecret)
                .retrieve()
                .bodyToMono(NaverDirectionsResponse.class)
                .block();

            Integer minutes = (response != null) ? response.getDurationMinutes() : null;
            if (minutes == null) throw new BusinessException(ErrorCode.NAVER_API_ERROR);
            return minutes;

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Naver Directions API error", e);
            throw new BusinessException(ErrorCode.NAVER_API_ERROR);
        }
    }
}
