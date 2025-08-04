from flask import Flask, request, jsonify
from textblob import TextBlob

app = Flask(__name__)

@app.route("/analyze", methods=["POST"])
def analyze():
    news_list = request.get_json()
    combined_text = " ".join(news_list)
    sentiment = TextBlob(combined_text).sentiment.polarity
    if sentiment > 0:
        mood = "Positive"
    elif sentiment < 0:
        mood = "Negative"
    else:
        mood = "Neutral"
    return jsonify(mood)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)