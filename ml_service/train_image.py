"""
Train EfficientNet-B0 for fake face detection.
Dataset: real-vs-fake-face (train/test/valid with fake/ real/ subfolders)

Usage:
    cd ml_service
    python train_image.py
"""

import os
import time
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import models, transforms, datasets
from sklearn.metrics import accuracy_score, classification_report

# Paths
DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets", "real-vs-fake-face")
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), "models", "image_model.pt")

# Hyperparameters
BATCH_SIZE = 64
EPOCHS = 5
LR = 1e-4
SUBSET_SIZE = 20000  # Use 20K images (10K fake + 10K real) for speed
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Data transforms
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def main():
    print(f"=== VeriTrue Image Model Training ===")
    print(f"Device: {DEVICE}")
    print(f"Epochs: {EPOCHS}, Batch: {BATCH_SIZE}, LR: {LR}")
    print(f"Subset: {SUBSET_SIZE} images")
    print()

    # ------- Load datasets -------
    train_dir = os.path.join(DATASET_DIR, "train")
    valid_dir = os.path.join(DATASET_DIR, "valid")
    test_dir = os.path.join(DATASET_DIR, "test")

    print(f"Loading training data from {train_dir}...")
    full_train_dataset = datasets.ImageFolder(root=train_dir, transform=train_transform)
    print(f"  Classes: {full_train_dataset.classes}")
    print(f"  Total images: {len(full_train_dataset)}")

    # Subsample for speed
    if len(full_train_dataset) > SUBSET_SIZE:
        indices = torch.randperm(len(full_train_dataset))[:SUBSET_SIZE].tolist()
        train_dataset = Subset(full_train_dataset, indices)
        print(f"  Using subset: {SUBSET_SIZE} images")
    else:
        train_dataset = full_train_dataset

    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True
    )

    # Validation
    val_dataset = None
    val_loader = None
    if os.path.exists(valid_dir):
        print(f"Loading validation data from {valid_dir}...")
        val_dataset = datasets.ImageFolder(root=valid_dir, transform=val_transform)
        # Subsample validation too for speed
        if len(val_dataset) > 2000:
            indices = torch.randperm(len(val_dataset))[:2000].tolist()
            val_dataset = Subset(val_dataset, indices)
        val_loader = DataLoader(
            val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True
        )
        val_size = len(val_dataset)
        print(f"  Validation images: {val_size}")

    # ------- Model -------
    print("\nLoading EfficientNet-B0 (pretrained)...")
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

    # Replace classifier head (2 classes: fake, real)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
    model.to(DEVICE)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    # ------- Training Loop -------
    print(f"\n{'='*50}")
    print("Starting training...")
    start_time = time.time()

    best_val_acc = 0.0

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for batch_idx, (images, labels) in enumerate(train_loader):
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)
            loss = criterion(outputs, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

            if (batch_idx + 1) % 20 == 0:
                elapsed = time.time() - start_time
                print(
                    f"  Epoch {epoch+1}/{EPOCHS} | Batch {batch_idx+1}/{len(train_loader)} | "
                    f"Loss: {loss.item():.4f} | Acc: {correct/total:.4f} | "
                    f"Time: {elapsed:.0f}s"
                )

        scheduler.step()
        avg_loss = total_loss / len(train_loader)
        train_acc = correct / total
        elapsed = time.time() - start_time
        print(
            f"Epoch {epoch+1}/{EPOCHS} — Loss: {avg_loss:.4f} | "
            f"Train Acc: {train_acc:.4f} | Time: {elapsed:.0f}s"
        )

        # Validation
        if val_loader:
            model.eval()
            val_preds, val_true = [], []
            with torch.no_grad():
                for images, labels in val_loader:
                    images = images.to(DEVICE)
                    outputs = model(images)
                    preds = torch.argmax(outputs, dim=1)
                    val_preds.extend(preds.cpu().tolist())
                    val_true.extend(labels.tolist())

            val_acc = accuracy_score(val_true, val_preds)
            print(f"  Val Acc: {val_acc:.4f}")

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                # Save best model
                os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
                torch.save(model.state_dict(), MODEL_SAVE_PATH)
                print(f"  ✓ Best model saved (val_acc={val_acc:.4f})")

    total_time = time.time() - start_time
    print(f"\n{'='*50}")
    print(f"Training complete in {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"Best Val Acc: {best_val_acc:.4f}")

    # Save final model if no validation was done
    if not val_loader:
        os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
        torch.save(model.state_dict(), MODEL_SAVE_PATH)
        print(f"Model saved to: {MODEL_SAVE_PATH}")

    # Final test evaluation
    if os.path.exists(test_dir):
        print("\nRunning test set evaluation...")
        test_dataset = datasets.ImageFolder(root=test_dir, transform=val_transform)
        if len(test_dataset) > 2000:
            indices = torch.randperm(len(test_dataset))[:2000].tolist()
            test_dataset = Subset(test_dataset, indices)
        test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)

        model.eval()
        test_preds, test_true = [], []
        with torch.no_grad():
            for images, labels in test_loader:
                images = images.to(DEVICE)
                outputs = model(images)
                preds = torch.argmax(outputs, dim=1)
                test_preds.extend(preds.cpu().tolist())
                test_true.extend(labels.tolist())

        print("\nTest Set Classification Report:")
        print(classification_report(test_true, test_preds, target_names=["fake", "real"]))

    print("Done!")


if __name__ == "__main__":
    main()
