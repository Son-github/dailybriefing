FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# 빌드된 JAR 복사
ARG JAR_FILE=build/libs/exchange-service-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar

# 환경변수 파일 로딩을 위한 run-time shell 사용
ENTRYPOINT ["sh", "-c", "java -jar -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE} app.jar"]
