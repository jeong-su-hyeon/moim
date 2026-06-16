package com.moim.domain.location.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class LikeUpdateMessage {
    private UUID placeId;
    private long likeCount;
    private List<UUID> likedUserIds;
}
