package com.moim.domain.schedule.service;

import com.moim.domain.room.entity.Room;
import com.moim.domain.room.repository.RoomRepository;
import com.moim.domain.room.service.RoomService;
import com.moim.domain.schedule.dto.ScheduleRequest;
import com.moim.domain.schedule.entity.Schedule;
import com.moim.domain.schedule.repository.ScheduleRepository;
import com.moim.domain.user.entity.User;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final RoomRepository roomRepository;
    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void saveSchedule(UUID roomId, ScheduleRequest request, User user) {
        roomService.validateParticipant(roomId, user.getId());

        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

        // 기존 날짜 삭제 후 일괄 저장 (upsert 대신 delete+insert로 단순화)
        scheduleRepository.deleteByRoomIdAndUserId(roomId, user.getId());

        List<Schedule> schedules = request.getDates().stream()
            .map(date -> Schedule.builder().room(room).user(user).availableDate(date).build())
            .toList();

        scheduleRepository.saveAll(schedules);

        // 집계 결과를 방 참여자 전원에게 브로드캐스트
        Map<LocalDate, List<String>> aggregated = getAggregated(roomId, user);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/schedule", aggregated);
    }

    @Transactional(readOnly = true)
    public List<String> getMyDates(UUID roomId, User user) {
        roomService.validateParticipant(roomId, user.getId());
        return scheduleRepository.findByRoomIdAndUserId(roomId, user.getId()).stream()
            .map(s -> s.getAvailableDate().toString())
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<LocalDate, List<String>> getAggregated(UUID roomId, User user) {
        roomService.validateParticipant(roomId, user.getId());

        return scheduleRepository.findByRoomId(roomId).stream()
            .collect(Collectors.groupingBy(
                Schedule::getAvailableDate,
                Collectors.mapping(s -> s.getUser().getName(), Collectors.toList())
            ));
    }
}
