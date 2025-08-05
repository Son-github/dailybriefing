from flask import Flask, request, jsonify
import torch
from transformers import BertTokenizer, BertForSequenceClassification

app = Flask(__name__)

# 모델 로드
MODEL_NAME = "monologg/kobert"
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
model = BertForSequenceClassification.from_pretrained(
    "beomi/kcbert-base",  # KoBERT 파인튜닝 버전 (긍/부정)
    num_labels=3
)
model.eval()

# 라벨 매핑
label_map = {0: "Negative", 1: "Neutral", 2: "Positive"}

def predict_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=64)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        prediction = torch.argmax(logits, dim=1).item()
    return label_map[prediction]

@app.route("/analyze-multiple", methods=["POST"])
def analyze_multiple():
    news_list = request.get_json()  # [{"title": "...", "link": "..."}]
    results = []
    for item in news_list:
        sentiment = predict_sentiment(item['title'])
        results.append({
            "title": item['title'],
            "link": item['link'],
            "sentiment": sentiment
        })
    return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
