import joblib
import pandas as pd

# Charger le modèle
model = joblib.load("models/trend_predictor.pkl")

# Nouvelle tendance à tester
new_trend = pd.DataFrame([
    {
        "reddit_score": 1300,
        "comments_count": 400,
        "google_trend_score": 88,
        "engagement_rate": 0.85,
        "growth_rate": 92,
        "sentiment_score": 0.80
    }
])

# Faire la prédiction
prediction = model.predict(new_trend)

# Afficher le résultat
print("Prediction:", prediction[0])