from flask import Flask, request, jsonify
import joblib
import pandas as pd

# Créer l'application Flask
app = Flask(__name__)

# Charger le modèle ML
model = joblib.load("models/trend_predictor.pkl")

# Route de prédiction
@app.route("/predict", methods=["POST"])
@app.route("/predict", methods=["POST"])
def predict():

    try:

        # Récupérer les données JSON
        data = request.json

        # Vérifier les champs requis
        required_fields = [
            "reddit_score",
            "comments_count",
            "google_trend_score",
            "engagement_rate",
            "growth_rate",
            "sentiment_score"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({
                    "error": f"Missing field: {field}"
                }), 400

        # Transformer les données
        input_data = pd.DataFrame([{
            "reddit_score": data["reddit_score"],
            "comments_count": data["comments_count"],
            "google_trend_score": data["google_trend_score"],
            "engagement_rate": data["engagement_rate"],
            "growth_rate": data["growth_rate"],
            "sentiment_score": data["sentiment_score"]
        }])

        # Faire la prédiction
        prediction = model.predict(input_data)

        # Retourner le résultat
        return jsonify({
            "prediction": prediction[0]
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

# Lancer le serveur
if __name__ == "__main__":
    app.run(port=5000)
