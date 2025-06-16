# 1단계: Build Stage
FROM gradle:8.4.0-jdk21 AS builder
WORKDIR /app
COPY . .
RUN gradle clean build -x test

# 2단계: Runtime Stage
FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

# Spring Boot 환경 변수 설정 (Docker Compose에서 주입됨)
ENV SPRING_PROFILES_ACTIVE=default

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]

