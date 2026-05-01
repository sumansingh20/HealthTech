from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import exp
from typing import Literal

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression


RiskLevel = Literal["low", "medium", "critical"]
ModelName = Literal["logistic-regression", "random-forest", "lstm"]


class VitalReading(BaseModel):
    patientId: str
    deviceId: str
    timestamp: str
    heartRate: float = Field(ge=0, le=250)
    spo2: float = Field(ge=0, le=100)
    systolic: float = Field(ge=0, le=300)
    diastolic: float = Field(ge=0, le=200)
    temperature: float = Field(ge=30, le=45)


class PredictionRequest(BaseModel):
    reading: VitalReading
    history: list[VitalReading] = Field(default_factory=list)
    model: ModelName = "random-forest"


class PredictionResponse(BaseModel):
    patientId: str
    timestamp: str
    riskLevel: RiskLevel
    probability: float
    model: ModelName
    explanation: list[str]
    recommendations: list[str]


@dataclass(frozen=True)
class ClinicalFeature:
    name: str
    value: float
    contribution: float


def feature_vector(reading: VitalReading) -> np.ndarray:
    pulse_pressure = reading.systolic - reading.diastolic
    shock_index = reading.heartRate / max(reading.systolic, 1)
    oxygen_deficit = max(0.0, 94 - reading.spo2)
    temp_delta = abs(reading.temperature - 37.0)
    return np.array([[reading.heartRate, reading.spo2, reading.systolic, reading.diastolic, pulse_pressure, shock_index, oxygen_deficit, temp_delta]])


def synthetic_training_set() -> tuple[np.ndarray, np.ndarray]:
    rows: list[list[float]] = []
    labels: list[int] = []
    rng = np.random.default_rng(42)

    for _ in range(1600):
        hr = rng.normal(82, 22)
        spo2 = rng.normal(95, 4.5)
        systolic = rng.normal(124, 24)
        diastolic = rng.normal(74, 14)
        temp = rng.normal(37.1, 0.9)
        pulse_pressure = systolic - diastolic
        shock_index = hr / max(systolic, 1)
        oxygen_deficit = max(0, 94 - spo2)
        temp_delta = abs(temp - 37.0)
        risk = (
            (spo2 < 90) * 2.2
            + (systolic < 90) * 2.0
            + (hr > 125 or hr < 48) * 1.7
            + (temp > 38.6 or temp < 35.5) * 1.2
            + max(0, shock_index - 0.9) * 2.0
            + rng.normal(0, 0.2)
        )
        rows.append([hr, spo2, systolic, diastolic, pulse_pressure, shock_index, oxygen_deficit, temp_delta])
        labels.append(1 if risk > 1.8 else 0)

    return np.array(rows), np.array(labels)


X_TRAIN, Y_TRAIN = synthetic_training_set()
LOGISTIC = LogisticRegression(max_iter=600).fit(X_TRAIN, Y_TRAIN)
FOREST = RandomForestClassifier(n_estimators=80, max_depth=7, random_state=7, class_weight="balanced").fit(X_TRAIN, Y_TRAIN)


def probability_to_level(probability: float) -> RiskLevel:
    if probability >= 0.67:
        return "critical"
    if probability >= 0.34:
        return "medium"
    return "low"


def logistic_probability(reading: VitalReading) -> float:
    return float(LOGISTIC.predict_proba(feature_vector(reading))[0][1])


def forest_probability(reading: VitalReading) -> float:
    return float(FOREST.predict_proba(feature_vector(reading))[0][1])


def lstm_like_probability(history: list[VitalReading], reading: VitalReading) -> float:
    series = [*history[-11:], reading]
    if len(series) < 2:
        return forest_probability(reading)

    first, last = series[0], series[-1]
    spo2_slope = first.spo2 - last.spo2
    pressure_slope = first.systolic - last.systolic
    hr_slope = last.heartRate - first.heartRate
    temp_slope = last.temperature - first.temperature
    raw = -2.1 + 0.23 * spo2_slope + 0.052 * pressure_slope + 0.034 * hr_slope + 0.78 * temp_slope
    trend_probability = 1 / (1 + exp(-raw))
    return float(0.58 * trend_probability + 0.42 * forest_probability(reading))


def explanations(reading: VitalReading, probability: float) -> list[str]:
    items: list[ClinicalFeature] = [
        ClinicalFeature("oxygen saturation", reading.spo2, max(0, 92 - reading.spo2) * 0.08),
        ClinicalFeature("systolic pressure", reading.systolic, max(0, 92 - reading.systolic) * 0.05),
        ClinicalFeature("heart rate", reading.heartRate, max(0, reading.heartRate - 115) * 0.025 + max(0, 52 - reading.heartRate) * 0.03),
        ClinicalFeature("temperature", reading.temperature, max(0, reading.temperature - 38.2) * 0.24 + max(0, 36 - reading.temperature) * 0.22),
    ]
    ranked = sorted(items, key=lambda item: item.contribution, reverse=True)
    messages = [f"{item.name.title()} contributes to model risk (value={item.value:.1f})." for item in ranked if item.contribution > 0]
    if probability >= 0.67:
        messages.insert(0, "Model ensemble indicates high deterioration risk within the next care window.")
    elif not messages:
        messages.append("Vitals are within trained low-risk envelopes with no dominant anomaly.")
    return messages[:4]


def recommendations(reading: VitalReading, level: RiskLevel) -> list[str]:
    recs: list[str] = []
    if reading.spo2 < 92:
        recs.append("Validate probe placement, airway status, oxygen delivery, and respiratory therapy escalation.")
    if reading.systolic < 90 or reading.diastolic < 50:
        recs.append("Assess perfusion, fluid balance, vasopressor plan, and recent medication changes.")
    if reading.heartRate > 120 or reading.heartRate < 50:
        recs.append("Review rhythm strip, pain or sedation state, electrolytes, and escalation protocol.")
    if reading.temperature > 38.5 or reading.temperature < 36:
        recs.append("Recheck core temperature and evaluate sepsis, warming, or cooling interventions.")
    if not recs:
        recs.append("Continue current monitoring plan and trend review.")
    if level == "critical":
        recs.append("Trigger bedside clinician review and prepare emergency mode workflow.")
    return recs


app = FastAPI(
    title="AI ICU ML Prediction Service",
    version="1.0.0",
    description="Predicts deterioration risk using logistic regression, random forest, and LSTM-style temporal scoring.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "ml-service", "status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    if request.model == "logistic-regression":
        probability = logistic_probability(request.reading)
    elif request.model == "lstm":
        probability = lstm_like_probability(request.history, request.reading)
    else:
        probability = forest_probability(request.reading)

    probability = round(max(0.0, min(1.0, probability)), 3)
    level = probability_to_level(probability)
    return PredictionResponse(
        patientId=request.reading.patientId,
        timestamp=datetime.now(timezone.utc).isoformat(),
        riskLevel=level,
        probability=probability,
        model=request.model,
        explanation=explanations(request.reading, probability),
        recommendations=recommendations(request.reading, level),
    )


@app.post("/anomaly")
def anomaly(reading: VitalReading) -> dict[str, object]:
    z_scores = {
        "heartRate": abs((reading.heartRate - 82) / 18),
        "spo2": abs((reading.spo2 - 96) / 2.8),
        "systolic": abs((reading.systolic - 124) / 18),
        "temperature": abs((reading.temperature - 37) / 0.7),
    }
    score = max(z_scores.values())
    return {
        "patientId": reading.patientId,
        "isAnomaly": score >= 2.4,
        "score": round(score, 2),
        "signals": z_scores,
    }
