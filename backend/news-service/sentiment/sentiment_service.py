from flask import Flask, request, jsonify
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = Flask(__name__)

MODEL_NAME = "beomi/KcELECTRA-base-v2022-finetuned-sentiment"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

id2label = model.config.id2label if hasattr(model.config, "id2label") else {0: "Negative", 1: "Positive", 2: "Neutral"}

def predict_sentiment(text: str):
    try:
        inputs = tokenizer(
            text[:512],
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            prediction = torch.argmax(logits, dim=1).item()
        return id2label.get(prediction, "Neutral")
    except Exception:
        return "Neutral"  # 오류 시 무조건 Neutral

@app.route("/analyze-multiple", methods=["POST"])
def analyze_multiple():
    news_list = request.get_json()
    results = []
    for item in news_list:
        combined_text = (item.get('title') or '') + " " + (item.get('content') or '')
        sentiment = predict_sentiment(combined_text)
        results.append({
            "title": item.get('title') or "",
            "link": item.get('link') or "",
            "sentiment": sentiment or "Neutral"
        })
    # Spring DTO 구조와 일치: topNews 감싸기
    return jsonify({ "topNews": results })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

