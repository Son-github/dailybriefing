from pydantic import BaseModel
from typing import List

class SentimentBatchRequest(BaseModel):
    texts: List[str]

class SentimentItem(BaseModel):
    label: str   # POSITIVE | NEGATIVE | NEUTRAL
    score: float # 0~1

class SentimentBatchResponse(BaseModel):
    results: List[SentimentItem]
