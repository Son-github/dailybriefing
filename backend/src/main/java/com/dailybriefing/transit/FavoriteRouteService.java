package com.dailybriefing.transit;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoriteRouteService {

  private final FavoriteRouteRepository repository;
  private final UserRepository users;
  private final Clock clock;

  public FavoriteRouteService(
    FavoriteRouteRepository repository,
    UserRepository users,
    Clock clock
  ) {
    this.repository = repository;
    this.users = users;
    this.clock = clock;
  }

  public record Input(
    @NotBlank @Size(max = 30) String routeName,
    @NotNull @Valid MobilityModels.Place start,
    @NotNull @Valid MobilityModels.Place end
  ) {}

  public record Update(
    @Size(max = 30) String routeName,
    @Min(0) @Max(19) Integer displayOrder,
    @Valid MobilityModels.Place start,
    @Valid MobilityModels.Place end
  ) {}

  public record View(
    UUID id,
    String routeName,
    MobilityModels.Place start,
    MobilityModels.Place end,
    boolean needsLocation,
    int displayOrder,
    Instant createdAt,
    Instant updatedAt
  ) {}

  private View view(FavoriteRoute f) {
    boolean missing = f.startLatitude == null;
    return new View(
      f.id,
      f.routeName,
      missing
        ? null
        : new MobilityModels.Place(
            f.startPlaceId,
            f.startPlaceName,
            f.startAddress,
            f.startLatitude,
            f.startLongitude,
            MobilityModels.Source.SEARCH,
            null
          ),
      missing
        ? null
        : new MobilityModels.Place(
            f.endPlaceId,
            f.endPlaceName,
            f.endAddress,
            f.endLatitude,
            f.endLongitude,
            MobilityModels.Source.SEARCH,
            null
          ),
      missing,
      f.displayOrder,
      f.createdAt,
      f.updatedAt
    );
  }

  private static String name(String name) {
    if (
      name == null || name.trim().isEmpty() || name.trim().length() > 30
    ) throw new ApiException(
      400,
      "FAVORITE_NAME",
      "경로 이름을 1~30자로 입력해 주세요."
    );
    return name.trim();
  }

  private static void places(
    FavoriteRoute f,
    MobilityModels.Place start,
    MobilityModels.Place end
  ) {
    if (
      start.latitude().equals(end.latitude()) &&
      start.longitude().equals(end.longitude())
    ) throw new ApiException(
      400,
      "SAME_PLACE",
      "서로 다른 장소를 선택해 주세요."
    );
    f.startPlaceId = start.id();
    f.startPlaceName = start.name();
    f.startAddress = start.address();
    f.startLatitude = start.latitude();
    f.startLongitude = start.longitude();
    f.endPlaceId = end.id();
    f.endPlaceName = end.name();
    f.endAddress = end.address();
    f.endLatitude = end.latitude();
    f.endLongitude = end.longitude();
  }

  @Transactional(readOnly = true)
  public List<View> list(UUID user) {
    return repository
      .findByUserIdOrderByDisplayOrderAscCreatedAtAsc(user)
      .stream()
      .map(this::view)
      .toList();
  }

  @Transactional
  public View create(UUID user, Input in) {
    String routeName = name(in.routeName());
    users.lockedById(user).orElseThrow();
    var favorites = repository.findByUserIdOrderByDisplayOrderAscCreatedAtAsc(
      user
    );
    if (favorites.size() >= 20) throw new ApiException(
      400,
      "FAVORITE_LIMIT",
      "경로는 최대 20개까지 저장할 수 있어요."
    );
    if (
      favorites
        .stream()
        .anyMatch(
          f ->
            Objects.equals(f.startLatitude, in.start().latitude()) &&
            Objects.equals(f.startLongitude, in.start().longitude()) &&
            Objects.equals(f.endLatitude, in.end().latitude()) &&
            Objects.equals(f.endLongitude, in.end().longitude())
        )
    ) throw new ApiException(409, "FAVORITE_EXISTS", "이미 저장한 경로예요.");
    var f = new FavoriteRoute();
    f.id = UUID.randomUUID();
    f.userId = user;
    places(f, in.start(), in.end());
    f.routeName = routeName;
    f.displayOrder = favorites.size();
    f.createdAt = clock.instant();
    f.updatedAt = f.createdAt;
    repository.save(f);
    return view(f);
  }

  @Transactional
  public View update(UUID user, UUID id, Update in) {
    // 같은 계정의 동시 reorder/create/delete만 직렬화합니다. 다른 계정에는 영향을 주지 않습니다.
    users.lockedById(user).orElseThrow();
    var f = owned(user, id);
    if (in.routeName() != null) f.routeName = name(in.routeName());
    if ((in.start() == null) != (in.end() == null)) throw new ApiException(
      400,
      "PLACE_REQUIRED",
      "출발지와 도착지를 함께 선택해 주세요."
    );
    if (in.start() != null) places(f, in.start(), in.end());
    f.updatedAt = clock.instant();
    if (in.displayOrder() != null) {
      var all = repository.findByUserIdOrderByDisplayOrderAscCreatedAtAsc(user);
      if (in.displayOrder() >= all.size()) throw new ApiException(
        400,
        "FAVORITE_ORDER",
        "경로 순서를 확인해 주세요."
      );
      all.remove(f);
      all.add(in.displayOrder(), f);
      for (int i = 0; i < all.size(); i++) {
        all.get(i).displayOrder = i;
        all.get(i).updatedAt = clock.instant();
      }
    }
    return view(f);
  }

  @Transactional
  public void delete(UUID user, UUID id) {
    users.lockedById(user).orElseThrow();
    repository.delete(owned(user, id));
    repository.flush();
    var all = repository.findByUserIdOrderByDisplayOrderAscCreatedAtAsc(user);
    for (int i = 0; i < all.size(); i++) all.get(i).displayOrder = i;
  }

  private FavoriteRoute owned(UUID user, UUID id) {
    return repository
      .findByIdAndUserId(id, user)
      .orElseThrow(() ->
        new ApiException(
          404,
          "FAVORITE_NOT_FOUND",
          "저장한 경로를 찾을 수 없어요."
        )
      );
  }
}
