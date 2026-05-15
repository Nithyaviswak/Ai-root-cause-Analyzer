"""Fine-tune embedding model for SRE-specific retrieval.

Plugin: https://github.com/run-llama/finetune-embedding
Uses sentence-transformers training API with MultipleNegativesRankingLoss.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


def finetune_embedding_model():
    """Fine-tune all-MiniLM-L6-v2 on incident data.
    
    Follows the run-llama/finetune-embedding approach:
    1. Load synthetic dataset
    2. Fine-tune using MultipleNegativesRankingLoss
    3. Evaluate with InformationRetrievalEvaluator
    4. Save fine-tuned model
    """
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from sentence_transformers.evaluation import InformationRetrievalEvaluator
    from torch.utils.data import DataLoader

    output_dir = Path(__file__).parent / "output"

    # Load dataset
    train_path = output_dir / "train_dataset.json"
    val_path = output_dir / "val_dataset.json"

    if not train_path.exists():
        print("Training dataset not found. Run generate_dataset.py first.")
        return

    with open(train_path) as f:
        train_data = json.load(f)
    with open(val_path) as f:
        val_data = json.load(f)

    print(f"Training samples: {len(train_data)}, Validation samples: {len(val_data)}")

    # Prepare training examples
    train_examples = [
        InputExample(texts=[item["query"], item["positive"]])
        for item in train_data
    ]

    # Load base model
    model_name = "all-MiniLM-L6-v2"
    print(f"Loading base model: {model_name}")
    model = SentenceTransformer(model_name)

    # Training configuration
    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=8)
    train_loss = losses.MultipleNegativesRankingLoss(model)

    # Prepare evaluator
    queries = {str(i): item["query"] for i, item in enumerate(val_data)}
    corpus = {str(i): item["positive"] for i, item in enumerate(val_data)}
    relevant_docs = {str(i): {str(i)} for i in range(len(val_data))}

    evaluator = InformationRetrievalEvaluator(
        queries=queries,
        corpus=corpus,
        relevant_docs=relevant_docs,
        name="sre-incident-eval",
    )

    # Fine-tune
    model_output = str(output_dir / "finetuned-model")
    print(f"Fine-tuning... Output: {model_output}")

    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=3,
        warmup_steps=10,
        output_path=model_output,
        show_progress_bar=True,
    )

    print(f"\nFine-tuned model saved to: {model_output}")
    print("Update FINETUNED_MODEL_PATH in .env to use this model.")


if __name__ == "__main__":
    finetune_embedding_model()
