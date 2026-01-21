FROM python:3.11-slim

WORKDIR /app
RUN useradd -m appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN mkdir -p /models/sentiment && chown -R appuser:appuser /models
USER appuser

ENV PYTHONUNBUFFERED=1
ENV MODEL_LOCAL_DIR=/models/sentiment

EXPOSE 8090
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
