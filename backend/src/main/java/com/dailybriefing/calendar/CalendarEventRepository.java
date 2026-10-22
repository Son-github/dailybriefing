package com.dailybriefing.calendar;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CalendarEventRepository
  extends JpaRepository<CalendarEvent, UUID>
{
  Optional<CalendarEvent> findByIdAndUserId(UUID id, UUID userId);

  // LIMIT/정렬을 PostgreSQL에 맡깁니다. 전체 일정을 가져와 Java에서 정렬하지 않습니다.
  @Query(
    value = "SELECT * FROM calendar_events WHERE user_id=:user AND event_date BETWEEN :start AND :end ORDER BY event_date,event_time NULLS LAST,id LIMIT 501",
    nativeQuery = true
  )
  List<CalendarEvent> range(
    @Param("user") UUID user,
    @Param("start") LocalDate start,
    @Param("end") LocalDate end
  );

  @Query(
    value = "SELECT * FROM calendar_events WHERE user_id=:user AND event_date>=:today ORDER BY event_date,event_time NULLS LAST,id LIMIT 3",
    nativeQuery = true
  )
  List<CalendarEvent> upcoming(
    @Param("user") UUID user,
    @Param("today") LocalDate today
  );

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("delete from CalendarEvent e where e.eventDate < :cutoff")
  int deleteBefore(@Param("cutoff") LocalDate cutoff);
}
