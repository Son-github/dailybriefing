# 1단계: 빌드용 이미지
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# 프로젝트 파일 복사
COPY . .

# Gradle Wrapper로 빌드 (테스트 제외, 빠르게)
RUN ./gradlew clean build -x test --no-daemon

# 2단계: 실행용 이미지
FROM eclipse-temurin:21-jre
WORKDIR /app

# 빌드 결과 JAR 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
