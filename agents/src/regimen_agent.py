from __future__ import annotations

from typing import Any


class RegimenAgent:
    def handle_extract_regimen(self, payload: dict[str, Any]) -> dict[str, Any]:
        image_urls = payload.get("imageUrls", [])
        patient_id = payload.get("patientId", "")
        # Demo-safe deterministic response shape matching PRD contract.
        return {
            "type": "regimen_extracted",
            "patientId": patient_id,
            "regimenId": f"reg_{abs(hash(str(image_urls))) % 10_000_000}",
            "extractionPath": "gemma_fallback",
            "confidence": 0.91,
            "medications": [
                {
                    "drugName": "Furosemide",
                    "rxNormCode": "4603",
                    "dose": "40 mg",
                    "frequency": "twice daily",
                    "schedule": ["08:00", "20:00"],
                    "instructions": "Take with food",
                    "duration": "ongoing",
                    "indication": "diuretic",
                    "sourceConfidence": 0.95,
                }
            ],
            "discrepancies": [],
            "followUps": [
                {"type": "cardiology", "daysFromDischarge": 7},
                {"type": "pcp", "daysFromDischarge": 14},
            ],
        }
