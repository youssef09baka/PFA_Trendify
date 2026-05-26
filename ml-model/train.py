import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.model_selection import GridSearchCV
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

import joblib

# 🔥 1. Charger le dataset
data = pd.read_csv("data/Redit_data.csv")
print("\n🔥 DATASET SHAPE")
print(data.shape)

print("\n🔥 VIRAL DISTRIBUTION")
print(data["viral"].value_counts())

# 🔥 2. Choisir les features
X = data[
    [
        
        "num_comments",
        "post_length",
        "hour",
        "title_length",
        "sentiment"
    ]
]

# 🔥 3. Label à prédire
y = data["viral"]

# 🔥 4. Split train/test
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)
# 🔥 BASELINE MODEL
baseline_model = LogisticRegression(
    max_iter=1000,
    class_weight="balanced"
)

# 🔥 entraînement baseline
baseline_model.fit(X_train, y_train)

# 🔥 prédictions baseline
baseline_pred = baseline_model.predict(X_test)

# 🔥 accuracy baseline
baseline_accuracy = accuracy_score(y_test, baseline_pred)

print("\n🔥 LOGISTIC REGRESSION ACCURACY")
print(baseline_accuracy)
# 🔥 XGBOOST MODEL
xgb_model = XGBClassifier(
    n_estimators=100,
    random_state=42,
    eval_metric="logloss"
)

# 🔥 entraînement XGBoost
xgb_model.fit(X_train, y_train)

# 🔥 prédictions XGBoost
xgb_pred = xgb_model.predict(X_test)

# 🔥 accuracy XGBoost
xgb_accuracy = accuracy_score(y_test, xgb_pred)

print("\n🔥 XGBOOST ACCURACY")
print(xgb_accuracy)
# 🔥 5. Créer le modèle
# 🔥 RANDOM FOREST BASE MODEL
# 🔥 PIPELINE ML
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", RandomForestClassifier(random_state=42, class_weight="balanced"))
])

# 🔥 paramètres à tester
param_grid = {
    "model__n_estimators": [50, 100, 200],
    "model__max_depth": [None, 5, 10]
}

# 🔥 Grid Search Pipeline
grid_search = GridSearchCV(
    estimator=pipeline,
    param_grid=param_grid,
    cv=3,
    scoring="f1",
    n_jobs=-1
)

# 🔥 entraînement
grid_search.fit(X_train, y_train)

# 🔥 meilleur pipeline
model = grid_search.best_estimator_

print("\n🔥 BEST PARAMETERS")
print(grid_search.best_params_)

# 🔥 6. Entraîner le modèle
model.fit(X_train, y_train)

# 🔥 7. Faire les prédictions
y_pred = model.predict(X_test)

# 🔥 8. Accuracy
accuracy = accuracy_score(y_test, y_pred)

print("\n🔥 ACCURACY")
print(accuracy)

# 🔥 9. Classification report
print("\n🔥 CLASSIFICATION REPORT")
print(classification_report(y_test, y_pred))

# 🔥 10. Confusion matrix
print("\n🔥 CONFUSION MATRIX")
print(confusion_matrix(y_test, y_pred))

# 🔥 11. Sauvegarder le modèle
joblib.dump(model, "models/trend_predictor.pkl")

print("\n✅ MODEL SAVED SUCCESSFULLY")

# 🔥 FEATURE IMPORTANCE

feature_names = X.columns

importances = model.named_steps["model"].feature_importances_

print("\n🔥 FEATURE IMPORTANCE")

for feature, importance in zip(feature_names, importances):
    print(f"{feature}: {importance:.4f}")