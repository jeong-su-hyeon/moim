package com.moim.domain.chat.dto;

import com.moim.domain.chat.entity.ChatMessage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ChatMessageResponse {
    private UUID id;
    private UUID roomId;
    private UUID userId;
    private String userName;
    private String userProfileUrl;
    private String content;
    private LocalDateTime sentAt;

    public static ChatMessageResponse from(ChatMessage msg) {
        return ChatMessageResponse.builder()
            .id(msg.getId())
            .roomId(msg.getRoom().getId())
            .userId(msg.getUser().getId())
            .userName(msg.getUser().getName())
            .userProfileUrl(msg.getUser().getProfileUrl())
            .content(msg.getContent())
            .sentAt(msg.getSentAt())
            .build();
    }
}
