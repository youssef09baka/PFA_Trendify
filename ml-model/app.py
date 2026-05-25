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
            "num_comments",
            "post_length",
            "hour",
            "title_length",
            "sentiment"
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({
                    "error": f"Missing field: {field}"
                }), 400

        # Transformer les données
        input_data = pd.DataFrame([{
            "num_comments": data["num_comments"],
            "post_length": data["post_length"],
            "hour": data["hour"],
            "title_length": data["title_length"],
            "sentiment": data["sentiment"]
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
