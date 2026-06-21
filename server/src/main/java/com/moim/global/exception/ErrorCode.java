package com.moim.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Auth
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),

    // Room
    ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "약속방을 찾을 수 없습니다."),
    ROOM_FULL(HttpStatus.CONFLICT, "약속방 인원이 가득 찼습니다."),
    MAX_PARTICIPANTS_TOO_SMALL(HttpStatus.BAD_REQUEST, "현재 참여 인원보다 적은 인원으로 설정할 수 없습니다."),
    ROOM_ALREADY_JOINED(HttpStatus.CONFLICT, "이미 참가한 약속방입니다."),
    ROOM_ACCESS_DENIED(HttpStatus.FORBIDDEN, "약속방에 대한 권한이 없습니다."),
    HOST_ONLY(HttpStatus.FORBIDDEN, "방장만 수행할 수 있는 작업입니다."),
    ROOM_NOT_ACTIVE(HttpStatus.BAD_REQUEST, "활성 상태의 약속방이 아닙니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),

    // Location
    PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다."),
    NAVER_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "이동 시간 계산 중 오류가 발생했습니다."),

    // Common
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
