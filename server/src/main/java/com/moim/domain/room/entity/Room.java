package com.moim.domain.room.entity;

import com.moim.domain.location.entity.Place;
import com.moim.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoomStatus status = RoomStatus.ACTIVE;

    @Column(name = "confirmed_date")
    private LocalDate confirmedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_place_id", columnDefinition = "uuid")
    private Place confirmedPlace;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "max_participants", nullable = false)
    @Builder.Default
    private int maxParticipants = 10;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RoomParticipant> participants = new ArrayList<>();

    public void confirm(LocalDate date, Place place) {
        this.confirmedDate = date;
        this.confirmedPlace = place;
        this.status = RoomStatus.CONFIRMED;
        this.expiresAt = date.plusMonths(1).atStartOfDay();
    }

    public void unconfirm() {
        this.confirmedDate = null;
        this.confirmedPlace = null;
        this.expiresAt = null;
        this.status = RoomStatus.ACTIVE;
    }

    public void cancel() {
        this.status = RoomStatus.CANCELLED;
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateMaxParticipants(int maxParticipants) {
        this.maxParticipants = maxParticipants;
    }

    public void transferHost(User newHost) {
        this.host = newHost;
    }

    public boolean isHost(UUID userId) {
        return this.host.getId().equals(userId);
    }

    public int getParticipantCount() {
        return this.participants.size();
    }
}
