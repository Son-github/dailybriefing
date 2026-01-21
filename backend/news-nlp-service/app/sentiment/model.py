import os
from typing import Optional
import numpy as np

_model = None

def load_model() -> Optional[object]:
    global _model
    if _model is not None:
        return _model

    model_dir = os.getenv("MODEL_LOCAL_DIR", "/models/sentiment")
    try:
        import tensorflow as tf
        if os.path.exists(model_dir) and os.listdir(model_dir):
            _model = tf.keras.models.load_model(model_dir)
            return _model
    except Exception:
        _model = None
        return None

    _model = None
    return None

def rule_based_score(text: str) -> float:
    pos = ["호재","급등","상승","개선","성장","회복","성공","강세","반등"]
    neg = ["악재","급락","하락","위기","불안","논란","사고","사망","침체","경고","제재"]
    score = 0
    for w in pos:
        if w in text:
            score += 1
    for w in neg:
        if w in text:
            score -= 1
    return float(1 / (1 + np.exp(-score)))
