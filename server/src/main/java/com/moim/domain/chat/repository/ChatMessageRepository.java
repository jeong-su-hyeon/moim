package com.moim.domain.chat.repository;

import com.moim.domain.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    // cursor 기반 페이지네이션: sentAt 기준으로 이전 메시지 조회
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id = :roomId " +
           "AND (:cursor IS NULL OR m.sentAt < :cursor) " +
           "ORDER BY m.sentAt DESC")
    List<ChatMessage> findByRoomWithCursor(
        @Param("roomId") UUID roomId,
        @Param("cursor") LocalDateTime cursor,
        Pageable pageable
    );
}
