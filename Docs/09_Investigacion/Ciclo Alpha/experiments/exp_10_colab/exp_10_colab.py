"""
Exp 10-NN — Kittypau | Benchmark 4 redes neuronales en Google Colab
======================================================================
Entrena y compara 4 arquitecturas sobre datasets separados para Modelo A y Modelo B.

  NN-A  MLP profundo          (baseline tabular)
  NN-B  GRU bidireccional     (recurrente temporal)
  NN-C  TCN                   (convolucional temporal)
  NN-D  Transformer pequeño   (atención multi-cabeza + warmup lineal)

Uso en Colab:
  !python exp_10_colab.py

Datasets en Google Drive (mismo correo que Colab):
  Modelo A → DRIVE_FOLDER_ID_A  (binario: activo vs reposo)
  Modelo B → DRIVE_FOLDER_ID_B  (multiclase: alimentacion / servido / reposo)
"""

# ─────────────────────────────────────────────
# 0. Instalación de dependencias (Colab)
# ─────────────────────────────────────────────
import subprocess, sys

def _install_deps():
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "-q",
        "imbalanced-learn", "pyarrow", "pandas", "scikit-learn",
        "matplotlib", "google-api-python-client",
    ])

_install_deps()

# ─────────────────────────────────────────────
# 1. Imports
# ─────────────────────────────────────────────
import os, json, time, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.optim.lr_scheduler import (
    CosineAnnealingLR, ReduceLROnPlateau,
    OneCycleLR, CosineAnnealingWarmRestarts,
    LinearLR, SequentialLR,
)
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    f1_score, roc_auc_score, precision_score, recall_score,
    confusion_matrix, ConfusionMatrixDisplay, roc_curve,
)
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# 2. Configuración global
# ─────────────────────────────────────────────

# IDs de carpeta en Google Drive (mismo correo que Colab)
DRIVE_FOLDER_ID_A = "1EUTN-rAuZujoS8JXCwqTD0D54dXPkX_I"
DRIVE_FOLDER_ID_B = "1ZrTtyl8jKxkeWDxx0gT6OMvqj_G1B8UQ"

DATA_DIR_A  = "data_modelo_a"
DATA_DIR_B  = "data_modelo_b"
RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

FEATURES = [
    "weight_grams", "delta_w", "delta_w_10",
    "rolling_std_5", "rolling_std_10", "rolling_mean_5",
    "net_weight", "is_plateau", "plateau_duration",
    "hour_sin", "hour_cos", "clock_invalid",
    "cadencia_s",
]

CLASS_NAMES  = ["alimentacion", "servido", "reposo"]
SEED         = 42
DEVICE       = torch.device("cuda" if torch.cuda.is_available() else "cpu")
USE_AMP      = DEVICE.type == "cuda"
PIN_MEMORY   = DEVICE.type == "cuda"
NUM_WORKERS  = 2 if DEVICE.type == "cuda" else 0
SMOTE_TARGET = 378   # filas mínimas de servido en Modelo B

torch.manual_seed(SEED)
np.random.seed(SEED)

print(f"Device  : {DEVICE}")
print(f"AMP     : {USE_AMP}")
print(f"PyTorch : {torch.__version__}")

# ─────────────────────────────────────────────
# 3. Descarga desde Google Drive
# ─────────────────────────────────────────────
def _download_drive_folder(folder_id, output_dir):
    """Descarga todos los .parquet de una carpeta Drive usando la API autenticada de Colab."""
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from google.auth import default

    creds, _ = default()
    service  = build("drive", "v3", credentials=creds)

    results = service.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        fields="files(id, name)",
    ).execute()
    files = [f for f in results.get("files", []) if f["name"].endswith(".parquet")]

    os.makedirs(output_dir, exist_ok=True)
    for f in files:
        fpath = os.path.join(output_dir, f["name"])
        if os.path.exists(fpath):
            print(f"  ↳ {f['name']} (ya existe, se omite)")
            continue
        req = service.files().get_media(fileId=f["id"])
        with open(fpath, "wb") as out:
            dl = MediaIoBaseDownload(out, req)
            done = False
            while not done:
                _, done = dl.next_chunk()
        print(f"  ✓ {f['name']}")


def setup_drive():
    """Autentica con Google y descarga los parquets de Modelo A y Modelo B."""
    try:
        from google.colab import auth
        auth.authenticate_user()
        print("\n[DRIVE] Autenticado con Google.")
    except ImportError:
        print("[DRIVE] No es entorno Colab — coloca los parquets manualmente en:")
        print(f"  {DATA_DIR_A}/  →  X_train.parquet, X_val.parquet, y_train.parquet, y_val.parquet")
        print(f"  {DATA_DIR_B}/  →  X_train.parquet, X_val.parquet, y_train.parquet, y_val.parquet")
        return

    print(f"\n[DRIVE] Descargando Modelo A (folder ID: {DRIVE_FOLDER_ID_A})...")
    _download_drive_folder(DRIVE_FOLDER_ID_A, DATA_DIR_A)

    print(f"\n[DRIVE] Descargando Modelo B (folder ID: {DRIVE_FOLDER_ID_B})...")
    _download_drive_folder(DRIVE_FOLDER_ID_B, DATA_DIR_B)

    print("[DRIVE] Descarga completa.\n")

# ─────────────────────────────────────────────
# 4. Carga de datos
# ─────────────────────────────────────────────
def _read_parquets(data_dir):
    X_tr  = pd.read_parquet(os.path.join(data_dir, "X_train.parquet"))[FEATURES].values.astype(np.float32)
    X_val = pd.read_parquet(os.path.join(data_dir, "X_val.parquet"))[FEATURES].values.astype(np.float32)
    y_tr  = pd.read_parquet(os.path.join(data_dir, "y_train.parquet")).values.ravel().astype(int)
    y_val = pd.read_parquet(os.path.join(data_dir, "y_val.parquet")).values.ravel().astype(int)
    return X_tr, X_val, y_tr, y_val


def load_data_a():
    """
    Modelo A — clasificador binario (activo=1 vs reposo=0).
    Acepta labels binarias (0/1) o multiclase (0/1/2 → deriva binario automáticamente).
    No aplica SMOTE; el desbalanceo se maneja con pos_weight en BCEWithLogitsLoss.
    """
    print("\n[DATA-A] Cargando parquets Modelo A...")
    X_tr, X_val, y_tr_raw, y_val_raw = _read_parquets(DATA_DIR_A)

    if 2 in np.unique(y_tr_raw):
        y_tr  = (y_tr_raw  != 2).astype(np.float32)   # activo = clases 0 y 1
        y_val = (y_val_raw != 2).astype(np.float32)
        print("  Labels multiclase detectadas → derivado binario (activo = clases 0 y 1)")
    else:
        y_tr  = y_tr_raw.astype(np.float32)
        y_val = y_val_raw.astype(np.float32)
        print("  Labels binarias (0=reposo, 1=activo)")

    n_pos = int(y_tr.sum())
    n_neg = int((y_tr == 0).sum())
    pos_weight = n_neg / max(n_pos, 1)
    print(f"  Train : {X_tr.shape}  |  activo={n_pos}  reposo={n_neg}  pos_weight={pos_weight:.3f}")
    print(f"  Val   : {X_val.shape}")

    scaler  = StandardScaler()
    X_tr_s  = scaler.fit_transform(X_tr).astype(np.float32)
    X_val_s = scaler.transform(X_val).astype(np.float32)

    return {
        "X_train": X_tr_s, "X_val": X_val_s,
        "y_train": y_tr,   "y_val": y_val,
        "scaler":  scaler, "pos_weight": float(pos_weight),
    }


def load_data_b():
    """
    Modelo B — clasificador multiclase (alimentacion=0 / servido=1 / reposo=2).
    Aplica SMOTE para aumentar servido hasta SMOTE_TARGET si hay pocas filas.
    """
    print("\n[DATA-B] Cargando parquets Modelo B...")
    X_tr, X_val, y_tr_raw, y_val_raw = _read_parquets(DATA_DIR_B)

    print(f"  Train raw : {X_tr.shape}  |  "
          f"alim={(y_tr_raw==0).sum()}  "
          f"serv={(y_tr_raw==1).sum()}  "
          f"rep={(y_tr_raw==2).sum()}")
    print(f"  Val       : {X_val.shape}")

    n_serv = int((y_tr_raw == 1).sum())
    if n_serv < SMOTE_TARGET:
        k = min(3, n_serv - 1)
        print(f"[DATA-B] SMOTE: servido {n_serv} → {SMOTE_TARGET} (k_neighbors={k})...")
        smote = SMOTE(k_neighbors=k, random_state=SEED, sampling_strategy={1: SMOTE_TARGET})
        X_aug, y_aug = smote.fit_resample(X_tr, y_tr_raw)
        print(f"  Train aumentado: {X_aug.shape}")
    else:
        X_aug, y_aug = X_tr, y_tr_raw
        print(f"  SMOTE no necesario (servido={n_serv} >= {SMOTE_TARGET})")

    scaler  = StandardScaler()
    X_tr_s  = scaler.fit_transform(X_aug).astype(np.float32)
    X_val_s = scaler.transform(X_val).astype(np.float32)

    return {
        "X_train": X_tr_s,  "X_val": X_val_s,
        "y_train": y_aug,   "y_val": y_val_raw,
        "scaler":  scaler,
    }

# ─────────────────────────────────────────────
# 5. Datasets PyTorch
# ─────────────────────────────────────────────
class TabularDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.from_numpy(X)
        self.y = torch.from_numpy(np.asarray(y))
    def __len__(self):        return len(self.X)
    def __getitem__(self, i): return self.X[i], self.y[i]


class SequenceDataset(Dataset):
    """Ventanas deslizantes con stride_tricks — sin copias de memoria."""
    def __init__(self, X, y, window=10):
        n, f    = X.shape
        shape   = (n - window + 1, window, f)
        strides = (X.strides[0], X.strides[0], X.strides[1])
        seqs    = np.lib.stride_tricks.as_strided(X, shape=shape, strides=strides).copy()
        self.seqs   = torch.from_numpy(seqs.astype(np.float32))
        self.labels = torch.from_numpy(np.asarray(y[window - 1:]))
    def __len__(self):        return len(self.seqs)
    def __getitem__(self, i): return self.seqs[i], self.labels[i]


def make_class_weights(y, n_classes=3):
    counts  = np.bincount(y, minlength=n_classes).astype(np.float32)
    weights = counts.sum() / (n_classes * counts)
    return torch.tensor(weights, dtype=torch.float32, device=DEVICE)

# ─────────────────────────────────────────────
# 6. Arquitecturas
# ─────────────────────────────────────────────

# NN-A — MLP profundo
class MLP(nn.Module):
    def __init__(self, in_features, n_classes, dropout=0.3):
        super().__init__()
        dims   = [in_features, 256, 128, 64, 32]
        layers = []
        for i in range(len(dims) - 1):
            layers += [nn.Linear(dims[i], dims[i+1]), nn.BatchNorm1d(dims[i+1]),
                       nn.ReLU(), nn.Dropout(dropout)]
        self.backbone = nn.Sequential(*layers)
        self.head_a   = nn.Linear(32, 1)
        self.head_b   = nn.Linear(32, n_classes)
    def forward(self, x, task="b"):
        z = self.backbone(x)
        return self.head_a(z).squeeze(-1) if task == "a" else self.head_b(z)


# NN-B — GRU bidireccional
class BiGRU(nn.Module):
    def __init__(self, in_features, n_classes, hidden=128, layers=2, dropout=0.3):
        super().__init__()
        self.gru = nn.GRU(in_features, hidden, layers,
                          batch_first=True, bidirectional=True,
                          dropout=dropout if layers > 1 else 0.0)
        def _clf(out):
            return nn.Sequential(nn.Linear(hidden * 2, 64), nn.ReLU(),
                                 nn.Dropout(dropout), nn.Linear(64, out))
        self.classifier_a = _clf(1)
        self.classifier_b = _clf(n_classes)
    def forward(self, x, task="b"):
        z = self.gru(x)[0][:, -1, :]
        return self.classifier_a(z).squeeze(-1) if task == "a" else self.classifier_b(z)


# NN-C — TCN (Temporal Convolutional Network)
class _Chomp1d(nn.Module):
    def __init__(self, c): super().__init__(); self.c = c
    def forward(self, x): return x[:, :, :-self.c].contiguous()

class _TCNBlock(nn.Module):
    def __init__(self, in_ch, out_ch, kernel, dilation, dropout=0.2):
        super().__init__()
        pad = (kernel - 1) * dilation
        def _wn_conv(ic, oc):
            return nn.utils.weight_norm(
                nn.Conv1d(ic, oc, kernel, dilation=dilation, padding=pad))
        self.net = nn.Sequential(
            _wn_conv(in_ch,  out_ch), _Chomp1d(pad), nn.ReLU(), nn.Dropout(dropout),
            _wn_conv(out_ch, out_ch), _Chomp1d(pad), nn.ReLU(), nn.Dropout(dropout),
        )
        self.downsample = nn.Conv1d(in_ch, out_ch, 1) if in_ch != out_ch else None
        self.relu = nn.ReLU()
    def forward(self, x):
        res = x if self.downsample is None else self.downsample(x)
        return self.relu(self.net(x) + res)

class TCN(nn.Module):
    def __init__(self, in_features, n_classes, channels=None, kernel=3, dropout=0.2):
        super().__init__()
        channels  = channels or [64, 128, 128, 64]
        dilations = [2**i for i in range(len(channels))]
        layers    = [
            _TCNBlock(in_features if i == 0 else channels[i-1], ch, kernel, dil, dropout)
            for i, (ch, dil) in enumerate(zip(channels, dilations))
        ]
        self.backbone     = nn.Sequential(*layers)
        self.classifier_a = nn.Linear(channels[-1], 1)
        self.classifier_b = nn.Linear(channels[-1], n_classes)
    def forward(self, x, task="b"):
        z = self.backbone(x.permute(0, 2, 1))[:, :, -1]
        return self.classifier_a(z).squeeze(-1) if task == "a" else self.classifier_b(z)


# NN-D — Transformer pequeño
class _LearnedPE(nn.Module):
    def __init__(self, d_model, max_len=64):
        super().__init__()
        self.pe = nn.Parameter(torch.zeros(1, max_len, d_model))
    def forward(self, x): return x + self.pe[:, :x.size(1)]

class SmallTransformer(nn.Module):
    def __init__(self, in_features, n_classes, d_model=64, n_heads=4,
                 n_layers=3, d_ff=256, dropout=0.1):
        super().__init__()
        self.input_proj = nn.Linear(in_features, d_model)
        self.pos_enc    = _LearnedPE(d_model)
        enc_layer       = nn.TransformerEncoderLayer(
            d_model, n_heads, d_ff, dropout, batch_first=True)
        self.encoder    = nn.TransformerEncoder(enc_layer, num_layers=n_layers)
        self.classifier_a = nn.Linear(d_model, 1)
        self.classifier_b = nn.Linear(d_model, n_classes)
    def forward(self, x, task="b"):
        z = self.encoder(self.pos_enc(self.input_proj(x))).mean(dim=1)
        return self.classifier_a(z).squeeze(-1) if task == "a" else self.classifier_b(z)

# ─────────────────────────────────────────────
# 7. Scheduler factory
# ─────────────────────────────────────────────
def build_scheduler(opt, stype, loader_len, epochs, lr, warmup_epochs=0):
    """Devuelve (scheduler, sched_mode). sched_mode: 'epoch' | 'step' | 'metric' | 'none'."""
    if stype == "plateau":
        return ReduceLROnPlateau(opt, patience=5, factor=0.5), "metric"
    if stype == "onecycle":
        return OneCycleLR(opt, max_lr=lr * 10,
                          steps_per_epoch=loader_len, epochs=epochs), "step"

    if stype == "cosine":
        main = CosineAnnealingLR(opt, T_max=max(epochs - warmup_epochs, 1))
    elif stype == "warmrestart":
        main = CosineAnnealingWarmRestarts(opt, T_0=max(epochs - warmup_epochs, 20))
    else:
        return None, "none"

    if warmup_epochs > 0:
        warmup = LinearLR(opt, start_factor=1e-6, end_factor=1.0, total_iters=warmup_epochs)
        return SequentialLR(opt, schedulers=[warmup, main], milestones=[warmup_epochs]), "epoch"
    return main, "epoch"

# ─────────────────────────────────────────────
# 8. Entrenamiento y evaluación
# ─────────────────────────────────────────────
def find_best_threshold(probs, labels):
    best_t, best_f1 = 0.5, 0.0
    for t in np.arange(0.10, 0.61, 0.02):
        f1 = f1_score(labels, (probs >= t).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1, best_t = f1, float(t)
    return round(best_t, 2), round(best_f1, 4)


def train_one_epoch(model, loader, optimizer, task, loss_fn, amp_scaler, scheduler, sched_mode):
    model.train()
    total_loss = 0.0
    for X_b, y_b in loader:
        X_b = X_b.to(DEVICE, non_blocking=True)
        y_b = y_b.to(DEVICE, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)

        with torch.autocast(device_type=DEVICE.type, enabled=USE_AMP):
            out  = model(X_b, task=task)
            loss = loss_fn(out, y_b.float() if task == "a" else y_b.long())

        if USE_AMP:
            amp_scaler.scale(loss).backward()
            amp_scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            amp_scaler.step(optimizer)
            amp_scaler.update()
        else:
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

        if scheduler and sched_mode == "step":
            scheduler.step()
        total_loss += loss.item()

    if scheduler and sched_mode == "epoch":
        scheduler.step()
    return total_loss / len(loader)


@torch.no_grad()
def evaluate_a(model, loader):
    model.eval()
    probs_list, labels_list = [], []
    for X_b, y_b in loader:
        with torch.autocast(device_type=DEVICE.type, enabled=USE_AMP):
            out = torch.sigmoid(model(X_b.to(DEVICE, non_blocking=True), task="a"))
        probs_list.append(out.float().cpu().numpy())
        labels_list.append(y_b.numpy())
    probs  = np.concatenate(probs_list)
    labels = np.concatenate(labels_list)
    auc    = roc_auc_score(labels, probs)
    t_opt, f1_opt = find_best_threshold(probs, labels)
    preds  = (probs >= t_opt).astype(int)
    return {
        "auc":       round(float(auc), 4),
        "f1":        f1_opt,
        "threshold": t_opt,
        "precision": round(float(precision_score(labels, preds, zero_division=0)), 4),
        "recall":    round(float(recall_score(labels, preds, zero_division=0)), 4),
        "cm":        confusion_matrix(labels, preds).tolist(),
    }


@torch.no_grad()
def evaluate_b(model, loader):
    model.eval()
    preds_list, labels_list = [], []
    for X_b, y_b in loader:
        with torch.autocast(device_type=DEVICE.type, enabled=USE_AMP):
            out = model(X_b.to(DEVICE, non_blocking=True), task="b")
        preds_list.append(out.float().argmax(dim=-1).cpu().numpy())
        labels_list.append(y_b.numpy())
    preds   = np.concatenate(preds_list)
    labels  = np.concatenate(labels_list)
    per_cls = f1_score(labels, preds, average=None, labels=[0, 1, 2], zero_division=0)
    return {
        "macro_f1":        round(float(f1_score(labels, preds, average="macro", zero_division=0)), 4),
        "f1_alimentacion": round(float(per_cls[0]), 4),
        "f1_servido":      round(float(per_cls[1]), 4),
        "f1_reposo":       round(float(per_cls[2]), 4),
        "cm":              confusion_matrix(labels, preds, labels=[0, 1, 2]).tolist(),
    }


@torch.no_grad()
def _get_val_probs_a(model, loader):
    """Retorna (probs, labels) del val set — usado para graficar curvas ROC."""
    model.eval()
    probs_list, labels_list = [], []
    for X_b, y_b in loader:
        with torch.autocast(device_type=DEVICE.type, enabled=USE_AMP):
            out = torch.sigmoid(model(X_b.to(DEVICE, non_blocking=True), task="a"))
        probs_list.append(out.float().cpu().numpy())
        labels_list.append(y_b.numpy())
    return np.concatenate(probs_list), np.concatenate(labels_list)


def _run_task(model, loader_tr, loader_val, eval_fn, task, loss_fn,
              lr, stype, warmup_epochs, epochs, patience, key, label):
    """Entrena una tarea (A o B) con early stopping y AMP. Devuelve (best_metrics, epochs_run, history)."""
    amp_scaler     = torch.cuda.amp.GradScaler(enabled=USE_AMP)
    opt            = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    sched, smode   = build_scheduler(opt, stype, len(loader_tr), epochs, lr, warmup_epochs)

    monitor      = "f1" if task == "a" else "macro_f1"
    best_val     = 0.0
    wait         = 0
    best_metrics = None
    hist = {"train_loss": [], f"val_{monitor}": []}
    if task == "a": hist["val_auc"] = []
    else:           hist["val_f1_servido"] = []

    print(f"\n  [{task.upper()}] {label}")
    ep = 0
    for ep in range(1, epochs + 1):
        tr_loss = train_one_epoch(
            model, loader_tr, opt, task, loss_fn,
            amp_scaler, sched if smode != "metric" else None, smode,
        )
        val_m = eval_fn(model, loader_val)
        if smode == "metric":
            sched.step(val_m[monitor])

        hist["train_loss"].append(round(tr_loss, 5))
        hist[f"val_{monitor}"].append(val_m[monitor])
        if task == "a": hist["val_auc"].append(val_m["auc"])
        else:           hist["val_f1_servido"].append(val_m["f1_servido"])

        if val_m[monitor] > best_val:
            best_val, wait = val_m[monitor], 0
            best_metrics   = val_m
            torch.save(model.state_dict(),
                       os.path.join(RESULTS_DIR, f"{key}_best_{task}.pt"))
        else:
            wait += 1

        if ep % 10 == 0 or ep == 1 or wait >= patience:
            if task == "a":
                print(f"    Ep {ep:3d} | loss={tr_loss:.4f} | F1={val_m['f1']:.4f} | AUC={val_m['auc']:.4f}")
            else:
                print(f"    Ep {ep:3d} | loss={tr_loss:.4f} | MacroF1={val_m['macro_f1']:.4f} | F1_serv={val_m['f1_servido']:.4f}")

        if wait >= patience:
            print(f"    → Early stopping en epoch {ep}")
            break

    return best_metrics, ep, hist


def train_model(name, key, model, data_a, data_b, cfg):
    """
    Entrena las 4 arquitecturas sobre datasets separados para Modelo A y Modelo B.
    Devuelve (results_dict, roc_data_dict).
    """
    print(f"\n{'='*60}\n  {name}\n{'='*60}")

    is_seq   = cfg.get("sequential", False)
    window   = cfg.get("window", 10)
    bs       = cfg.get("batch_size", 256)
    epochs   = cfg.get("epochs", 100)
    patience = cfg.get("patience", 15)
    DL = dict(num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
              persistent_workers=NUM_WORKERS > 0)

    # Datasets independientes — Modelo A usa data_a, Modelo B usa data_b
    if is_seq:
        ds_tr_a  = SequenceDataset(data_a["X_train"], data_a["y_train"].astype(int), window)
        ds_val_a = SequenceDataset(data_a["X_val"],   data_a["y_val"].astype(int),   window)
        ds_tr_b  = SequenceDataset(data_b["X_train"], data_b["y_train"], window)
        ds_val_b = SequenceDataset(data_b["X_val"],   data_b["y_val"],   window)
    else:
        ds_tr_a  = TabularDataset(data_a["X_train"], data_a["y_train"].astype(int))
        ds_val_a = TabularDataset(data_a["X_val"],   data_a["y_val"].astype(int))
        ds_tr_b  = TabularDataset(data_b["X_train"], data_b["y_train"])
        ds_val_b = TabularDataset(data_b["X_val"],   data_b["y_val"])

    def _ldr(ds, shuffle):
        return DataLoader(ds, batch_size=bs if shuffle else bs * 2, shuffle=shuffle, **DL)

    loader_tr_a, loader_val_a = _ldr(ds_tr_a, True),  _ldr(ds_val_a, False)
    loader_tr_b, loader_val_b = _ldr(ds_tr_b, True),  _ldr(ds_val_b, False)

    model  = model.to(DEVICE)
    cw     = make_class_weights(data_b["y_train"])
    loss_a = nn.BCEWithLogitsLoss(
        pos_weight=torch.tensor(data_a["pos_weight"], device=DEVICE))
    loss_b = nn.CrossEntropyLoss(weight=cw)

    t_start = time.time()

    # ── Tarea A — binaria (activo vs reposo) ──────────────────────────
    best_a, ep_a, hist_a = _run_task(
        model, loader_tr_a, loader_val_a, evaluate_a, "a", loss_a,
        cfg.get("lr_a", 1e-3), cfg.get("scheduler", "cosine"),
        cfg.get("warmup_epochs_a", 0), epochs, patience,
        key, "Clasificador binario (activo vs reposo)",
    )

    # ── Tarea B — multiclase, inicializada desde el mejor backbone de A ──
    model.load_state_dict(torch.load(
        os.path.join(RESULTS_DIR, f"{key}_best_a.pt"),
        map_location=DEVICE, weights_only=True,
    ))
    best_b, ep_b, hist_b = _run_task(
        model, loader_tr_b, loader_val_b, evaluate_b, "b", loss_b,
        cfg.get("lr_b", 5e-4), cfg.get("scheduler", "cosine"),
        cfg.get("warmup_epochs_b", 0), epochs, patience,
        key, "Clasificador multiclase (alim / servido / reposo)",
    )

    # ── Probs finales para curva ROC (recarga best A) ─────────────────
    model.load_state_dict(torch.load(
        os.path.join(RESULTS_DIR, f"{key}_best_a.pt"),
        map_location=DEVICE, weights_only=True,
    ))
    roc_probs, roc_labels = _get_val_probs_a(model, loader_val_a)

    elapsed = round(time.time() - t_start, 1)
    results = {
        "modelo_a": {**best_a, "epochs": ep_a, "history": hist_a},
        "modelo_b": {**best_b, "epochs": ep_b, "history": hist_b},
        "tiempo_s": elapsed,
    }

    print(f"\n  ✓ {name} completado en {elapsed}s")
    print(f"    A → F1={best_a['f1']}  AUC={best_a['auc']}  thr={best_a['threshold']}")
    print(f"    B → MacroF1={best_b['macro_f1']}  F1_serv={best_b['f1_servido']}")

    del model
    if DEVICE.type == "cuda":
        torch.cuda.empty_cache()

    return results, {"probs": roc_probs, "labels": roc_labels}

# ─────────────────────────────────────────────
# 9. Reportes y visualizaciones
# ─────────────────────────────────────────────
def plot_curves(key, name, results):
    """Curvas de entrenamiento — 2×2 (A loss / A metrics / B loss / B metrics)."""
    hist_a = results["modelo_a"]["history"]
    hist_b = results["modelo_b"]["history"]

    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle(f"{name} — Curvas de entrenamiento", fontsize=14)

    axes[0, 0].plot(hist_a["train_loss"]);         axes[0, 0].set_title("A — Train loss")
    axes[0, 1].plot(hist_a["val_f1"],  label="F1")
    axes[0, 1].plot(hist_a["val_auc"], label="AUC")
    axes[0, 1].set_title("A — Val (F1 / AUC)");    axes[0, 1].legend()
    axes[1, 0].plot(hist_b["train_loss"]);         axes[1, 0].set_title("B — Train loss")
    axes[1, 1].plot(hist_b["val_macro_f1"],   label="MacroF1")
    axes[1, 1].plot(hist_b["val_f1_servido"], label="F1 servido")
    axes[1, 1].set_title("B — Val (MacroF1 / F1_serv)"); axes[1, 1].legend()

    for ax in axes.flat: ax.set_xlabel("Epoch")
    plt.tight_layout()
    path = os.path.join(RESULTS_DIR, f"training_curves_{key}.png")
    plt.savefig(path, dpi=100); plt.close()
    print(f"  Curvas guardadas: {path}")


def plot_all_cms_a(all_res, exp_order):
    """2×2 — Matrices de confusión Modelo A para las 4 arquitecturas."""
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    fig.suptitle("Modelo A — Matrices de confusión (reposo / activo)", fontsize=14)

    for ax, name in zip(axes.flat, exp_order):
        m  = all_res[name]["modelo_a"]
        cm = np.array(m["cm"])
        ConfusionMatrixDisplay(cm, display_labels=["reposo", "activo"]).plot(
            ax=ax, colorbar=False)
        ax.set_title(f"{name}\nF1={m['f1']}  AUC={m['auc']}  thr={m['threshold']}")

    plt.tight_layout()
    path = os.path.join(RESULTS_DIR, "cms_modelo_a.png")
    plt.savefig(path, dpi=100); plt.close()
    print(f"  CMs Modelo A: {path}")


def plot_all_cms_b(all_res, exp_order):
    """2×2 — Matrices de confusión Modelo B para las 4 arquitecturas."""
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))
    fig.suptitle("Modelo B — Matrices de confusión (alimentacion / servido / reposo)", fontsize=14)

    for ax, name in zip(axes.flat, exp_order):
        m  = all_res[name]["modelo_b"]
        cm = np.array(m["cm"])
        ConfusionMatrixDisplay(cm, display_labels=CLASS_NAMES).plot(
            ax=ax, colorbar=False)
        ax.set_title(f"{name}\nMacroF1={m['macro_f1']}  F1_serv={m['f1_servido']}")

    plt.tight_layout()
    path = os.path.join(RESULTS_DIR, "cms_modelo_b.png")
    plt.savefig(path, dpi=100); plt.close()
    print(f"  CMs Modelo B: {path}")


def plot_roc_curves(all_roc, exp_order):
    """Curvas ROC — Modelo A — las 4 arquitecturas en el mismo gráfico."""
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot([0, 1], [0, 1], "k--", lw=0.8, label="Aleatorio (AUC=0.50)")

    colors = plt.cm.tab10(np.linspace(0, 0.6, len(exp_order)))
    for name, color in zip(exp_order, colors):
        probs, labels = all_roc[name]["probs"], all_roc[name]["labels"]
        fpr, tpr, _   = roc_curve(labels, probs)
        auc           = roc_auc_score(labels, probs)
        ax.plot(fpr, tpr, lw=1.8, color=color, label=f"{name}  AUC={auc:.4f}")

    ax.set_xlabel("Tasa de Falsos Positivos")
    ax.set_ylabel("Tasa de Verdaderos Positivos")
    ax.set_title("Curvas ROC — Modelo A (activo vs reposo)")
    ax.legend(loc="lower right")
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    plt.tight_layout()
    path = os.path.join(RESULTS_DIR, "roc_curves_modelo_a.png")
    plt.savefig(path, dpi=100); plt.close()
    print(f"  ROC curves: {path}")


def plot_f1_comparison(all_res, exp_order):
    """Gráfico de barras agrupadas — comparación F1 por métrica y arquitectura."""
    metric_keys  = ["f1_activo_A", "auc_A", "f1_alim_B", "f1_serv_B", "macro_f1_B"]
    metric_labels = ["F1 activo\n(A)", "AUC-ROC\n(A)", "F1 alim\n(B)", "F1 serv\n(B)", "MacroF1\n(B)"]
    lgbm_vals     = [0.7619, 0.9205, 0.7606, 0.1395, 0.6312]

    all_names = ["LGBM Exp06"] + exp_order
    colors    = plt.cm.tab10(np.linspace(0, 1, len(all_names)))
    x         = np.arange(len(metric_keys))
    n         = len(all_names)
    width     = 0.8 / n

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.bar(x + width * (0 - n / 2 + 0.5), lgbm_vals,
           width, label="LGBM Exp06", color=colors[0], alpha=0.85)

    for i, name in enumerate(exp_order, start=1):
        ma = all_res[name]["modelo_a"]
        mb = all_res[name]["modelo_b"]
        vals = [ma["f1"], ma["auc"], mb["f1_alimentacion"], mb["f1_servido"], mb["macro_f1"]]
        ax.bar(x + width * (i - n / 2 + 0.5), vals,
               width, label=name, color=colors[i], alpha=0.85)

    ax.set_xticks(x); ax.set_xticklabels(metric_labels)
    ax.set_ylim(0, 1.08); ax.set_ylabel("Score")
    ax.set_title("Comparación de métricas — Exp 10-NN vs LGBM Exp06")
    ax.axhline(0.70, color="gray", linestyle=":", lw=0.9, label="Umbral 0.70")
    ax.legend(loc="upper right", fontsize=9)
    plt.tight_layout()
    path = os.path.join(RESULTS_DIR, "f1_comparison.png")
    plt.savefig(path, dpi=100); plt.close()
    print(f"  F1 comparison: {path}")


def plot_confusion_matrices(all_res, exp_order):
    """Mejor NN para Modelo A y mejor NN para Modelo B — en un solo plot."""
    best_a = max(exp_order, key=lambda n: all_res[n]["modelo_a"]["f1"])
    best_b = max(exp_order, key=lambda n: all_res[n]["modelo_b"]["macro_f1"])

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fig.suptitle("Confusion matrices — mejor NN en Modelo A y Modelo B", fontsize=13)

    ma = all_res[best_a]["modelo_a"]
    ConfusionMatrixDisplay(np.array(ma["cm"]),
                           display_labels=["reposo", "activo"]).plot(ax=axes[0], colorbar=False)
    axes[0].set_title(f"Modelo A — {best_a}\nF1={ma['f1']}  AUC={ma['auc']}")

    mb = all_res[best_b]["modelo_b"]
    ConfusionMatrixDisplay(np.array(mb["cm"]),
                           display_labels=CLASS_NAMES).plot(ax=axes[1], colorbar=False)
    axes[1].set_title(f"Modelo B — {best_b}\nMacroF1={mb['macro_f1']}  F1_serv={mb['f1_servido']}")

    plt.tight_layout()
    path = os.path.join(RESULTS_DIR, "confusion_matrix_best.png")
    plt.savefig(path, dpi=100); plt.close()
    print(f"  CM best: {path}")


def save_text_report(all_res, exp_order):
    """Genera benchmark_report.txt con resumen completo de métricas."""
    sep = "─" * 72
    lines = [
        "=" * 72,
        "  Exp 10-NN — Benchmark Neuronal vs LightGBM Exp 06",
        "  Kittypau AIoT — Clasificación de alimentación felina",
        "=" * 72,
        "",
        "── MODELO A — Clasificador binario (activo vs reposo) ──────────────",
        f"{'Arquitectura':<22} {'F1':>8} {'AUC':>8} {'Thr':>6} {'Prec':>8} {'Rec':>8}",
        sep,
        f"{'LGBM Exp06':<22} {'0.7619':>8} {'0.9205':>8} {'0.20':>6} {'—':>8} {'—':>8}",
    ]
    for name in exp_order:
        m = all_res[name]["modelo_a"]
        lines.append(
            f"{name:<22} {m['f1']:>8.4f} {m['auc']:>8.4f} {m['threshold']:>6.2f}"
            f" {m['precision']:>8.4f} {m['recall']:>8.4f}"
        )

    lines += [
        "",
        "── MODELO B — Clasificador multiclase (alim / servido / reposo) ────",
        f"{'Arquitectura':<22} {'MacroF1':>9} {'F1 alim':>9} {'F1 serv':>9} {'F1 rep':>9}",
        sep,
        f"{'LGBM Exp06':<22} {'0.6312':>9} {'0.7606':>9} {'0.1395':>9} {'—':>9}",
    ]
    for name in exp_order:
        m = all_res[name]["modelo_b"]
        lines.append(
            f"{name:<22} {m['macro_f1']:>9.4f} {m['f1_alimentacion']:>9.4f}"
            f" {m['f1_servido']:>9.4f} {m['f1_reposo']:>9.4f}"
        )

    lines += [
        "",
        "── TIEMPO DE ENTRENAMIENTO ─────────────────────────────────────────",
    ]
    for name in exp_order:
        lines.append(f"  {name}: {all_res[name]['tiempo_s']}s")

    path = os.path.join(RESULTS_DIR, "benchmark_report.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Reporte texto: {path}")

# ─────────────────────────────────────────────
# 10. Configuración de experimentos
# ─────────────────────────────────────────────
N_FEATURES = len(FEATURES)  # 13
N_CLASSES  = 3

EXPERIMENTS = [
    {
        "key":   "nn_a",
        "name":  "NN-A MLP",
        "model": MLP(N_FEATURES, N_CLASSES),
        "cfg": {
            "sequential": False,
            "batch_size": 512, "epochs": 100, "patience": 15,
            "lr_a": 1e-3, "lr_b": 5e-4,
            "scheduler": "cosine",
        },
    },
    {
        "key":   "nn_b",
        "name":  "NN-B GRU",
        "model": BiGRU(N_FEATURES, N_CLASSES),
        "cfg": {
            "sequential": True, "window": 10,
            "batch_size": 256, "epochs": 100, "patience": 15,
            "lr_a": 5e-4, "lr_b": 3e-4,
            "scheduler": "plateau",
        },
    },
    {
        "key":   "nn_c",
        "name":  "NN-C TCN",
        "model": TCN(N_FEATURES, N_CLASSES),
        "cfg": {
            "sequential": True, "window": 16,
            "batch_size": 256, "epochs": 80, "patience": 12,
            "lr_a": 1e-3, "lr_b": 5e-4,
            "scheduler": "onecycle",
        },
    },
    {
        "key":   "nn_d",
        "name":  "NN-D Transformer",
        "model": SmallTransformer(N_FEATURES, N_CLASSES),
        "cfg": {
            "sequential": True, "window": 16,
            "batch_size": 128, "epochs": 80, "patience": 12,
            "lr_a": 3e-4, "lr_b": 2e-4,
            "scheduler":       "warmrestart",
            "warmup_epochs_a": 1,
            "warmup_epochs_b": 1,
        },
    },
]

# ─────────────────────────────────────────────
# 11. Referencia LightGBM (Exp 06)
# ─────────────────────────────────────────────
LGBM_REF = {
    "name":            "LGBM Exp06",
    "f1_activo":       0.7619,
    "auc_roc":         0.9205,
    "threshold":       0.20,
    "f1_alimentacion": 0.7606,
    "f1_servido":      0.1395,
    "macro_f1":        0.6312,
    "epochs":          "25",
    "tiempo_s":        "—",
}

# ─────────────────────────────────────────────
# 12. Main
# ─────────────────────────────────────────────
def main():
    # 1. Descargar parquets desde Google Drive
    setup_drive()

    # 2. Cargar datos (una sola vez, compartido entre las 4 arquitecturas)
    data_a = load_data_a()
    data_b = load_data_b()

    all_res = {}
    all_roc = {}

    # 3. Entrenar cada arquitectura
    for exp in EXPERIMENTS:
        key, name, model, cfg = exp["key"], exp["name"], exp["model"], exp["cfg"]
        res, roc_data = train_model(name, key, model, data_a, data_b, cfg)
        all_res[name] = res
        all_roc[name] = roc_data

        json_path = os.path.join(RESULTS_DIR, f"{key}_results.json")
        with open(json_path, "w") as f:
            json.dump(res, f, indent=2, default=str)

        plot_curves(key, name, res)

    exp_order = [exp["name"] for exp in EXPERIMENTS]

    # 4. Reportes completos
    print("\n[REPORT] Generando reportes...")
    plot_all_cms_a(all_res, exp_order)           # cms_modelo_a.png
    plot_all_cms_b(all_res, exp_order)           # cms_modelo_b.png
    plot_roc_curves(all_roc, exp_order)          # roc_curves_modelo_a.png
    plot_f1_comparison(all_res, exp_order)       # f1_comparison.png
    plot_confusion_matrices(all_res, exp_order)  # confusion_matrix_best.png
    save_text_report(all_res, exp_order)         # benchmark_report.txt

    # 5. Benchmark summary CSV
    print("\n" + "=" * 70)
    print("  BENCHMARK — Exp 10-NN vs LightGBM Exp 06")
    print("=" * 70)

    rows = [LGBM_REF.copy()]
    for name, res in all_res.items():
        rows.append({
            "name":            name,
            "f1_activo":       res["modelo_a"]["f1"],
            "auc_roc":         res["modelo_a"]["auc"],
            "threshold":       res["modelo_a"]["threshold"],
            "f1_alimentacion": res["modelo_b"]["f1_alimentacion"],
            "f1_servido":      res["modelo_b"]["f1_servido"],
            "macro_f1":        res["modelo_b"]["macro_f1"],
            "epochs":          f"{res['modelo_a']['epochs']}+{res['modelo_b']['epochs']}",
            "tiempo_s":        res["tiempo_s"],
        })

    df = pd.DataFrame(rows).set_index("name")
    print(df.to_string())
    csv_path = os.path.join(RESULTS_DIR, "benchmark_summary.csv")
    df.to_csv(csv_path)
    print(f"\n  Tabla guardada: {csv_path}")

    # 6. Decisión automática
    ref = LGBM_REF
    print("\n" + "=" * 70)
    print("  DECISIÓN")
    print("=" * 70)

    scores = {}
    for name, res in all_res.items():
        wins = sum([
            res["modelo_a"]["f1"]              > ref["f1_activo"],
            res["modelo_a"]["auc"]             > ref["auc_roc"],
            res["modelo_b"]["f1_alimentacion"] > ref["f1_alimentacion"],
            res["modelo_b"]["f1_servido"]      > ref["f1_servido"],
            res["modelo_b"]["macro_f1"]        > ref["macro_f1"],
        ])
        scores[name] = wins
        print(f"  {name}: supera LGBM en {wins}/5 métricas")

    best_name = max(scores, key=scores.get)
    best_wins = scores[best_name]

    print()
    if best_wins >= 3:
        print(f"  GANADORA: {best_name} ({best_wins}/5 métricas)")
        print(f"     Candidata a reemplazar LGBM Exp 06 en produccion.")
        print(f"     Continuar con Exp 11: ajuste de hiperparametros.")
    elif best_wins >= 1:
        print(f"  MEJOR: {best_name} ({best_wins}/5 metricas).")
        print(f"     Evaluar ensemble NN + LGBM en Exp 11.")
    else:
        print(f"  Ninguna NN supera al LGBM Exp 06.")
        print(f"     LGBM Exp 06 permanece en produccion.")
        print(f"     Exp 11 enfocado en mas datos etiquetados.")

    print("\n  Archivos generados en:", os.path.abspath(RESULTS_DIR))
    print("  Descargar:")
    print("    benchmark_summary.csv    benchmark_report.txt")
    print("    nn_[a-d]_results.json    training_curves_nn_[a-d].png")
    print("    cms_modelo_a.png         cms_modelo_b.png")
    print("    roc_curves_modelo_a.png  f1_comparison.png")
    print("    confusion_matrix_best.png")


if __name__ == "__main__":
    main()
