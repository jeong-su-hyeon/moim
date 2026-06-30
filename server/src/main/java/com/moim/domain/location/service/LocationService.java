package com.moim.domain.location.service;

import com.moim.domain.location.dto.*;
import com.moim.domain.location.entity.*;
import com.moim.domain.location.repository.*;
import com.moim.domain.room.entity.Room;
import com.moim.domain.room.entity.RoomParticipant;
import com.moim.domain.room.repository.RoomParticipantRepository;
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

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final UserOriginRepository userOriginRepository;
    private final PlaceRepository placeRepository;
    private final TravelTimeRepository travelTimeRepository;
    private final PlaceLikeRepository placeLikeRepository;
    private final RoomRepository roomRepository;
    private final RoomParticipantRepository roomParticipantRepository;
    private final RoomService roomService;
    private final NaverDirectionsClient naverDirectionsClient;
    private final SimpMessagingTemplate messagingTemplate;

    private Map<UUID, String> colorByUserId(UUID roomId) {
        return roomParticipantRepository.findByIdRoomId(roomId).stream()
            .collect(Collectors.toMap(p -> p.getUser().getId(), RoomParticipant::getColor));
    }

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

    // 본인 출발지만 조회 — 다른 참여자의 출발지는 노출하지 않는다.
    @Transactional(readOnly = true)
    public OriginResponse getMyOrigin(UUID roomId, User user) {
        roomService.validateParticipant(roomId, user.getId());
        return userOriginRepository.findByRoomIdAndUserId(roomId, user.getId())
            .map(OriginResponse::from)
            .orElse(null);
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

        PlaceResponse response = PlaceResponse.from(place, 0L, false, colorByUserId(roomId).get(user.getId()));
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
            placeLikeRepository.existsByPlaceIdAndUserId(place.getId(), user.getId()),
            colorByUserId(roomId).get(place.getRegisteredBy().getId())
        );
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/places",
            PlaceUpdateMessage.update(response));
        return response;
    }

    @Transactional(readOnly = true)
    public List<PlaceResponse> getPlaces(UUID roomId, User user) {
        roomService.validateParticipant(roomId, user.getId());
        Map<UUID, String> colorByUserId = colorByUserId(roomId);
        return placeRepository.findByRoomId(roomId).stream()
            .map(p -> PlaceResponse.from(
                p,
                placeLikeRepository.countByPlaceId(p.getId()),
                placeLikeRepository.existsByPlaceIdAndUserId(p.getId(), user.getId()),
                colorByUserId.get(p.getRegisteredBy().getId())
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
     * 후보지에 대한 본인 이동시간만 조회 — 다른 참여자의 이동시간은 노출하지 않는다.
     * (시간 여유가 있는 사람이 더 멀리 움직여줄 수 있어 굳이 비교를 노출할 필요가 없다는 정책)
     * 출발지를 입력하지 않은 경우 null 반환 (프론트에서 "출발지 미입력"으로 처리).
     * 캐시 우선 — CAR 모드 캐시 미스 시 Naver Directions API 호출 후 저장.
     */
    @Transactional
    public TravelTimeResponse getMyTravelTime(UUID roomId, UUID placeId, TransportMode transport, User user) {
        roomService.validateParticipant(roomId, user.getId());

        Place place = placeRepository.findByIdAndRoomId(placeId, roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));

        UserOrigin origin = userOriginRepository.findByRoomIdAndUserId(roomId, user.getId())
            .orElse(null);
        if (origin == null) {
            return null;
        }

        Optional<TravelTime> cached = travelTimeRepository
            .findByPlaceIdAndUserIdAndTransport(placeId, user.getId(), transport);
        if (cached.isPresent()) {
            return TravelTimeResponse.from(cached.get());
        }

        // CAR 모드만 Naver Directions API 지원 (TRANSIT/WALK는 캐시 데이터만 반환)
        if (transport != TransportMode.CAR) {
            return null;
        }

        try {
            int durationMin = naverDirectionsClient.getDrivingDurationMinutes(
                origin.getLng(), origin.getLat(),
                place.getLng(), place.getLat()
            );
            TravelTime saved = travelTimeRepository.save(TravelTime.builder()
                .place(place)
                .user(user)
                .transport(transport)
                .durationMin(durationMin)
                .build());
            return TravelTimeResponse.from(saved);
        } catch (BusinessException e) {
            log.warn("Naver API 호출 실패 (userId={}, placeId={}): {}", user.getId(), placeId, e.getMessage());
            return null;
        }
    }

    private Room findRoom(UUID roomId) {
        return roomRepository.findById(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
    }
}
