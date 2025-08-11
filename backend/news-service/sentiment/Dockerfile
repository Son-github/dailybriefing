FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 모델 캐싱을 원하면 미리 pull
# RUN python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification as M; M.from_pretrained('beomi/KcELECTRA-base-v2022-finetuned-sentiment');"

COPY sentiment_service.py .

# 운영: gunicorn 권장 (스레드 기반, 헬스체크/시그널 안전)
# gunicorn -w 2 -k gthread --threads 8 -b 0.0.0.0:5000 app:app
CMD ["python", "sentiment_service.py"]
