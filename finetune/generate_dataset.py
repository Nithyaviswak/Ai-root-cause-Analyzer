"""Generate synthetic Q&A dataset for fine-tuning embeddings.

Plugin: https://github.com/run-llama/finetune-embedding
Uses Gemini API to generate hypothetical questions from incident documents.
"""

import json
import os
import sys
from pathlib import Path

# Add parent dir for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


def generate_synthetic_dataset():
    """Generate synthetic Q&A pairs from sample log data.
    
    Uses the approach from run-llama/finetune-embedding:
    1. Load corpus of incident text chunks
    2. For each chunk, generate hypothetical questions
    3. Save as training dataset
    """
    try:
        import google.generativeai as genai
    except ImportError:
        print("Install google-generativeai: pip install google-generativeai")
        return

    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        print("Set GOOGLE_API_KEY environment variable")
        print("Generating template dataset instead...")
        _generate_template_dataset()
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    # Load sample incident data as corpus
    corpus = _build_corpus()

    train_data = []
    val_data = []

    for i, chunk in enumerate(corpus):
        print(f"Processing chunk {i + 1}/{len(corpus)}...")

        prompt = f"""Given the following system incident log/data, generate 3 hypothetical questions 
that an SRE engineer might ask when investigating this incident. 
The questions should be specific and answerable from the data.

Data:
{chunk}

Return as JSON array of strings. Example: ["What service had the timeout?", "What was the error rate?"]"""

        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            questions = json.loads(text)

            for q in questions:
                pair = {"query": q, "positive": chunk}
                if i < len(corpus) * 0.8:
                    train_data.append(pair)
                else:
                    val_data.append(pair)

        except Exception as e:
            print(f"  Error generating questions: {e}")
            continue

    # Save datasets
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)

    with open(output_dir / "train_dataset.json", "w") as f:
        json.dump(train_data, f, indent=2)
    with open(output_dir / "val_dataset.json", "w") as f:
        json.dump(val_data, f, indent=2)

    print(f"Generated {len(train_data)} training pairs and {len(val_data)} validation pairs")


def _build_corpus() -> list[str]:
    """Build a corpus from sample data files."""
    corpus = []
    data_dir = Path(__file__).parent.parent / "data" / "sample"

    for fp in data_dir.glob("*.json"):
        with open(fp) as f:
            data = json.load(f)

        if isinstance(data, list):
            # Chunk into groups of 5
            for i in range(0, len(data), 5):
                chunk = json.dumps(data[i : i + 5], indent=2)
                corpus.append(chunk)

    return corpus


def _generate_template_dataset():
    """Generate a template dataset without API calls."""
    template_pairs = [
        {"query": "What caused the payment service timeout?", "positive": "payment-service ERROR Connection timeout to payment gateway stripe-prod-01 after 5000ms. Circuit breaker OPEN."},
        {"query": "Which services were affected during the outage?", "positive": "Cascading failure detected across payment-service, order-service, api-gateway. Payment processing completely halted."},
        {"query": "What was the root cause of the NAT gateway issue?", "positive": "AWS NAT Gateway degradation in us-east-1a causing external connectivity issues. External egress via NAT gateway nat-gw-prod-01 showing 78% packet loss."},
        {"query": "How was the incident resolved?", "positive": "Mitigation: Failover to NAT gateway in us-east-1b initiated. Connection to stripe-prod-01 restored. Circuit breaker CLOSED. Payment processing resuming."},
        {"query": "What was the MTTR for the incident?", "positive": "P1 Incident resolved. Total duration: 4 minutes 30 seconds. MTTR: 3 minutes. Payment service error rate normalized: 0.2%."},
        {"query": "What services experienced high CPU usage?", "positive": "order-service cpu_percent: 85.4, memory_percent: 89.2, request_latency_ms: 12000, error_rate_percent: 70.0"},
        {"query": "Were there any database connection issues?", "positive": "Database connection timeout: pool exhausted, 47 pending requests. Connection pool utilization at 89% (max: 100)."},
        {"query": "What error rate did the payment service reach?", "positive": "Payment service error rate exceeds threshold: 45% (threshold: 5%). Later reached 100% when circuit breaker opened."},
    ]

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)

    with open(output_dir / "train_dataset.json", "w") as f:
        json.dump(template_pairs[:6], f, indent=2)
    with open(output_dir / "val_dataset.json", "w") as f:
        json.dump(template_pairs[6:], f, indent=2)

    print(f"Template dataset generated in {output_dir}")


if __name__ == "__main__":
    generate_synthetic_dataset()
