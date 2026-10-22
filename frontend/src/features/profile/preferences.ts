import type { Profile } from "../../types";
export const locations = [
  { name: "서울", latitude: 37.5665, longitude: 126.978 },
  { name: "부산", latitude: 35.1796, longitude: 129.0756 },
  { name: "인천", latitude: 37.4563, longitude: 126.7052 },
  { name: "대구", latitude: 35.8714, longitude: 128.6014 },
  { name: "제주", latitude: 33.4996, longitude: 126.5312 },
];
export function profileBody(user: Profile) {
  const {
    nickname,
    locationName,
    latitude,
    longitude,
    theme,
    onboarded,
    categories,
    keywords,
  } = user;
  return {
    nickname,
    locationName,
    latitude,
    longitude,
    theme,
    onboarded,
    categories,
    keywords,
  };
}
