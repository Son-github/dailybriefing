package com.dailybriefing.calendar;

import com.dailybriefing.common.ApiException;
import jakarta.validation.constraints.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CalendarService {

  private final CalendarEventRepository events;
  private final Clock clock;

  public CalendarService(CalendarEventRepository events, Clock clock) {
    this.events = events;
    this.clock = clock;
  }

  public record Input(
    @NotBlank @Size(max = 120) String title,
    @NotNull LocalDate eventDate,
    LocalTime eventTime,
    @Size(max = 2000) String description,
    @Size(max = 200) String location
  ) {}

  public record View(
    UUID id,
    String title,
    LocalDate eventDate,
    LocalTime eventTime,
    String description,
    String location,
    long daysUntil
  ) {}

  private View view(CalendarEvent e) {
    return new View(
      e.id,
      e.title,
      e.eventDate,
      e.eventTime,
      e.description,
      e.location,
      ChronoUnit.DAYS.between(LocalDate.now(clock), e.eventDate)
    );
  }

  @Transactional(readOnly = true)
  public List<View> list(UUID user, LocalDate from, LocalDate to) {
    if (
      to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 366
    ) throw new ApiException(
      400,
      "DATE_RANGE",
      "조회 기간은 최대 366일이에요."
    );
    var result = events.range(user, from, to);
    if (result.size() > 500) throw new ApiException(
      400,
      "EVENT_LIMIT",
      "일정이 많아요. 조회 기간을 줄여 주세요."
    );
    return result.stream().map(this::view).toList();
  }

  @Transactional(readOnly = true)
  public List<View> upcoming(UUID user) {
    return events
      .upcoming(user, LocalDate.now(clock))
      .stream()
      .map(this::view)
      .toList();
  }

  @Transactional
  public View create(UUID user, Input input) {
    var e = new CalendarEvent();
    e.id = UUID.randomUUID();
    e.userId = user;
    e.createdAt = clock.instant();
    apply(e, input);
    events.save(e);
    return view(e);
  }

  @Transactional
  public View update(UUID user, UUID id, Input input) {
    var e = owned(user, id);
    apply(e, input);
    return view(e);
  }

  @Transactional
  public void delete(UUID user, UUID id) {
    events.delete(owned(user, id));
  }

  private CalendarEvent owned(UUID user, UUID id) {
    // id만으로 찾지 않아 다른 계정의 일정 존재 여부도 공개하지 않습니다.
    return events
      .findByIdAndUserId(id, user)
      .orElseThrow(() ->
        new ApiException(404, "EVENT_NOT_FOUND", "일정을 찾을 수 없어요.")
      );
  }

  private void apply(CalendarEvent e, Input in) {
    if (
      in.eventDate().getYear() < 1900 || in.eventDate().getYear() > 2200
    ) throw new ApiException(
      400,
      "EVENT_DATE",
      "1900~2200년 사이의 날짜를 선택해 주세요."
    );
    // 보관 정책으로 곧 사라질 일정을 신규 저장하지 않습니다. cutoff 당일은 허용합니다.
    if (
      in.eventDate().isBefore(LocalDate.now(clock).minusYears(2))
    ) throw new ApiException(
      400,
      "EVENT_RETENTION",
      "2년 이전 일정은 보관하지 않아요."
    );
    e.title = in.title().trim();
    e.eventDate = in.eventDate();
    e.eventTime = in.eventTime();
    e.description = in.description();
    e.location = in.location();
    e.updatedAt = clock.instant();
  }
}
