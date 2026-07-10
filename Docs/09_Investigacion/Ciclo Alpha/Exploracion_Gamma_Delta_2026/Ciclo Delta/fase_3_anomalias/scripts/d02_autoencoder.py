import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import plotly.express as px

from _delta_utils import (
    AUTOENCODER_EPOCHS,
    AUTOENCODER_LATENT,
    FASE1_DATA_PROC,
    FASE3_MODELS,
    FASE3_OUTPUTS,
)

X_SCALED_PATH       = FASE1_DATA_PROC / "X_scaled.parquet"
READINGS_DELTA_PATH = FASE1_DATA_PROC / "readings_delta.parquet"
MODEL_OUT           = FASE3_MODELS / "autoencoder.pt"
ANOMALIAS_OUT       = FASE3_OUTPUTS / "anomalias_autoencoder.csv"
VIZ_OUT             = FASE3_OUTPUTS / "visualizaciones" / "reconstruction_error.html"

DEVICE = "cpu"
BATCH_SIZE = 256
N_FEATURES = 18


class Autoencoder(nn.Module):
    def __init__(self, n_features=N_FEATURES, latent_dim=AUTOENCODER_LATENT):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(n_features, 12), nn.ReLU(),
            nn.Linear(12, 8), nn.ReLU(),
            nn.Linear(8, latent_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 8), nn.ReLU(),
            nn.Linear(8, 12), nn.ReLU(),
            nn.Linear(12, n_features),
        )

    def forward(self, x):
        z = self.encoder(x)
        return self.decoder(z)


def train_autoencoder(X_train, n_features):
    model = Autoencoder(n_features=n_features).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    loss_fn = nn.MSELoss()

    X_tensor = torch.tensor(X_train, dtype=torch.float32).to(DEVICE)
    dataset = torch.utils.data.TensorDataset(X_tensor)
    loader = torch.utils.data.DataLoader(
        dataset, batch_size=BATCH_SIZE, shuffle=True
    )

    model.train()
    for epoch in range(AUTOENCODER_EPOCHS):
        total_loss = 0.0
        for (batch,) in loader:
            optimizer.zero_grad()
            recon = model(batch)
            loss = loss_fn(recon, batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if epoch % 10 == 0:
            print(f"Epoch {epoch}: loss={total_loss / len(loader):.6f}")

    return model


def main():
    df_scaled = pd.read_parquet(X_SCALED_PATH).dropna()
    X = df_scaled.to_numpy()

    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]

    model = train_autoencoder(X_train, n_features=X.shape[1])

    model.eval()
    with torch.no_grad():
        X_tensor_full = torch.tensor(X, dtype=torch.float32).to(DEVICE)
        recon_full = model(X_tensor_full).numpy()

    mse_per_row = np.mean((X - recon_full) ** 2, axis=1)

    with torch.no_grad():
        X_train_tensor = torch.tensor(X_train, dtype=torch.float32).to(DEVICE)
        recon_train = model(X_train_tensor).numpy()
    mse_train = np.mean((X_train - recon_train) ** 2, axis=1)
    umbral = np.percentile(mse_train, 95)
    print(f"Umbral de anomalia (percentil 95 train): {umbral:.6f}")

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), str(MODEL_OUT))

    df_readings = pd.read_parquet(READINGS_DELTA_PATH).dropna(
        subset=df_scaled.columns.tolist()
    ).reset_index(drop=True)
    df_readings["reconstruction_error"] = mse_per_row
    df_readings["anomaly_ae"] = (mse_per_row > umbral).astype(int)

    anomalias = df_readings[df_readings["anomaly_ae"] == 1]
    ANOMALIAS_OUT.parent.mkdir(parents=True, exist_ok=True)
    anomalias.to_csv(ANOMALIAS_OUT, index=False)
    print(f"Anomalias detectadas (autoencoder): {len(anomalias)} de "
          f"{len(df_readings)}")

    fig = px.histogram(
        df_readings, x="reconstruction_error", nbins=100,
        title="Distribucion del error de reconstruccion",
    )
    fig.add_vline(x=umbral, line_dash="dash", line_color="red")
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))


if __name__ == "__main__":
    main()
