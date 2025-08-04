FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY sentiment_service.py .
CMD ["python", "sentiment_service.py"]