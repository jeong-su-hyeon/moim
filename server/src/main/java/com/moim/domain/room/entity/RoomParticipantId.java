package com.moim.domain.room.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RoomParticipantId implements Serializable {

    @Column(name = "room_id", columnDefinition = "uuid")
    private UUID roomId;

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;
}
