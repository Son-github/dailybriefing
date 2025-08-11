from flask import Flask, request, jsonify
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = Flask(__name__)

MODEL_NAME = "beomi/KcELECTRA-base-v2022-finetuned-sentiment"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# 모델 로드
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(DEVICE)
model.eval()

# 레이블 매핑
if hasattr(model.config, "id2label") and model.config.id2label:
    id2label = {int(k): v for k, v in model.config.id2label.items()}
else:
    id2label = {0: "Negative", 1: "Positive", 2: "Neutral"}

def predict_sentiment(text: str):
    """감성 레이블과 확률 점수 반환"""
    inputs = tokenizer(
        text[:512],
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256
    ).to(DEVICE)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)
        score, pred_id = torch.max(probs, dim=1)

    sentiment = id2label.get(pred_id.item(), "Neutral")
    return sentiment, float(score.item())

@app.route("/analyze-news", methods=["POST"])
def analyze_news():
    """
    JSON 예시:
    {
        "title": "삼성전자 주가 급등",
        "content": "2분기 영업이익 50% 증가"
    }
    """
    data = request.get_json()
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    text = f"{title} {content}"

    sentiment, score = predict_sentiment(text)
    return jsonify({
        "title": title,
        "sentiment": sentiment,
        "score": round(score, 4)  # 소수점 4자리까지
    })

@app.route("/analyze-news-multiple", methods=["POST"])
def analyze_news_multiple():
    """
    JSON 예시:
    [
        {"title": "삼성전자 주가 급등", "content": "2분기 영업이익 50% 증가"},
        {"title": "태풍 피해로 농작물 전멸", "content": "농작물 전멸로 농민 피해 심각"}
    ]
    """
    news_list = request.get_json()
    results = []

    for item in news_list:
        title = (item.get("title") or "").strip()
        content = (item.get("content") or "").strip()
        text = f"{title} {content}"
        sentiment, score = predict_sentiment(text)
        results.append({
            "title": title,
            "sentiment": sentiment,
            "score": round(score, 4)
        })

    return jsonify({"results": results})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
