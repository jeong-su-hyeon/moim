package com.moim.domain.location.service;

import com.moim.domain.location.dto.*;
import com.moim.domain.location.entity.*;
import com.moim.domain.location.repository.*;
import com.moim.domain.room.entity.Room;
import com.moim.domain.room.repository.RoomRepository;
import com.moim.domain.room.service.RoomService;
import com.moim.domain.user.entity.User;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import com.moim.infra.naver.NaverDirectionsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final UserOriginRepository userOriginRepository;
    private final PlaceRepository placeRepository;
    private final TravelTimeRepository travelTimeRepository;
    private final PlaceLikeRepository placeLikeRepository;
    private final RoomRepository roomRepository;
    private final RoomService roomService;
    private final NaverDirectionsClient naverDirectionsClient;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void saveOrigin(UUID roomId, OriginRequest request, User user) {
        roomService.validateParticipant(roomId, user.getId());

        Optional<UserOrigin> existing = userOriginRepository.findByRoomIdAndUserId(roomId, user.getId());
        if (existing.isPresent()) {
            existing.get().update(request.getLat(), request.getLng(), request.getLabel());
            // 출발지 변경 → 이 방에서 이 사용자의 이동시간 캐시 전체 무효화
            travelTimeRepository.deleteByRoomIdAndUserId(roomId, user.getId());
        } else {
            Room room = findRoom(roomId);
            userOriginRepository.save(UserOrigin.builder()
                .room(room)
                .user(user)
                .lat(request.getLat())
                .lng(request.getLng())
                .label(request.getLabel())
                .build());
        }
    }

    @Transactional(readOnly = true)
    public List<OriginResponse> getOrigins(UUID roomId, User user) {
        roomService.validateParticipant(roomId, user.getId());
        return userOriginRepository.findByRoomId(roomId).stream()
            .map(OriginResponse::from)
            .toList();
    }

    @Transactional
    public PlaceResponse registerPlace(UUID roomId, PlaceRequest request, User user) {
        roomService.validateParticipant(roomId, user.getId());
        Room room = findRoom(roomId);

        Place place = placeRepository.save(Place.builder()
            .room(room)
            .name(request.getName())
            .address(request.getAddress())
            .lat(request.getLat())
            .lng(request.getLng())
            .category(request.getCategory())
            .registeredBy(user)
            .build());

        PlaceResponse response = PlaceResponse.from(place, 0L, false);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/places",
            PlaceUpdateMessage.add(response));
        return response;
    }

    @Transactional
    public void deletePlace(UUID roomId, UUID placeId, User user) {
        // IDOR 방지: place가 이 room 소속인지 한 쿼리로 검증 (존재하지 않으면 동일한 404 반환)
        Place place = placeRepository.findByIdAndRoomId(placeId, roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));

        // 등록자 또는 방장만 삭제 가능
        boolean isRegistrant = place.getRegisteredBy().getId().equals(user.getId());
        boolean isHost = place.getRoom().isHost(user.getId());
        if (!isRegistrant && !isHost) {
            throw new BusinessException(ErrorCode.ROOM_ACCESS_DENIED);
        }

        // FK 제약 위반 방지: 연관 데이터 먼저 삭제 후 Place 삭제
        placeLikeRepository.deleteByPlaceId(placeId);
        travelTimeRepository.deleteByPlaceId(placeId);
        placeRepository.deleteById(placeId);

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/places",
            PlaceUpdateMessage.delete(placeId));
    }

    @Transactional
    public PlaceResponse updatePlaceCategory(UUID roomId, UUID placeId, PlaceCategoryRequest request, User user) {
        roomService.validateParticipant(roomId, user.getId());

        // IDOR 방지: place가 이 room 소속인지 한 쿼리로 검증
        Place place = placeRepository.findByIdAndRoomId(placeId, roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));

        // 등록자 또는 방장만 카테고리 변경 가능
        boolean isRegistrant = place.getRegisteredBy().getId().equals(user.getId());
        boolean isHost = place.getRoom().isHost(user.getId());
        if (!isRegistrant && !isHost) {
            throw new BusinessException(ErrorCode.ROOM_ACCESS_DENIED);
        }

        place.updateCategory(request.getCategory());

        PlaceResponse response = PlaceResponse.from(
            place,
            placeLikeRepository.countByPlaceId(place.getId()),
            placeLikeRepository.existsByPlaceIdAndUserId(place.getId(), user.getId())
        );
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/places",
            PlaceUpdateMessage.update(response));
        return response;
    }

    @Transactional(readOnly = true)
    public List<PlaceResponse> getPlaces(UUID roomId, User user) {
        roomService.validateParticipant(roomId, user.getId());
        return placeRepository.findByRoomId(roomId).stream()
            .map(p -> PlaceResponse.from(
                p,
                placeLikeRepository.countByPlaceId(p.getId()),
                placeLikeRepository.existsByPlaceIdAndUserId(p.getId(), user.getId())
            ))
            .toList();
    }

    @Transactional
    public LikeUpdateMessage toggleLike(UUID roomId, UUID placeId, User user) {
        roomService.validateParticipant(roomId, user.getId());
        Place place = placeRepository.findByIdAndRoomId(placeId, roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));

        if (placeLikeRepository.existsByPlaceIdAndUserId(placeId, user.getId())) {
            placeLikeRepository.deleteByPlaceIdAndUserId(placeId, user.getId());
        } else {
            placeLikeRepository.save(PlaceLike.builder().place(place).user(user).build());
        }

        List<UUID> likedUserIds = placeLikeRepository.findUserIdsByPlaceId(placeId);
        LikeUpdateMessage message = new LikeUpdateMessage(placeId, likedUserIds.size(), likedUserIds);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/likes", message);
        return message;
    }

    /**
     * 후보지에 대한 참여자별 이동시간 조회.
     * 캐시 우선 — CAR 모드 캐시 미스 시 Naver Directions API 호출 후 저장.
     * 개별 API 실패는 건너뛰어 나머지 결과를 그대로 반환한다.
     */
    @Transactional
    public List<TravelTimeResponse> getTravelTimes(UUID roomId, UUID placeId, TransportMode transport, User user) {
        roomService.validateParticipant(roomId, user.getId());

        Place place = placeRepository.findByIdAndRoomId(placeId, roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));

        List<UserOrigin> origins = userOriginRepository.findByRoomId(roomId);
        List<TravelTimeResponse> results = new ArrayList<>();

        for (UserOrigin origin : origins) {
            Optional<TravelTime> cached = travelTimeRepository
                .findByPlaceIdAndUserIdAndTransport(placeId, origin.getUser().getId(), transport);

            if (cached.isPresent()) {
                results.add(TravelTimeResponse.from(cached.get()));
                continue;
            }

            // CAR 모드만 Naver Directions API 지원 (TRANSIT/WALK는 캐시 데이터만 반환)
            if (transport != TransportMode.CAR) {
                continue;
            }

            try {
                int durationMin = naverDirectionsClient.getDrivingDurationMinutes(
                    origin.getLng(), origin.getLat(),
                    place.getLng(), place.getLat()
                );
                TravelTime saved = travelTimeRepository.save(TravelTime.builder()
                    .place(place)
                    .user(origin.getUser())
                    .transport(transport)
                    .durationMin(durationMin)
                    .build());
                results.add(TravelTimeResponse.from(saved));
            } catch (BusinessException e) {
                log.warn("Naver API 호출 실패 (userId={}, placeId={}): {}", origin.getUser().getId(), placeId, e.getMessage());
            }
        }

        return results;
    }

    private Room findRoom(UUID roomId) {
        return roomRepository.findById(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
    }
}
