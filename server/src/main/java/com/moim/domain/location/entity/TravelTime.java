package com.moim.domain.location.entity;

import com.moim.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "travel_times",
    uniqueConstraints = @UniqueConstraint(columnNames = {"place_id", "user_id", "transport"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class TravelTime {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransportMode transport;

    @Column(name = "duration_min", nullable = false)
    private Integer durationMin;

    @UpdateTimestamp
    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;
}
