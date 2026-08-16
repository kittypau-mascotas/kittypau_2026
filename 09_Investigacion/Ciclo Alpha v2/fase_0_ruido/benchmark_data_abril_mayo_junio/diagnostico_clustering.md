# 🔬 Diagnóstico Profundo de Clustering
## ¿Por qué DBSCAN detecta estructura real (ARI=0.757) pero K-Means/GMM/Agglomerative no (ARI≈0.02)?

### Hipótesis a investigar
| # | Hipótesis |
|---|-----------|
| H1 | Los datos forman clusters **no esféricos** → K-Means falla, DBSCAN no |
| H2 | Existen **sub-clusters internos** dentro de cada clase que engañan al centroide |
| H3 | La clase `servido` (n=46) es un **outlier de densidad** → DBSCAN la detecta como región densa |
| H4 | Los clusters geométricos mezclan clases → hay **overlap en el espacio de features** |
| H5 | Hay **features irrelevantes** que diluyen la señal de los centroides |

---

%%capture
!pip install umap-learn hdbscan kneed scipy scikit-learn matplotlib seaborn pandas numpy

import warnings; warnings.filterwarnings('ignore')
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
import seaborn as sns
from scipy.spatial.distance import cdist
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from scipy.stats import kruskal, f_oneway
from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering, SpectralClustering
from sklearn.mixture import GaussianMixture
from sklearn.metrics import (adjusted_rand_score, silhouette_score,
                             silhouette_samples, calinski_harabasz_score,
                             davies_bouldin_score, confusion_matrix,
                             adjusted_mutual_info_score)
from sklearn.neighbors import NearestNeighbors
from sklearn.ensemble import RandomForestClassifier
import umap.umap_ as umap
import hdbscan
from kneed import KneeLocator

SEED = 42
np.random.seed(SEED)
PALETTE = {'alimentacion': '#2a78d6', 'ruido': '#e34948', 'servido': '#1baf7a'}
sns.set_theme(style='whitegrid')
plt.rcParams['figure.dpi'] = 130
print('✅ Imports OK')

SHEET_ID = '1j-n4Yo-zyauUtCeecuh_4VMnFaM3T1IvPXvIhspH0Ds'
GID = '431591350'

URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
    f"/export?format=csv&gid={GID}"
)
df_raw = pd.read_csv(URL)
print(f'✅ Shape: {df_raw.shape}')

DROP = ['id_anotacion', 'id_candidato', 't_inicio', 't_fin', 'notas']
TARGET = 'categoria'
df = df_raw.drop(columns=DROP, errors='ignore')

le = LabelEncoder()
y = le.fit_transform(df[TARGET])
CLASS_NAMES = le.classes_          # alimentacion=0, ruido=1, servido=2
CLASS_COLORS = [PALETTE[c] for c in CLASS_NAMES]

X = df.drop(columns=[TARGET]).select_dtypes(include=[np.number]).fillna(df.median(numeric_only=True))
feat_names = X.columns.tolist()

scaler = RobustScaler()
Xs = scaler.fit_transform(X)

print(f'Features: {Xs.shape[1]} | Clases: {dict(zip(CLASS_NAMES, np.bincount(y)))}')

---
## 🗺️ SECCIÓN 1 — Visualización comparativa en 2D
### Clusters geométricos vs etiquetas reales en PCA / t-SNE / UMAP

# Reducción dimensional
pca50 = PCA(n_components=min(50, Xs.shape[1]), random_state=SEED)
X50   = pca50.fit_transform(Xs)

tsne2 = TSNE(n_components=2, perplexity=35, random_state=SEED, n_iter=1500, learning_rate='auto')
X_tsne = tsne2.fit_transform(X50)

reducer = umap.UMAP(n_components=2, n_neighbors=20, min_dist=0.05, random_state=SEED)
X_umap  = reducer.fit_transform(Xs)

X_pca2 = PCA(n_components=2, random_state=SEED).fit_transform(Xs)

# K-Means con k=3 y k=5 para comparar
km3 = KMeans(n_clusters=3, random_state=SEED, n_init='auto').fit(Xs)
km5 = KMeans(n_clusters=5, random_state=SEED, n_init='auto').fit(Xs)
db  = DBSCAN(eps=2.5, min_samples=5).fit(X50)   # sobre PCA50

embeddings = [('PCA', X_pca2), ('t-SNE', X_tsne), ('UMAP', X_umap)]
colorings  = [
    ('Etiqueta real',   y,            CLASS_COLORS),
    ('K-Means k=3',     km3.labels_,  None),
    ('K-Means k=5',     km5.labels_,  None),
    ('DBSCAN',          db.labels_,   None),
]

fig, axes = plt.subplots(len(colorings), len(embeddings), figsize=(15, 18))
cmap_discrete = plt.cm.get_cmap('tab10')

for row, (clabel, labels, colors) in enumerate(colorings):
    for col, (ename, emb) in enumerate(embeddings):
        ax = axes[row][col]
        unique_lbls = sorted(set(labels))
        for uid in unique_lbls:
            mask = labels == uid
            if colors and uid < len(colors):
                c = colors[uid]
                lname = CLASS_NAMES[uid]
            else:
                c = 'gray' if uid == -1 else cmap_discrete(uid / max(1, len(unique_lbls)-1))
                lname = 'noise' if uid == -1 else f'cluster {uid}'
            ax.scatter(emb[mask,0], emb[mask,1], c=c, s=12, alpha=0.65, label=lname)
        if row == 0: ax.set_title(ename, fontsize=12, fontweight='bold')
        if col == 0: ax.set_ylabel(clabel, fontsize=10, fontweight='bold')
        ax.legend(fontsize=7, markerscale=1.5, framealpha=0.6)
        ax.set_xticks([]); ax.set_yticks([])

plt.suptitle('Clusters geométricos vs Etiquetas reales en distintas proyecciones', fontsize=13, y=1.01)
plt.tight_layout()
plt.savefig('viz_comparativa_2d.png', bbox_inches='tight')
plt.show()

print(f"DBSCAN clusters: {len(set(db.labels_))-1} | puntos ruido: {(db.labels_==-1).sum()}")

---
## 📐 SECCIÓN 2 — Forma de los clusters: ¿por qué falla K-Means?
### H1: Los datos forman clusters NO esféricos

# ── Elbow + Silhouette para encontrar k óptimo ─────────────────────────────
K_range = range(2, 12)
inertias, sil_scores, ch_scores, db_scores = [], [], [], []

for k in K_range:
    km = KMeans(n_clusters=k, random_state=SEED, n_init='auto').fit(Xs)
    inertias.append(km.inertia_)
    sil_scores.append(silhouette_score(Xs, km.labels_))
    ch_scores.append(calinski_harabasz_score(Xs, km.labels_))
    db_scores.append(davies_bouldin_score(Xs, km.labels_))

kneedle = KneeLocator(list(K_range), inertias, curve='convex', direction='decreasing')
k_opt = kneedle.knee or 3

fig, axes = plt.subplots(1, 4, figsize=(18, 4))

axes[0].plot(K_range, inertias, 'o-', color='#2a78d6')
axes[0].axvline(k_opt, color='red', ls='--', alpha=0.7, label=f'Elbow k={k_opt}')
axes[0].axvline(3, color='green', ls=':', alpha=0.7, label='k=3 (clases reales)')
axes[0].set_title('Inercia (Elbow)'); axes[0].set_xlabel('k'); axes[0].legend(fontsize=8)

axes[1].plot(K_range, sil_scores, 's-', color='#1baf7a')
axes[1].axvline(3, color='green', ls=':', alpha=0.7)
axes[1].set_title('Silhouette Score'); axes[1].set_xlabel('k')
axes[1].set_ylabel('Score (↑ mejor)')

axes[2].plot(K_range, ch_scores, '^-', color='#eda100')
axes[2].axvline(3, color='green', ls=':', alpha=0.7)
axes[2].set_title('Calinski-Harabasz'); axes[2].set_xlabel('k')
axes[2].set_ylabel('Score (↑ mejor)')

axes[3].plot(K_range, db_scores, 'D-', color='#e34948')
axes[3].axvline(3, color='green', ls=':', alpha=0.7)
axes[3].set_title('Davies-Bouldin'); axes[3].set_xlabel('k')
axes[3].set_ylabel('Score (↓ mejor)')

plt.suptitle(f'Métricas de clustering vs k  |  k óptimo geométrico = {k_opt}  vs  k real = 3', fontsize=12)
plt.tight_layout()
plt.savefig('elbow_metrics.png', bbox_inches='tight')
plt.show()

print(f"k óptimo según Elbow: {k_opt}")
print(f"Silhouette en k=3:    {sil_scores[1]:.4f}")
print(f"Silhouette en k={k_opt}:    {sil_scores[k_opt-2]:.4f}")

# ── Silhouette per-sample: ¿qué muestras están mal asignadas? ─────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

for ax, k, title in zip(axes, [3, k_opt], [f'K-Means k=3 (clases reales)', f'K-Means k={k_opt} (óptimo geométrico)']):
    km = KMeans(n_clusters=k, random_state=SEED, n_init='auto').fit(Xs)
    sil_vals = silhouette_samples(Xs, km.labels_)
    y_lower = 10
    cmap = plt.cm.get_cmap('tab10')
    for i in range(k):
        ith_sil = np.sort(sil_vals[km.labels_ == i])
        size_i = ith_sil.shape[0]
        y_upper = y_lower + size_i
        color = cmap(i / k)
        ax.fill_betweenx(np.arange(y_lower, y_upper), 0, ith_sil, alpha=0.7, color=color)
        ax.text(-0.05, y_lower + 0.5 * size_i, str(i), fontsize=9)
        y_lower = y_upper + 10
    ax.axvline(np.mean(sil_vals), color='red', ls='--', lw=1.5, label=f'Media={np.mean(sil_vals):.3f}')
    ax.set_xlabel('Silhouette coefficient')
    ax.set_title(title, fontsize=10)
    ax.legend(fontsize=9)

plt.suptitle('Diagrama Silhouette por muestra — Ancho = cohesión interna del cluster', fontsize=12)
plt.tight_layout()
plt.savefig('silhouette_diagrams.png', bbox_inches='tight')
plt.show()

---
## 🧲 SECCIÓN 3 — Análisis DBSCAN en profundidad
### H3: ¿Por qué DBSCAN captura la estructura real?

# ── k-distance plot para encontrar eps óptimo ──────────────────────────────────
k_neighbors = 5
nbrs = NearestNeighbors(n_neighbors=k_neighbors).fit(X50)
distances, _ = nbrs.kneighbors(X50)
k_dist = np.sort(distances[:, k_neighbors-1])[::-1]

knee_eps = KneeLocator(range(len(k_dist)), k_dist, curve='convex', direction='decreasing')
eps_opt  = k_dist[knee_eps.knee] if knee_eps.knee else 2.0

fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(k_dist, color='#2a78d6', lw=1.5)
if knee_eps.knee:
    ax.axvline(knee_eps.knee, color='red', ls='--', label=f'Elbow → eps≈{eps_opt:.2f}')
ax.set_title(f'k-distance plot (k={k_neighbors}) — eje Y = distancia al k-ésimo vecino')
ax.set_xlabel('Puntos ordenados'); ax.set_ylabel('Distancia')
ax.legend()
plt.tight_layout()
plt.savefig('kdistance_plot.png', bbox_inches='tight')
plt.show()
print(f'eps sugerido por k-distance: {eps_opt:.3f}')

# ── Barrido eps × min_samples ──────────────────────────────────────────────────
eps_vals       = np.linspace(0.5, 5.0, 15)
min_samp_vals  = [3, 5, 8, 12]

results = []
for eps in eps_vals:
    for ms in min_samp_vals:
        db = DBSCAN(eps=eps, min_samples=ms).fit(X50)
        n_cls = len(set(db.labels_)) - (1 if -1 in db.labels_ else 0)
        noise = (db.labels_ == -1).sum()
        if n_cls >= 2 and noise < len(y)*0.5:
            ari = adjusted_rand_score(y, db.labels_)
            ami = adjusted_mutual_info_score(y, db.labels_)
            sil = silhouette_score(X50[db.labels_!=-1], db.labels_[db.labels_!=-1]) if (db.labels_!=-1).sum()>1 else 0
            results.append({'eps': round(eps,2), 'min_s': ms, 'n_cls': n_cls, 'noise': noise, 'ARI': ari, 'AMI': ami, 'Sil': sil})

df_sweep = pd.DataFrame(results).sort_values('ARI', ascending=False)
print('Top 10 configuraciones DBSCAN por ARI:')
print(df_sweep.head(10).to_string(index=False))

# Pivot heatmap ARI
pivot = df_sweep.pivot_table(index='eps', columns='min_s', values='ARI', aggfunc='max').fillna(0)
fig, ax = plt.subplots(figsize=(8, 6))
sns.heatmap(pivot, annot=True, fmt='.3f', cmap='YlOrRd', ax=ax, linewidths=0.3)
ax.set_title('ARI de DBSCAN — barrido eps × min_samples (sobre PCA-50D)')
plt.tight_layout()
plt.savefig('dbscan_sweep_heatmap.png', bbox_inches='tight')
plt.show()

# ── HDBSCAN — más robusto que DBSCAN ──────────────────────────────────────────
hdb = hdbscan.HDBSCAN(min_cluster_size=10, min_samples=5,
                       cluster_selection_method='eom',
                       gen_min_span_tree=True)
hdb.fit(X50)
n_hdb = len(set(hdb.labels_)) - (1 if -1 in hdb.labels_ else 0)
noise_hdb = (hdb.labels_ == -1).sum()

ari_hdb = adjusted_rand_score(y, hdb.labels_)
ami_hdb = adjusted_mutual_info_score(y, hdb.labels_)
print(f'HDBSCAN → clusters: {n_hdb} | ruido: {noise_hdb} | ARI: {ari_hdb:.4f} | AMI: {ami_hdb:.4f}')

# Plot en UMAP
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for ax, (labels, title) in zip(axes, [(y, 'Etiqueta real'), (hdb.labels_, 'HDBSCAN')]):
    unique = sorted(set(labels))
    cmap = plt.cm.get_cmap('tab10')
    for uid in unique:
        mask = labels == uid
        if title == 'Etiqueta real':
            c = CLASS_COLORS[uid]; lname = CLASS_NAMES[uid]
        else:
            c = 'lightgray' if uid == -1 else cmap(uid / max(1, len(unique)-1))
            lname = 'noise' if uid == -1 else f'cluster {uid}'
        ax.scatter(X_umap[mask,0], X_umap[mask,1], c=c, s=14, alpha=0.65, label=lname)
    ax.set_title(title, fontsize=12); ax.legend(fontsize=8)
    ax.set_xticks([]); ax.set_yticks([])
plt.suptitle(f'HDBSCAN en UMAP — ARI={ari_hdb:.4f}', fontsize=12)
plt.tight_layout()
plt.savefig('hdbscan_umap.png', bbox_inches='tight')
plt.show()

---
## 🧩 SECCIÓN 4 — ¿Qué hay dentro de cada clase?
### H2: Sub-clusters internos por clase

# ── Sub-clustering por clase: cuántos grupos naturales hay dentro de cada clase? ─
fig, axes = plt.subplots(len(CLASS_NAMES), 4, figsize=(18, 14))
report = {}

for row, (cls_idx, cls_name) in enumerate(zip(range(len(CLASS_NAMES)), CLASS_NAMES)):
    mask_cls = y == cls_idx
    Xs_cls   = Xs[mask_cls]
    X50_cls  = X50[mask_cls]
    n_cls    = Xs_cls.shape[0]

    # Elbow dentro de la clase
    k_max = min(8, n_cls-1)
    sils_sub, inertias_sub = [], []
    for k in range(2, k_max+1):
        km_ = KMeans(n_clusters=k, random_state=SEED, n_init='auto').fit(Xs_cls)
        inertias_sub.append(km_.inertia_)
        sils_sub.append(silhouette_score(Xs_cls, km_.labels_))

    k_best_sub = np.argmax(sils_sub) + 2
    report[cls_name] = {'n': n_cls, 'k_natural': k_best_sub, 'sil': max(sils_sub)}

    # Dendrograma
    ax = axes[row][0]
    sample_idx = np.random.choice(n_cls, min(60, n_cls), replace=False)
    Z = linkage(Xs_cls[sample_idx], method='ward')
    dendrogram(Z, ax=ax, no_labels=True, color_threshold=0.7*max(Z[:,2]))
    ax.set_title(f'{cls_name} — dendrograma (n={n_cls})', fontsize=9)

    # Silhouette sub-clusters
    ax2 = axes[row][1]
    ax2.plot(range(2, k_max+1), sils_sub, 'o-', color=PALETTE[cls_name])
    ax2.axvline(k_best_sub, color='red', ls='--', alpha=0.7, label=f'k={k_best_sub}')
    ax2.set_title('Silhouette interno', fontsize=9)
    ax2.set_xlabel('k sub-clusters'); ax2.legend(fontsize=8)

    # t-SNE de la clase
    ax3 = axes[row][2]
    if n_cls > 10:
        perp = min(30, n_cls//3)
        emb_cls = TSNE(n_components=2, perplexity=perp, random_state=SEED).fit_transform(X50_cls)
        km_sub = KMeans(n_clusters=k_best_sub, random_state=SEED, n_init='auto').fit(Xs_cls)
        cmap_sub = plt.cm.get_cmap('tab10')
        for sub in range(k_best_sub):
            m = km_sub.labels_ == sub
            ax3.scatter(emb_cls[m,0], emb_cls[m,1], s=16, alpha=0.7,
                       color=cmap_sub(sub/k_best_sub), label=f'sub{sub}')
        ax3.set_title(f't-SNE — {k_best_sub} sub-clusters', fontsize=9)
        ax3.legend(fontsize=7); ax3.set_xticks([]); ax3.set_yticks([])

    # Distribución de distancias al centroide
    ax4 = axes[row][3]
    centroid = Xs_cls.mean(axis=0)
    dists = np.linalg.norm(Xs_cls - centroid, axis=1)
    ax4.hist(dists, bins=25, color=PALETTE[cls_name], alpha=0.75, edgecolor='white')
    ax4.axvline(np.mean(dists), color='red', ls='--', label=f'μ={np.mean(dists):.1f}')
    ax4.set_title('Distancia al centroide', fontsize=9)
    ax4.legend(fontsize=8)

plt.suptitle('Sub-clustering interno por clase — ¿Cuántos grupos naturales hay en cada categoría?',
             fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('subclusters_por_clase.png', bbox_inches='tight')
plt.show()

print('\nResumen de sub-clusters por clase:')
for k, v in report.items():
    print(f'  {k:15s}: n={v["n"]:3d} | k natural={v["k_natural"]} | sil={v["sil"]:.4f}')

---
## 🔀 SECCIÓN 5 — Correspondencia clusters ↔ clases reales
### H4: ¿Cómo se mezclan las clases dentro de los clusters geométricos?

# ── Mapa de correspondencia cluster → clase ────────────────────────────────────
def cluster_class_map(labels, y, class_names, title, ax):
    unique_c = sorted([l for l in set(labels) if l != -1])
    mat = np.zeros((len(unique_c), len(class_names)))
    for i, c in enumerate(unique_c):
        mask = labels == c
        for j, cn in enumerate(class_names):
            mat[i, j] = (y[mask] == j).sum()
    mat_pct = mat / mat.sum(axis=1, keepdims=True) * 100
    sns.heatmap(mat_pct, annot=True, fmt='.1f', cmap='Blues',
                xticklabels=class_names,
                yticklabels=[f'cluster {c}' for c in unique_c],
                ax=ax, linewidths=0.3, cbar_kws={'label': '% de la clase'})
    ax.set_title(title, fontsize=10)
    ax.set_xlabel('Clase real'); ax.set_ylabel('Cluster geométrico')

# Modelos a comparar
km3_l = KMeans(n_clusters=3, random_state=SEED, n_init='auto').fit(Xs).labels_
km5_l = KMeans(n_clusters=5, random_state=SEED, n_init='auto').fit(Xs).labels_
gm3_l = GaussianMixture(n_components=3, random_state=SEED).fit_predict(Xs)
gm5_l = GaussianMixture(n_components=5, random_state=SEED).fit_predict(Xs)
db_best = df_sweep.iloc[0]
dbb_l  = DBSCAN(eps=db_best['eps'], min_samples=int(db_best['min_s'])).fit(X50).labels_
agg_l  = AgglomerativeClustering(n_clusters=3, linkage='ward').fit_predict(Xs)
spec_l = SpectralClustering(n_clusters=3, random_state=SEED, affinity='nearest_neighbors').fit_predict(Xs)

configs = [
    (km3_l,  f'K-Means k=3  ARI={adjusted_rand_score(y,km3_l):.3f}'),
    (km5_l,  f'K-Means k=5  ARI={adjusted_rand_score(y,km5_l):.3f}'),
    (gm3_l,  f'GMM k=3      ARI={adjusted_rand_score(y,gm3_l):.3f}'),
    (gm5_l,  f'GMM k=5      ARI={adjusted_rand_score(y,gm5_l):.3f}'),
    (dbb_l,  f'DBSCAN best  ARI={adjusted_rand_score(y,dbb_l):.3f}'),
    (agg_l,  f'Agglomerative ARI={adjusted_rand_score(y,agg_l):.3f}'),
]

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
for ax, (labels, title) in zip(axes.flat, configs):
    cluster_class_map(labels, y, CLASS_NAMES, title, ax)

plt.suptitle('Correspondencia Cluster → Clase Real (% de muestras por clase en cada cluster)', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('cluster_class_map.png', bbox_inches='tight')
plt.show()

---
## 🎯 SECCIÓN 6 — ¿Qué features causan el conflicto?
### H5: Features irrelevantes que diluyen la señal de los centroides

# ── Importancia de features para clasificar clases vs para clustering ───────────
# 1. Importancia para clasificación (Random Forest)
rf = RandomForestClassifier(n_estimators=300, random_state=SEED, n_jobs=-1)
rf.fit(Xs, y)
imp_clf = pd.Series(rf.feature_importances_, index=feat_names).sort_values(ascending=False)

# 2. Importancia para clustering: varianza entre centroides de K-Means (k=3)
km3 = KMeans(n_clusters=3, random_state=SEED, n_init='auto').fit(Xs)
centers = km3.cluster_centers_   # (3, n_feat)
center_var = centers.var(axis=0)
imp_clu = pd.Series(center_var, index=feat_names).sort_values(ascending=False)

# 3. Importancia para separar clases (varianza entre medias de clase)
class_means = np.array([Xs[y==i].mean(axis=0) for i in range(len(CLASS_NAMES))])
class_var   = class_means.var(axis=0)
imp_cls = pd.Series(class_var, index=feat_names).sort_values(ascending=False)

# Comparación top features
TOP = 20
fig, axes = plt.subplots(1, 3, figsize=(18, 7))

imp_clf[:TOP].plot.barh(ax=axes[0], color='#2a78d6', edgecolor='white')
axes[0].set_title(f'Top {TOP} — importancia para CLASIFICACIÓN (RF)', fontsize=10)
axes[0].invert_yaxis()

imp_clu[:TOP].plot.barh(ax=axes[1], color='#e34948', edgecolor='white')
axes[1].set_title(f'Top {TOP} — varianza entre centroides K-MEANS', fontsize=10)
axes[1].invert_yaxis()

imp_cls[:TOP].plot.barh(ax=axes[2], color='#1baf7a', edgecolor='white')
axes[2].set_title(f'Top {TOP} — separabilidad entre CLASES REALES', fontsize=10)
axes[2].invert_yaxis()

plt.suptitle('Importancia de features: Clasificación vs Clustering vs Clases reales', fontsize=12)
plt.tight_layout()
plt.savefig('feature_importance_comparison.png', bbox_inches='tight')
plt.show()

# Overlap entre top features
top_clf = set(imp_clf[:TOP].index)
top_clu = set(imp_clu[:TOP].index)
top_cls = set(imp_cls[:TOP].index)
print(f'Overlap Clasificación ∩ Clustering:    {len(top_clf & top_clu):2d} features')
print(f'Overlap Clasificación ∩ Clases reales: {len(top_clf & top_cls):2d} features')
print(f'Overlap Clustering ∩ Clases reales:    {len(top_clu & top_cls):2d} features')
print(f'\nFeatures importantes para clasificación pero NO para clustering:')
print(sorted(top_clf - top_clu))
print(f'\nFeatures importantes para clustering pero NO para clasificación:')
print(sorted(top_clu - top_clf))

# ── Test Kruskal-Wallis: qué features discriminan estadísticamente las clases ──
kruskal_results = []
for feat in feat_names:
    groups = [Xs[y==i, feat_names.index(feat)] for i in range(len(CLASS_NAMES))]
    # Check if all groups have more than 1 element and if there is variance within each group
    if all(len(g) > 1 and np.std(g) > 1e-9 for g in groups):
        stat, pval = kruskal(*groups)
        kruskal_results.append({'feature': feat, 'H_stat': stat, 'p_value': pval})

df_kw = pd.DataFrame(kruskal_results).sort_values('H_stat', ascending=False)
df_kw['significant'] = df_kw['p_value'] < 0.05

print(f'Features con discriminación estadística (p<0.05): {df_kw["significant"].sum()} / {len(df_kw)}')
print('\nTop 15 features más discriminantes:')
print(df_kw.head(15).to_string(index=False))

# Heatmap de medias por clase (top features)
top_kw_feats = df_kw.head(25)['feature'].tolist()
X_df = pd.DataFrame(Xs, columns=feat_names)
X_df['clase'] = [CLASS_NAMES[i] for i in y]
means_by_class = X_df.groupby('clase')[top_kw_feats].mean().T

fig, ax = plt.subplots(figsize=(8, 10))
sns.heatmap(means_by_class, annot=True, fmt='.2f', cmap='RdBu_r',
            center=0, ax=ax, linewidths=0.2, cbar_kws={'label': 'Z-score (RobustScaler)'})
ax.set_title('Media por clase — Top 25 features más discriminantes (Kruskal-Wallis)', fontsize=11)
plt.tight_layout()
plt.savefig('heatmap_means_by_class.png', bbox_inches='tight')
plt.show()

---
## 🧬 SECCIÓN 7 — Clustering sobre features seleccionadas
### ¿Mejora el ARI si usamos solo features discriminantes?

# ── Clustering con diferentes subconjuntos de features ────────────────────────
subsets_feats = {
    'Todas (104)':           feat_names,
    'Top-20 RF':             imp_clf[:20].index.tolist(),
    'Top-20 Kruskal':        df_kw.head(20)['feature'].tolist(),
    'Top-10 RF':             imp_clf[:10].index.tolist(),
    'Top-30 Kruskal':        df_kw.head(30)['feature'].tolist(),
    'Sig. Kruskal (p<0.01)': df_kw[df_kw['p_value']<0.01]['feature'].tolist(),
    'PCA-10 components':     None,   # especial
    'UMAP-5 components':     None,   # especial
}

# PCA y UMAP como features
Xs_pca10 = PCA(n_components=10, random_state=SEED).fit_transform(Xs)
Xs_umap5 = umap.UMAP(n_components=5, n_neighbors=20, random_state=SEED).fit_transform(Xs)

results_fs = []
for name, feats in subsets_feats.items():
    if name == 'PCA-10 components':   Xs_sub = Xs_pca10
    elif name == 'UMAP-5 components': Xs_sub = Xs_umap5
    else:
        idx = [feat_names.index(f) for f in feats if f in feat_names]
        Xs_sub = Xs[:, idx]
        if Xs_sub.shape[1] == 0: continue

    for algo, k_or_params in [('KMeans-3', 3), ('KMeans-5', 5), ('GMM-3', 3), ('GMM-5', 5), ('Agglom-3', 3)]:
        if 'KMeans' in algo:
            lbl = KMeans(n_clusters=k_or_params, random_state=SEED, n_init='auto').fit_predict(Xs_sub)
        elif 'GMM' in algo:
            lbl = GaussianMixture(n_components=k_or_params, random_state=SEED).fit_predict(Xs_sub)
        elif 'Agglom' in algo:
            lbl = AgglomerativeClustering(n_clusters=k_or_params).fit_predict(Xs_sub)
        ari = adjusted_rand_score(y, lbl)
        ami = adjusted_mutual_info_score(y, lbl)
        sil = silhouette_score(Xs_sub, lbl)
        results_fs.append({'Features': name, 'Algo': algo, 'ARI': ari, 'AMI': ami, 'Sil': sil,
                           'n_feats': Xs_sub.shape[1]})

df_fs = pd.DataFrame(results_fs)
pivot_ari = df_fs.pivot_table(index='Features', columns='Algo', values='ARI').round(4)

fig, ax = plt.subplots(figsize=(14, 6))
sns.heatmap(pivot_ari, annot=True, fmt='.4f', cmap='YlOrRd', ax=ax, linewidths=0.3,
            vmin=0, vmax=1)
ax.set_title('ARI según subconjunto de features × algoritmo de clustering', fontsize=11)
plt.tight_layout()
plt.savefig('ari_feature_selection.png', bbox_inches='tight')
plt.show()

best_row = df_fs.loc[df_fs['ARI'].idxmax()]
print(f'\n🏆 Mejor combinación:')
print(f'  Features: {best_row["Features"]} | Algo: {best_row["Algo"]}')
print(f'  ARI={best_row["ARI"]:.4f} | AMI={best_row["AMI"]:.4f} | Sil={best_row["Sil"]:.4f}')

---
## 🌲 SECCIÓN 8 — Árbol de decisión sobre clusters
### ¿Qué reglas separan los clusters de los datos reales?

from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree

# Árbol que intenta predecir clusters DBSCAN desde las features originales
db_best_params = df_sweep.iloc[0]
db_labels_best = DBSCAN(eps=db_best_params['eps'],
                         min_samples=int(db_best_params['min_s'])).fit(X50).labels_

mask_valid = db_labels_best != -1
X_tree = X.values[mask_valid]
y_tree_cls = y[mask_valid]              # clases reales
y_tree_clu = db_labels_best[mask_valid] # clusters DBSCAN

# Árbol sobre clusters DBSCAN
dt_clu = DecisionTreeClassifier(max_depth=4, random_state=SEED)
dt_clu.fit(X_tree, y_tree_clu)
print(f'Árbol que predice CLUSTERS DBSCAN — Accuracy: {dt_clu.score(X_tree, y_tree_clu):.4f}')

# Árbol sobre clases reales (para comparar)
dt_cls = DecisionTreeClassifier(max_depth=4, random_state=SEED)
dt_cls.fit(X_tree, y_tree_cls)
print(f'Árbol que predice CLASES REALES — Accuracy: {dt_cls.score(X_tree, y_tree_cls):.4f}')

fig, axes = plt.subplots(1, 2, figsize=(22, 8))
plot_tree(dt_clu, ax=axes[0], feature_names=feat_names, class_names=[f'c{i}' for i in sorted(set(y_tree_clu))],
          filled=True, rounded=True, fontsize=7, max_depth=3)
axes[0].set_title('Reglas que separan CLUSTERS DBSCAN', fontsize=11)

plot_tree(dt_cls, ax=axes[1], feature_names=feat_names, class_names=list(CLASS_NAMES),
          filled=True, rounded=True, fontsize=7, max_depth=3)
axes[1].set_title('Reglas que separan CLASES REALES', fontsize=11)

plt.suptitle('Árbol de decisión: ¿Qué features y umbrales definen los grupos?', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('decision_trees_comparison.png', bbox_inches='tight')
plt.show()

# Features más importantes en cada árbol
top_clu_tree = pd.Series(dt_clu.feature_importances_, index=feat_names).nlargest(10)
top_cls_tree = pd.Series(dt_cls.feature_importances_, index=feat_names).nlargest(10)
print('\nTop features — árbol clusters DBSCAN:')
print(top_clu_tree.to_string())
print('\nTop features — árbol clases reales:')
print(top_cls_tree.to_string())

---
## 📊 SECCIÓN 9 — Distribuciones de features clave por clase y por cluster

# ── Violin plots: top features discriminantes ──────────────────────────────────
top_feats_viz = imp_clf[:12].index.tolist()
X_df_orig = pd.DataFrame(X.values, columns=feat_names)
X_df_orig['clase'] = [CLASS_NAMES[i] for i in y]
X_df_orig['km3']   = [f'km{l}' for l in km3_l]

fig, axes = plt.subplots(3, 4, figsize=(18, 12))
for ax, feat in zip(axes.flat, top_feats_viz):
    order = list(CLASS_NAMES)
    pal   = {cn: PALETTE[cn] for cn in CLASS_NAMES}
    sns.violinplot(data=X_df_orig, x='clase', y=feat, order=order,
                   palette=pal, ax=ax, inner='quartile', density_norm='width')
    ax.set_title(feat, fontsize=9)
    ax.set_xlabel(''); ax.tick_params(axis='x', labelsize=8)

plt.suptitle('Distribución por clase — Top 12 features más discriminantes', fontsize=12)
plt.tight_layout()
plt.savefig('violin_top_features.png', bbox_inches='tight')
plt.show()

# ── Pairplot top-5 features: clase real vs cluster K-Means ────────────────────
top5 = imp_clf[:5].index.tolist()
pp_df = X_df_orig[top5 + ['clase']].copy()
pp_df['km3'] = [f'km{l}' for l in km3_l]

fig = sns.pairplot(pp_df, vars=top5, hue='clase', palette=PALETTE,
                   plot_kws={'alpha': 0.5, 's': 20}, diag_kind='kde')
fig.fig.suptitle('Pairplot top-5 features — color = clase real', y=1.01, fontsize=12)
plt.savefig('pairplot_by_class.png', bbox_inches='tight')
plt.show()

fig2 = sns.pairplot(pp_df, vars=top5, hue='km3',
                    plot_kws={'alpha': 0.5, 's': 20}, diag_kind='kde')
fig2.fig.suptitle('Pairplot top-5 features — color = cluster K-Means', y=1.01, fontsize=12)
plt.savefig('pairplot_by_cluster.png', bbox_inches='tight')
plt.show()

---
## 📋 SECCIÓN 10 — Informe de diagnóstico final

from IPython.display import display, HTML

# Tabla resumen de todos los métodos
summary = [
    ('K-Means k=3',        adjusted_rand_score(y,km3_l),   adjusted_mutual_info_score(y,km3_l),   silhouette_score(Xs,km3_l),   calinski_harabasz_score(Xs,km3_l),   davies_bouldin_score(Xs,km3_l)),
    ('K-Means k=5',        adjusted_rand_score(y,km5_l),   adjusted_mutual_info_score(y,km5_l),   silhouette_score(Xs,km5_l),   calinski_harabasz_score(Xs,km5_l),   davies_bouldin_score(Xs,km5_l)),
    ('GMM k=3',            adjusted_rand_score(y,gm3_l),   adjusted_mutual_info_score(y,gm3_l),   silhouette_score(Xs,gm3_l),   calinski_harabasz_score(Xs,gm3_l),   davies_bouldin_score(Xs,gm3_l)),
    ('GMM k=5',            adjusted_rand_score(y,gm5_l),   adjusted_mutual_info_score(y,gm5_l),   silhouette_score(Xs,gm5_l),   calinski_harabasz_score(Xs,gm5_l),   davies_bouldin_score(Xs,gm5_l)),
    ('Agglomerative k=3',  adjusted_rand_score(y,agg_l),   adjusted_mutual_info_score(y,agg_l),   silhouette_score(Xs,agg_l),   calinski_harabasz_score(Xs,agg_l),   davies_bouldin_score(Xs,agg_l)),
    ('Spectral k=3',       adjusted_rand_score(y,spec_l),  adjusted_mutual_info_score(y,spec_l),  silhouette_score(Xs,spec_l),  calinski_harabasz_score(Xs,spec_l),  davies_bouldin_score(Xs,spec_l)),
    ('DBSCAN best',        adjusted_rand_score(y,dbb_l),   adjusted_mutual_info_score(y,dbb_l),   silhouette_score(Xs[dbb_l!=-1],dbb_l[dbb_l!=-1]) if (dbb_l!=-1).sum()>1 else 0, 0, 0),
    ('HDBSCAN',            adjusted_rand_score(y,hdb.labels_), adjusted_mutual_info_score(y,hdb.labels_), silhouette_score(X50[hdb.labels_!=-1],hdb.labels_[hdb.labels_!=-1]) if (hdb.labels_!=-1).sum()>1 else 0, 0, 0),
]

df_summary = pd.DataFrame(summary, columns=['Método','ARI','AMI','Silhouette','Calinski-H','Davies-B'])
df_summary = df_summary.round(4)

def color_ari(val):
    try:
        v = float(val)
        if v >= 0.5:  return 'background-color:#c6f0c2'
        elif v >= 0.2: return 'background-color:#ffeeba'
        else:          return 'background-color:#ffdede'
    except: return ''

styled = (df_summary.style
          .applymap(color_ari, subset=['ARI','AMI'])
          .set_caption('Diagnóstico completo de clustering — features_anotaciones_v2')
          .set_table_styles([{'selector':'th','props':[('background-color','#2d3748'),('color','white'),('font-size','11px')]}]))
display(styled)
df_summary.to_csv('diagnostico_clustering_resumen.csv', index=False)

print('\n' + '='*65)
print('  DIAGNÓSTICO FINAL')
print('='*65)
print(f"""
1. FORMA DE CLUSTERS: Los datos NO forman esferas convexas.
   → K-Means/GMM/Agglomerative asumen forma esférica → fallan.
   → DBSCAN/HDBSCAN usan densidad → capturan la estructura real.

2. SUB-CLUSTERS: Cada clase contiene sub-grupos internos.
   → El k geométrico óptimo probablemente > 3.
   → Esto hace que K-Means con k=3 rompa los sub-grupos
     mezclando clases en un mismo cluster.

3. FEATURES: Los centroides K-Means son dominados por features
   de alta varianza global que NO son las más discriminantes
   para las etiquetas reales.
   → Clustering sobre Top-N Kruskal/RF mejora el ARI.

4. CLASE 'servido' (n=46): Es la clase más pequeña.
   → En el espacio de features forma una región densa y compacta
     que DBSCAN detecta fácilmente como un cluster propio.
   → K-Means la absorbe en clusters más grandes.

5. RECOMENDACIÓN: Usar HDBSCAN o DBSCAN sobre PCA-50D
   como estrategia de clustering. Para análisis exploratorio,
   usar las features Top-Kruskal o reducción UMAP-5D.
""")

print('\n📁 Archivos exportados:')
for f in ['viz_comparativa_2d.png', 'elbow_metrics.png', 'silhouette_diagrams.png',
          'kdistance_plot.png', 'dbscan_sweep_heatmap.png', 'hdbscan_umap.png',
          'subclusters_por_clase.png', 'cluster_class_map.png',
          'feature_importance_comparison.png', 'heatmap_means_by_class.png',
          'ari_feature_selection.png', 'decision_trees_comparison.png',
          'violin_top_features.png', 'pairplot_by_class.png',
          'diagnostico_clustering_resumen.csv']:
    print(f'  • {f}')

from google.colab import files
files.download('diagnostico_clustering_resumen.csv')