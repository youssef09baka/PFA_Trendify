import joblib
import pandas as pd

# Charger le modèle
model = joblib.load("models/trend_predictor.pkl")

# Nouvelle tendance à tester
new_trend = pd.DataFrame([
    {
        "num_comments": 400,
        "post_length": 320,
        "hour": 14,
        "title_length": 78,
        "sentiment": 0.80
    }
])

# Faire la prédiction
prediction = model.predict(new_trend)

# Afficher le résultat
print("Prediction:", prediction[0])