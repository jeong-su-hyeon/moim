package com.moim.global.scheduler;

import com.moim.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoomExpiryScheduler {

    private final RoomRepository roomRepository;

    // 매일 새벽 3시 실행
    // ShedLock: 다중 인스턴스 환경에서 한 서버만 실행 보장
    @Scheduled(cron = "0 0 3 * * *")
    @SchedulerLock(name = "roomExpiryTask",
                   lockAtMostFor = "PT1H",
                   lockAtLeastFor = "PT30M")
    @Transactional
    public void deleteExpiredRooms() {
        log.info("Room expiry cleanup started");
        roomRepository.deleteExpiredRooms(LocalDateTime.now());
        log.info("Room expiry cleanup completed");
    }
}
