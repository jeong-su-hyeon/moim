package com.moim.domain.chat.controller;

import com.moim.domain.chat.dto.ChatMessageRequest;
import com.moim.domain.chat.dto.ChatMessageResponse;
import com.moim.domain.chat.service.ChatService;
import com.moim.domain.user.entity.User;
import com.moim.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // STOMP 메시지 수신 — Principal은 JwtChannelInterceptor에서 주입된 userId
    @MessageMapping("/room/{roomId}/message")
    public void sendMessage(@DestinationVariable UUID roomId,
                            @Payload @Valid ChatMessageRequest request,
                            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        ChatMessageResponse response = chatService.saveMessage(roomId, request, userId);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
    }

    // REST: 채팅 히스토리 페이지네이션
    @GetMapping("/api/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getHistory(
            @PathVariable UUID roomId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime cursor,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(
            chatService.getHistory(roomId, cursor, Math.min(size, 100), user.getId())));
    }
}
