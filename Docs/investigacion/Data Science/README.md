# KPCL0034 - Data Science Pipeline

Pipeline de ML focalizado en `KPCL0034` para deteccion automatica de curvas de alimentacion.
El alcance vigente de esta carpeta es investigacion supervisada sobre alimento;
`KPCL0036` e hidratacion quedan fuera del modelo activo por ahora.

## Estructura

```
Data Science/
├── README.md                          ← este archivo
├── requirements.txt                   ← dependencias Python
├── colab_fase1_fase2_pipeline.py      ← pipeline completo para Google Colab
├── REFERENCIAS.md                     ← referencias y links utiles
├── resumen_fase3.svg                  ← grafico comparativo visual
│
├── experiments/                       ← reportes individuales por experimento
│   ├── exp_01_linea_base.md
│   ├── exp_02_threshold_rebalanceo.md
│   ├── exp_03_mejor_base.md           ← MEJOR BASE ★
│   ├── exp_04_smote_calibracion.md
│   └── exp_05_nueva_ingesta.md
│
├── Reporte_Experimentos_Fase3.md      ← reporte maestro comparativo
├── Resumen_Experimentos_Fase3.md      ← resumen ejecutivo
├── Reporte_Sesion_2026-04-26.md       ← reporte de sesion 26/04
├── Preparacion_Nueva_Ingesta.md       ← guia para nueva ingesta
│
├── fase_1_extraccion/
│   ├── INSTRUCCIONES_FASE1_CLAUDE_CODE.docx
│   ├── scripts/   01_setup_env → 06_quality_report
│   ├── notebooks/ exploracion_fase1.ipynb
│   └── outputs/   quality_report.txt
│
├── fase_2_dataset/
│   ├── INSTRUCCIONES_FASE2_CLAUDE_CODE.docx
│   ├── README.md
│   └── scripts/   01_build_labels → 04_dataset_report
│
└── fase_3_modelos/
    ├── INSTRUCCIONES_FASE3_CLAUDE_CODE.docx
    ├── README.md
    ├── scripts/   01_prepare_datasets → 04_training_report
    ├── models/
    │   ├── modelo_a/  ← binario: activo vs reposo
    │   └── modelo_b/  ← multiclase: alimentacion / servido / reposo
    └── outputs/   training_report.txt
```

## Fuente oficial de etiquetas
- La fuente oficial operativa de eventos manuales vive en `public.audit_events`.
- `04_extract_events.py` pagina resultados desde Supabase y genera `events_labeled.parquet`.
- No se mantiene una lista local paralela de eventos historicos.
- No mezclar listas locales activas con la Fase 1.

## Ejecucion en Windows PowerShell
```powershell
cd "Docs/investigacion/Data Science"
python -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
cd fase_1_extraccion/scripts
python 01_setup_env.py
```

## Credenciales
Se leen desde:
`D:\Escritorio\Proyectos\KittyPaw\kittypau_2026_hivemq\.env.local`

Variables requeridas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Fallback tecnico:
- `SUPABASE_DB_URL` o `SUPABASE_DB_POOLER_URL` si el cliente de Supabase no acepta la clave de API en este entorno.

## Salidas actuales de Fase 1
- `fase_1_extraccion/data/raw/readings_raw.parquet`
- `fase_1_extraccion/data/raw/events_labeled.parquet`
- `fase_1_extraccion/data/raw/sessions_labeled.parquet`
- `fase_1_extraccion/outputs/quality_report/quality_report.txt`

## Fase 2
- `fase_2_dataset/README.md` describe el flujo de construccion del dataset.
- `fase_2_dataset/scripts/` contiene la construccion de labels, features, split temporal y reporte.

## Fase 3
- `fase_3_modelos/README.md` describe la estructura esperada para el entrenamiento.
- La Fase 3 consume exclusivamente los artefactos de `fase_2_dataset/data/train/`.
- El `X_test.parquet` y el `y_test.parquet` se reservan para la Fase 4 y no deben usarse en entrenamiento ni en el reporte de comparacion.

## Resumen de experimentos
- [Reporte maestro de Fase 3](./Reporte_Experimentos_Fase3.md)
- [Resumen ejecutivo de Fase 3](./Resumen_Experimentos_Fase3.md)
- [Preparacion para nueva ingesta](./Preparacion_Nueva_Ingesta.md)
- [Experimentos individuales](./experiments/) — exp_01 a exp_05

## Estado actual

- La mejor base de referencia sigue siendo el `Experimento 3`.
- El `Experimento 4` sirve como comparacion para calibracion y SMOTE local.
- El `Experimento 5` valida la nueva ingesta en Fase 1, pero no cambia Fase 2 ni Fase 3.
- Para mover los modelos de forma real, la proxima ingesta debe entrar al dataset supervisado de Fase 2.

## Alcance vigente
- La Fase 1 extrae lecturas, eventos y sesiones para `KPCL0034`.
- La Fase 2 construye un dataset supervisado de tres clases: `alimentacion`, `servido` y `reposo`.
- La Fase 3 entrena dos variantes: un modelo binario `activo` vs `reposo` y un modelo multiclase `alimentacion` / `servido` / `reposo`.
- Las sesiones de hidratacion pueden existir en artefactos historicos, pero no forman parte del modelo activo actual.
- Si mas adelante se extiende a agua o multi-device, esta carpeta debe versionarse o documentarse como una nueva fase.
