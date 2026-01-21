from fastapi import FastAPI
from app.schemas import SentimentBatchRequest, SentimentBatchResponse, SentimentItem
from app.sentiment.inference import predict_batch
from app.sentiment.bootstrap import download_model_if_needed

app = FastAPI(title="news-nlp-service", version="0.1.0")

@app.on_event("startup")
def on_startup():
    download_model_if_needed()

@app.get("/actuator/health")
def health():
    return {"status": "UP"}

@app.post("/nlp/sentiment:batch", response_model=SentimentBatchResponse)
def sentiment_batch(req: SentimentBatchRequest):
    preds = predict_batch(req.texts)
    results = [SentimentItem(label=lbl, score=score) for (lbl, score) in preds]
    return SentimentBatchResponse(results=results)
