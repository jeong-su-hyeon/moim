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

    // cursor 없을 때 (첫 페이지)
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id = :roomId ORDER BY m.sentAt DESC")
    List<ChatMessage> findByRoomLatest(
        @Param("roomId") UUID roomId,
        Pageable pageable
    );

    // cursor 있을 때 (이전 메시지)
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id = :roomId AND m.sentAt < :cursor ORDER BY m.sentAt DESC")
    List<ChatMessage> findByRoomBeforeCursor(
        @Param("roomId") UUID roomId,
        @Param("cursor") LocalDateTime cursor,
        Pageable pageable
    );
}
