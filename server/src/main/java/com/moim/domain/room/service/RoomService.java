package com.moim.domain.room.service;

import com.moim.domain.location.entity.Place;
import com.moim.domain.location.repository.PlaceRepository;
import com.moim.domain.room.dto.ConfirmRequest;
import com.moim.domain.room.dto.JoinRoomRequest;
import com.moim.domain.room.dto.RoomCreateRequest;
import com.moim.domain.room.dto.RoomResponse;
import com.moim.domain.room.dto.RoomUpdateRequest;
import com.moim.domain.room.entity.*;
import com.moim.domain.room.repository.RoomParticipantRepository;
import com.moim.domain.room.repository.RoomRepository;
import com.moim.domain.user.entity.User;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private static final int MAX_PARTICIPANTS = 10;

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository roomParticipantRepository;
    private final PlaceRepository placeRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public RoomResponse createRoom(RoomCreateRequest request, User host) {
        String color = validateColor(request.getColor());
        int maxParticipants = request.getMaxParticipants() != null ? request.getMaxParticipants() : MAX_PARTICIPANTS;
        Room room = roomRepository.save(Room.builder()
            .title(request.getTitle())
            .host(host)
            .maxParticipants(maxParticipants)
            .build());

        roomParticipantRepository.save(RoomParticipant.builder()
            .id(new RoomParticipantId(room.getId(), host.getId()))
            .room(room)
            .user(host)
            .color(color)
            .build());

        return RoomResponse.from(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getMyRooms(User user) {
        return roomRepository.findAllByParticipantUserId(user.getId())
            .stream()
            .map(RoomResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(UUID roomId) {
        return RoomResponse.from(findRoom(roomId));
    }

    @Transactional
    public void joinRoom(UUID roomId, JoinRoomRequest request, User user) {
        String color = validateColor(request.getColor());

        Room room = roomRepository.findByIdWithLock(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ROOM_NOT_ACTIVE);
        }

        RoomParticipantId participantId = new RoomParticipantId(roomId, user.getId());
        if (roomParticipantRepository.existsById(participantId)) {
            throw new BusinessException(ErrorCode.ROOM_ALREADY_JOINED);
        }

        List<RoomParticipant> existing = roomParticipantRepository.findByIdRoomId(roomId);
        if (existing.size() >= room.getMaxParticipants()) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        boolean colorTaken = existing.stream().anyMatch(p -> p.getColor().equals(color));
        if (colorTaken) {
            throw new BusinessException(ErrorCode.COLOR_ALREADY_TAKEN);
        }

        roomParticipantRepository.save(RoomParticipant.builder()
            .id(participantId)
            .room(room)
            .user(user)
            .color(color)
            .build());

        // 새 참여자 입장을 같은 방의 모든 클라이언트에게 실시간 반영
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/info", RoomResponse.from(room));
    }

    private String validateColor(String color) {
        try {
            return ParticipantColor.valueOf(color).name();
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException(ErrorCode.INVALID_COLOR);
        }
    }

    // 이름 수정은 모든 참여자, maxParticipants 수정은 방장만 가능
    @Transactional
    public RoomResponse updateRoom(UUID roomId, RoomUpdateRequest request, User requester) {
        Room room = findRoom(roomId);
        validateParticipant(roomId, requester.getId());
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            room.updateTitle(request.getTitle());
        }
        if (request.getMaxParticipants() != null) {
            if (!room.isHost(requester.getId())) {
                throw new BusinessException(ErrorCode.HOST_ONLY);
            }
            if (request.getMaxParticipants() < room.getParticipantCount()) {
                throw new BusinessException(ErrorCode.MAX_PARTICIPANTS_TOO_SMALL);
            }
            room.updateMaxParticipants(request.getMaxParticipants());
        }
        RoomResponse response = RoomResponse.from(room);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/info", response);
        return response;
    }

    @Transactional
    public void deleteRoom(UUID roomId, User requester) {
        Room room = findRoom(roomId);
        if (!room.isHost(requester.getId())) {
            throw new BusinessException(ErrorCode.HOST_ONLY);
        }
        roomRepository.delete(room);
    }

    // 방 나가기: 방장이 나가면 newHostId로 지정된 참여자에게 방장 이전, 마지막이면 방 삭제
    @Transactional
    public void leaveRoom(UUID roomId, User user, UUID newHostId) {
        Room room = findRoom(roomId);

        RoomParticipantId participantId = new RoomParticipantId(roomId, user.getId());
        if (!roomParticipantRepository.existsById(participantId)) {
            throw new BusinessException(ErrorCode.ROOM_ACCESS_DENIED);
        }

        roomParticipantRepository.deleteById(participantId);
        roomParticipantRepository.flush();

        int remaining = roomParticipantRepository.countByIdRoomId(roomId);
        if (remaining == 0) {
            roomRepository.delete(room);
            return;
        }

        if (room.isHost(user.getId())) {
            // 클라이언트가 지정한 참여자에게 방장 이전
            RoomParticipantId newHostParticipantId = new RoomParticipantId(roomId,
                newHostId != null ? newHostId : UUID.randomUUID());
            RoomParticipant newHostParticipant = roomParticipantRepository
                .findById(newHostParticipantId)
                .orElseGet(() ->
                    // 지정 참여자가 없으면 임의로 첫 번째 참여자
                    roomParticipantRepository
                        .findFirstByIdRoomIdAndIdUserIdNot(roomId, user.getId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND))
                );
            room.transferHost(newHostParticipant.getUser());
        }

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/info", RoomResponse.from(room));
    }

    @Transactional
    public RoomResponse confirmRoom(UUID roomId, ConfirmRequest request, User requester) {
        Room room = findRoom(roomId);
        if (!room.isHost(requester.getId())) {
            throw new BusinessException(ErrorCode.HOST_ONLY);
        }
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ROOM_NOT_ACTIVE);
        }

        Place confirmedPlace = null;
        if (request.getPlaceId() != null) {
            confirmedPlace = placeRepository.findByIdAndRoomId(request.getPlaceId(), roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));
        }

        room.confirm(request.getDate(), confirmedPlace);
        return RoomResponse.from(room);
    }

    @Transactional
    public RoomResponse unconfirmRoom(UUID roomId, User requester) {
        Room room = findRoom(roomId);
        if (!room.isHost(requester.getId())) {
            throw new BusinessException(ErrorCode.HOST_ONLY);
        }
        if (room.getStatus() != RoomStatus.CONFIRMED) {
            throw new BusinessException(ErrorCode.ROOM_NOT_ACTIVE);
        }
        room.unconfirm();
        return RoomResponse.from(room);
    }

    @Transactional(readOnly = true)
    public RoomResponse getResult(UUID roomId) {
        Room room = findRoom(roomId);
        if (room.getStatus() != RoomStatus.CONFIRMED) {
            throw new BusinessException(ErrorCode.ROOM_NOT_ACTIVE);
        }
        return RoomResponse.from(room);
    }

    private Room findRoom(UUID roomId) {
        return roomRepository.findById(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
    }

    public void validateParticipant(UUID roomId, UUID userId) {
        if (!roomParticipantRepository.existsById(new RoomParticipantId(roomId, userId))) {
            throw new BusinessException(ErrorCode.ROOM_ACCESS_DENIED);
        }
    }
}
