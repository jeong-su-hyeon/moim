package com.moim.domain.chat.service;

import com.moim.domain.chat.dto.ChatMessageRequest;
import com.moim.domain.chat.dto.ChatMessageResponse;
import com.moim.domain.chat.entity.ChatMessage;
import com.moim.domain.chat.repository.ChatMessageRepository;
import com.moim.domain.room.entity.Room;
import com.moim.domain.room.repository.RoomRepository;
import com.moim.domain.room.service.RoomService;
import com.moim.domain.user.entity.User;
import com.moim.domain.user.repository.UserRepository;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomService roomService;

    @Transactional
    public ChatMessageResponse saveMessage(UUID roomId, ChatMessageRequest request, UUID userId) {
        roomService.validateParticipant(roomId, userId);

        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // saveAndFlush로 즉시 INSERT를 실행해 @CreationTimestamp(sentAt)가 채워진 값을 즉시 응답에 반영
        ChatMessage msg = chatMessageRepository.saveAndFlush(ChatMessage.builder()
            .room(room).user(user).content(request.getContent()).build());

        return ChatMessageResponse.from(msg);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getHistory(UUID roomId, LocalDateTime cursor, int size, UUID userId) {
        roomService.validateParticipant(roomId, userId);
        List<ChatMessage> messages = cursor == null
            ? chatMessageRepository.findByRoomLatest(roomId, PageRequest.of(0, size))
            : chatMessageRepository.findByRoomBeforeCursor(roomId, cursor, PageRequest.of(0, size));
        return messages.stream()
            .map(ChatMessageResponse::from)
            .toList();
    }
}
