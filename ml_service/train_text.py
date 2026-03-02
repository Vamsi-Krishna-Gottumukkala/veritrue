"""
Train DistilBERT for fake news detection.
Datasets: LIAR, LIAR-PLUS, Fake News (Fake.csv + True.csv)

Usage:
    cd ml_service
    python train_text.py
"""

import os
import sys
import time
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    get_linear_schedule_with_warmup,
)
from sklearn.metrics import accuracy_score, classification_report

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets")
MODEL_SAVE_DIR = os.path.join(os.path.dirname(__file__), "models", "text_model")

MAX_LEN = 128
BATCH_SIZE = 16
EPOCHS = 3
LR = 2e-5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

LIAR_LABEL_MAP = {
    "true": 1, "mostly-true": 1, "half-true": 1,
    "barely-true": 0, "false": 0, "pants-fire": 0,
}


class TextDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len):
        self.encodings = tokenizer(
            texts, truncation=True, max_length=max_len,
            padding="max_length", return_tensors="pt",
        )
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return {
            "input_ids": self.encodings["input_ids"][idx],
            "attention_mask": self.encodings["attention_mask"][idx],
            "labels": self.labels[idx],
        }


def load_liar(path, has_index=False):
    df = pd.read_csv(path, sep="\t", header=None, quoting=3, on_bad_lines="skip")
    if has_index:
        label_col, text_col = 2, 3
    else:
        label_col, text_col = 1, 2
    df = df[[label_col, text_col]].dropna()
    df.columns = ["label", "text"]
    df["label"] = df["label"].str.strip().str.lower()
    df = df[df["label"].isin(LIAR_LABEL_MAP)]
    df["label_int"] = df["label"].map(LIAR_LABEL_MAP)
    df["text"] = df["text"].astype(str)
    df = df[df["text"].str.len() > 10]
    return df["text"].tolist(), df["label_int"].tolist()


def main():
    print(f"=== VeriTrue Text Model Training ===")
    print(f"Device: {DEVICE}")
    print(f"Epochs: {EPOCHS}, Batch: {BATCH_SIZE}, LR: {LR}")
    print()

    all_texts, all_labels = [], []

    # LIAR
    liar_path = os.path.join(DATASET_DIR, "LIAR", "train.tsv")
    if os.path.exists(liar_path):
        print("Loading LIAR...")
        t, l = load_liar(liar_path, has_index=False)
        all_texts.extend(t)
        all_labels.extend(l)
        print(f"  {len(t)} samples")

    # LIAR-PLUS
    lp_path = os.path.join(DATASET_DIR, "LIAR-PLUS", "train2.tsv")
    if os.path.exists(lp_path):
        print("Loading LIAR-PLUS...")
        t, l = load_liar(lp_path, has_index=True)
        all_texts.extend(t)
        all_labels.extend(l)
        print(f"  {len(t)} samples")

    # Fake News CSVs (limit 5000 each for speed)
    fake_path = os.path.join(DATASET_DIR, "Fake News", "Fake.csv")
    true_path = os.path.join(DATASET_DIR, "Fake News", "True.csv")

    if os.path.exists(fake_path):
        print("Loading Fake.csv...")
        df = pd.read_csv(fake_path, nrows=5000, usecols=["text"])
        texts = df["text"].dropna().astype(str).str[:500].tolist()
        all_texts.extend(texts)
        all_labels.extend([0] * len(texts))
        print(f"  {len(texts)} fake samples")

    if os.path.exists(true_path):
        print("Loading True.csv...")
        df = pd.read_csv(true_path, nrows=5000, usecols=["text"])
        texts = df["text"].dropna().astype(str).str[:500].tolist()
        all_texts.extend(texts)
        all_labels.extend([1] * len(texts))
        print(f"  {len(texts)} real samples")

    print(f"\nTotal: {len(all_texts)} samples (Real: {sum(all_labels)}, Fake: {len(all_labels)-sum(all_labels)})")

    # Validation
    val_texts, val_labels = [], []
    val_path = os.path.join(DATASET_DIR, "LIAR", "valid.tsv")
    if os.path.exists(val_path):
        t, l = load_liar(val_path, has_index=False)
        val_texts.extend(t)
        val_labels.extend(l)
    print(f"Validation: {len(val_texts)} samples")

    # Tokenize
    print("\nTokenizing...")
    tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
    train_ds = TextDataset(all_texts, all_labels, tokenizer, MAX_LEN)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)

    val_loader = None
    if val_texts:
        val_ds = TextDataset(val_texts, val_labels, tokenizer, MAX_LEN)
        val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    print("Loading model...")
    model = DistilBertForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=2)
    model.to(DEVICE)

    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total_steps = len(train_loader) * EPOCHS
    scheduler = get_linear_schedule_with_warmup(optimizer, total_steps // 10, total_steps)

    print(f"\nTraining ({len(train_loader)} batches/epoch)...")
    start = time.time()

    for epoch in range(EPOCHS):
        model.train()
        total_loss = correct = total = 0

        for i, batch in enumerate(train_loader):
            ids = batch["input_ids"].to(DEVICE)
            mask = batch["attention_mask"].to(DEVICE)
            labels = batch["labels"].to(DEVICE)

            out = model(input_ids=ids, attention_mask=mask, labels=labels)
            loss = out.loss

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad()

            total_loss += loss.item()
            preds = torch.argmax(out.logits, dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

            if (i + 1) % 100 == 0:
                print(f"  E{epoch+1} B{i+1}/{len(train_loader)} loss={loss.item():.4f} acc={correct/total:.4f} t={time.time()-start:.0f}s")

        print(f"Epoch {epoch+1}/{EPOCHS} loss={total_loss/len(train_loader):.4f} acc={correct/total:.4f} t={time.time()-start:.0f}s")

        if val_loader:
            model.eval()
            vp, vt = [], []
            with torch.no_grad():
                for batch in val_loader:
                    ids = batch["input_ids"].to(DEVICE)
                    mask = batch["attention_mask"].to(DEVICE)
                    out = model(input_ids=ids, attention_mask=mask)
                    vp.extend(torch.argmax(out.logits, dim=1).cpu().tolist())
                    vt.extend(batch["labels"].tolist())
            print(f"  Val Acc: {accuracy_score(vt, vp):.4f}")

    print(f"\nDone in {time.time()-start:.0f}s")
    if val_loader:
        print(classification_report(vt, vp, target_names=["fake", "real"]))

    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
    model.save_pretrained(MODEL_SAVE_DIR)
    tokenizer.save_pretrained(MODEL_SAVE_DIR)
    print(f"Saved to {MODEL_SAVE_DIR}")


if __name__ == "__main__":
    main()
