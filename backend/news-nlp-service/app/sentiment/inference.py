from typing import List, Tuple
from .model import load_model, rule_based_score

def to_label(p: float) -> str:
    if p >= 0.67:
        return "POSITIVE"
    if p <= 0.33:
        return "NEGATIVE"
    return "NEUTRAL"

def predict_batch(texts: List[str]) -> List[Tuple[str, float]]:
    model = load_model()

    # ✅ 모델 없으면 fallback
    if model is None:
        out = []
        for t in texts:
            p = rule_based_score(t or "")
            out.append((to_label(p), float(p)))
        return out

    # ✅ 실제 TF 모델을 붙일 경우(토크나이저/벡터라이저 포함 여부에 따라 구현이 달라짐)
    # 지금은 MVP 통합본이라 placeholder
    raise NotImplementedError(
        "TensorFlow model inference pipeline not implemented yet. "
        "Export a SavedModel that includes vectorization/tokenization or add tokenizer code."
    )
