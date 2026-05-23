package com.moim.domain.room.service;

import com.moim.domain.room.dto.RoomCreateRequest;
import com.moim.domain.room.dto.RoomResponse;
import com.moim.domain.room.entity.*;
import com.moim.domain.room.repository.RoomParticipantRepository;
import com.moim.domain.room.repository.RoomRepository;
import com.moim.domain.user.entity.User;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private static final int MAX_PARTICIPANTS = 10;

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository roomParticipantRepository;

    @Transactional
    public RoomResponse createRoom(RoomCreateRequest request, User host) {
        Room room = roomRepository.save(Room.builder()
            .title(request.getTitle())
            .host(host)
            .build());

        // 방장을 첫 번째 참여자로 자동 등록
        roomParticipantRepository.save(RoomParticipant.builder()
            .id(new RoomParticipantId(room.getId(), host.getId()))
            .room(room)
            .user(host)
            .build());

        return RoomResponse.from(room);
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(UUID roomId) {
        return RoomResponse.from(findRoom(roomId));
    }

    @Transactional
    public void joinRoom(UUID roomId, User user) {
        // 비관적 락: 동시 참가 요청 시 한 건씩 순차 처리
        Room room = roomRepository.findByIdWithLock(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ROOM_NOT_ACTIVE);
        }

        RoomParticipantId participantId = new RoomParticipantId(roomId, user.getId());
        if (roomParticipantRepository.existsById(participantId)) {
            throw new BusinessException(ErrorCode.ROOM_ALREADY_JOINED);
        }

        // 락을 잡은 상태에서 인원 수 확인 → 레이스 컨디션 완전 방지
        if (roomParticipantRepository.countByIdRoomId(roomId) >= MAX_PARTICIPANTS) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }

        roomParticipantRepository.save(RoomParticipant.builder()
            .id(participantId)
            .room(room)
            .user(user)
            .build());
    }

    @Transactional
    public void deleteRoom(UUID roomId, User requester) {
        Room room = findRoom(roomId);
        if (!room.isHost(requester.getId())) {
            throw new BusinessException(ErrorCode.HOST_ONLY);
        }
        roomRepository.delete(room);
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
