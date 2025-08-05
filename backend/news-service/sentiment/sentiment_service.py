from flask import Flask, request, jsonify
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = Flask(__name__)

# 1) 모델/토크나이저 교체
MODEL_NAME = "beomi/KcELECTRA-base-v2022"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2  # 긍정/부정 2클래스
)
model.eval()

# 2) 라벨 매핑 (0=부정, 1=긍정)
label_map = {0: "Negative", 1: "Positive"}

def predict_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=256)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        prediction = torch.argmax(logits, dim=1).item()
    return label_map[prediction]

@app.route("/analyze/analyze-multiple", methods=["POST"])
def analyze_multiple():
    news_list = request.get_json()
    results = []
    for item in news_list:
        combined_text = (item.get('title') or '') + " " + (item.get('content') or '')
        sentiment = predict_sentiment(combined_text)
        results.append({
            "title": item['title'],
            "link": item['link'],
            "sentiment": sentiment
        })
    return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

