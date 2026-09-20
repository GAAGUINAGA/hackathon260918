\# CDU\_v1.0.1 — Casos de Uso del Sistema de Clasificación, Organización y Nombramiento Automatizado de Documentos



\*\*Versión:\*\* 1.0.1

\*\*Proyecto:\*\* Reto 5 — Hackathon

\*\*Enfoque:\*\* Local-first, monousuario, arquitectura por capas con puertos/adaptadores

\*\*Documento base:\*\* `planeacion\_v2.0.1.md`

\*\*Cambios vs v1.0.0:\*\*

\- \*\*UC-06:\*\* Atomicidad en filesystem — nota técnica sobre `os.replace` cross-partition y patrón Copy-and-Delete con limpieza.

\- \*\*UC-03 y UC-04:\*\* Límites de contexto del LLM local — chunking, resúmenes densos y estrategia de dos pasadas.

\- \*\*UC-02:\*\* pre-cálculo de resumen denso para alimentar UC-03/UC-04.

\- \*\*Nuevos ADRs 015 y 016\*\*, nuevas reglas de negocio RN-15 a RN-18.

\- \*\*Nuevos requisitos no funcionales\*\* de contexto y atomicidad.



\---



\## 1. Definición de Actores del Sistema



\### 1.1. Actores Humanos



| Actor | Rol | Responsabilidades principales | Interfaz principal |

|---|---|---|---|

| \*\*Analista Documental\*\* | Usuario operativo | Carga documentos, revisa resultados, aprueba/rechaza clasificaciones de baja confianza, ajusta taxonomía y umbrales | UI Streamlit, CLI `reto5` |

| \*\*Administrador del Sistema\*\* | Usuario técnico | Configura rutas de entrada/salida, taxonomía, convención de nombres, umbrales de confianza, workers, PRAGMAs, LLM local/remoto, \*\*parámetros de chunking y ventana de contexto\*\* | `config.yaml`, `taxonomia.yaml`, `convencion.yaml`, CLI `reto5 admin` |

| \*\*Auditor / Responsable de Cumplimiento\*\* | Usuario de control | Consulta bitácora de auditoría, verifica trazabilidad, exporta reportes de decisiones y PII | UI Streamlit (modo auditoría), reportes CSV/JSON |

| \*\*Desarrollador / Integrador\*\* | Usuario técnico avanzado | Consume API/CLI, extiende puertos, añade adaptadores (nuevo OCR, LLM, storage) | SDK Python, API REST local, contratos Pydantic |



\### 1.2. Actores del Sistema (Componentes Autónomos)



| Actor | Tipo | Responsabilidad | Interfaz |

|---|---|---|---|

| \*\*Nodo de Ingesta (Ingest Node)\*\* | Proceso local | Detecta archivos nuevos vía `watchdog`, aplica debounce, verifica estabilidad, adquiere lock, calcula SHA-256, detecta duplicados y encola | `IngestPort`, `FileLockPort` |

| \*\*Motor de Extracción (Extraction Engine)\*\* | Proceso local | Extrae texto nativo (PDF/DOCX/XLSX/TXT/CSV), aplica OCR a escaneos/imágenes, normaliza encoding, fechas e idioma, \*\*y genera resumen denso + chunks semánticos\*\* | `OCRPort`, `TextExtractorPort`, `ChunkerPort` |

| \*\*Motor de Clasificación (Classification Engine)\*\* | Proceso local | Clasifica por reglas + embeddings + LLM; emite categoría, tipo, etiquetas y confianza. \*\*Aplica chunking para el LLM y agrega resultados por votación ponderada\*\* | `NLPPort`, `LLMPort`, `ClassifierPort` |

| \*\*Motor de Extracción de Metadatos (Metadata Extractor)\*\* | Proceso local | Extrae fecha, entidad emisora/receptora, persona, ID, versión con NER + regex + LLM. \*\*Usa resumen denso + chunks priorizados para no saturar contexto\*\* | `NLPPort`, `LLMPort` |

| \*\*Generador de Nombres (Naming Engine)\*\* | Proceso local | Aplica convención, resuelve ambigüedades, genera nombre final y ruta lógica | `NamingPort` |

| \*\*Organizador (Organizer)\*\* | Proceso local | Mueve/copia archivos a carpetas destino; aplica patrón outbox; \*\*detecta cross-partition y usa Copy-and-Delete con limpieza transaccional\*\* | `StoragePort` |

| \*\*Bus de Eventos Local (Local Event Bus)\*\* | Cola thread-safe | Desacopla ingesta, procesamiento y escritura; backpressure | `queue.Queue` |

| \*\*Escritor de Auditoría (WriterThread)\*\* | Hilo único | Serializa escrituras a SQLite (WAL); lectores concurrentes RO | `MetadataRepoPort` |

| \*\*Repositorio de Auditoría (Audit Repo)\*\* | SQLite WAL | Persiste documentos, clasificaciones, metadatos, nombres, estados, duplicados | `MetadataRepoPort` |

| \*\*API/CLI Gateway\*\* | Interfaz local | Expone operaciones al usuario y a integraciones | Typer + FastAPI local (opcional) |

| \*\*Dashboard / UI\*\* | Streamlit | Presenta resultados, cola de revisión, métricas y bitácora | Conexión RO a SQLite |

| \*\*Motor de Reglas de Revisión (Review Rules Engine)\*\* | Proceso local | Evalúa umbrales de confianza y decide `\_REVISAR` vs. auto-publicación | Reglas YAML |



\---



\## 2. Casos de Uso de Primer Nivel (High-Level)



| ID | Caso de Uso | Actor primario | Prioridad |

|---|---|---|---|

| \*\*UC-01\*\* | Ingesta robusta y preprocesamiento documental | Nodo de Ingesta | Crítica |

| \*\*UC-02\*\* | Extracción de contenido, OCR adaptativo y resumen denso | Motor de Extracción | Crítica |

| \*\*UC-03\*\* | Clasificación documental híbrida | Motor de Clasificación | Crítica |

| \*\*UC-04\*\* | Extracción de metadatos y entidades | Motor de Extracción de Metadatos | Crítica |

| \*\*UC-05\*\* | Generación de nombre estructurado | Generador de Nombres | Crítica |

| \*\*UC-06\*\* | Organización, movimiento y publicación | Organizador + StoragePort | Crítica |

| \*\*UC-07\*\* | Auditoría, trazabilidad y control de duplicados | Repositorio de Auditoría | Alta |

| \*\*UC-08\*\* | Revisión humana y ajuste de umbrales | Analista Documental | Alta |

| \*\*UC-09\*\* | Integración y consumo (UI/CLI/API) | API/CLI Gateway | Alta |

| \*\*UC-10\*\* | Mantenimiento, configuración y administración | Administrador del Sistema | Media |

| \*\*UC-11\*\* | Seguridad, privacidad y manejo de PII | Administrador + Auditor | Alta |

| \*\*UC-12\*\* | Observabilidad y métricas de calidad | Administrador + Analista | Media |



\---



\## 3. Casos de Uso Detallados (Low-Level Specification)



\---



\### UC-01: Ingesta Robusta y Preprocesamiento Documental



\*\*Propósito:\*\* Detectar documentos nuevos en la carpeta de entrada sin procesar archivos en tránsito, deduplicar por hash y encolar de forma segura para su procesamiento posterior.



\*\*Actores:\*\* Nodo de Ingesta, FileLockPort, Local Event Bus, Repositorio de Auditoría.



\*\*Precondiciones:\*\*

\- Carpeta `Documentos/Entrada` existe y es accesible.

\- `config.yaml` cargado con parámetros de ingesta.

\- SQLite en modo WAL operativo.



\*\*Inputs:\*\*

\- Archivos en `Documentos/Entrada` (PDF, DOCX, XLSX, TXT, CSV, JPG, PNG, TIFF).

\- Configuración: `debounce\_segundos`, `estabilidad\_checks`, `lock\_stale\_segundos`, `workers`, `cola\_max`.



\*\*Outputs:\*\*

\- `DocumentoRaw` encolado con `sha256`, `mime`, `tamano\_bytes`, `estado\_ingesta`.

\- Registro inicial en `auditoria.db` con estado `ENCOLADO` o `DUPLICADO`.

\- Log de decisiones de ingesta.



\*\*Comunicación / Flujo Principal:\*\*



1\. `watchdog` detecta evento `on\_created`, `on\_modified` u `on\_moved`.

2\. `DebouncedEventHandler` reinicia el timer por ruta; solo emite tras `debounce\_segundos` sin nuevos eventos.

3\. \*\*Estabilidad de tamaño:\*\* `archivo\_estable()` exige N lecturas consecutivas iguales.

4\. Si no está estable tras `max\_reintentos` → `data/cuarentena/`, estado `CUARENTENA`.

5\. \*\*Try-lock exclusivo\*\* vía `FileLockPort`:

&#x20;  - Windows → `msvcrt.locking(LK\_NBLCK)`.

&#x20;  - POSIX → `fcntl.flock(LOCK\_EX | LOCK\_NB)`.

&#x20;  - Fallback → lock file adyacente `\*.lock`.

6\. Si no se obtiene lock → `ColaReintentos` con backoff exponencial (`2s…60s`, máx 6). Tras agotar → `BLOQUEADO`.

7\. \*\*Validación de integridad:\*\*

&#x20;  - Tamaño mínimo por tipo.

&#x20;  - Magic bytes (`%PDF`, `PK\\x03\\x04`, `FFD8FF`, `89PNG`).

&#x20;  - Si falla → `CORRUPTO`.

8\. `sha256`. Si ya existe → `DUPLICADO` con `\_DUP01`, `\_DUP02`.

9\. Se construye `DocumentoRaw` y se encola en `Local Event Bus`.

10\. Se libera lock y se registra `ENCOLADO`.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Archivo borrado antes de procesar:\*\* `DESCARTADO`.

\- \*\*A2 — Múltiples eventos consecutivos:\*\* debounce absorbe.

\- \*\*A3 — Lock huérfano > `lock\_stale\_segundos`:\*\* eliminar y reintentar.

\- \*\*A4 — Cola llena:\*\* pausar ingesta.



\*\*Postcondiciones:\*\*

\- Documento válido encolado o descartado con estado trazable.

\- Nunca se procesa archivo en tránsito o corrupto.



\*\*Rendimiento:\*\*

\- Latencia de detección < 3 s tras terminar la copia.

\- Escala con workers (hasta saturar CPU/disco).



\*\*Métricas:\*\*

\- `% descartados por inestabilidad` < 1%.

\- `% corruptos detectados` = 100% de corruptos reales.

\- `% duplicados detectados` > 95%.



\---



\### UC-02: Extracción de Contenido, OCR Adaptativo y Resumen Denso



\*\*Propósito:\*\* Obtener texto y metadatos internos de cada documento, eligiendo la estrategia óptima según su naturaleza, midiendo calidad y \*\*produciendo artefactos intermedios (resumen denso + chunks semánticos) que alimentarán la clasificación y la extracción de metadatos sin saturar el contexto del LLM\*\*.



\*\*Actores:\*\* Motor de Extracción, OCRPort, TextExtractorPort, ChunkerPort.



\*\*Precondiciones:\*\*

\- `DocumentoRaw` en estado `ENCOLADO`.

\- Dependencias OCR instaladas (Tesseract/PaddleOCR).

\- Idiomas configurados.

\- \*\*Modelo de embeddings y tokenizer del LLM objetivo cargados\*\* (para medir tokens).



\*\*Inputs:\*\*

\- Documento binario.

\- Configuración: `ocr\_idiomas`, `pdf\_modo` (`nativo|ocr|auto`), `calidad\_minima`, \*\*`chunk\_max\_tokens`, `chunk\_overlap\_tokens`, `resumen\_max\_tokens`, `estrategia\_chunking`\*\*.



\*\*Outputs:\*\*

\- `TextoExtraido` con `texto`, `metodo`, `idioma`, `calidad`.

\- \*\*`ResumenDenso`\*\*: representación comprimida del documento (≤ `resumen\_max\_tokens`).

\- \*\*`Chunks\[]`\*\*: lista ordenada de fragmentos con metadatos (`indice`, `rango\_caracteres`, `tipo\_seccion`, `tokens`).

\- Metadatos embebidos (EXIF, propiedades Office, XMP).



\*\*Comunicación / Flujo Principal:\*\*



1\. Detección de tipo real por MIME + magic bytes.

2\. Según tipo:

&#x20;  - \*\*PDF digital\*\* → PyMuPDF extrae texto por página. Si densidad baja → fallback OCR.

&#x20;  - \*\*PDF escaneado\*\* → rasterizado + OCR.

&#x20;  - \*\*DOCX\*\* → párrafos, tablas, encabezados.

&#x20;  - \*\*XLSX\*\* → hojas, celdas, metadatos.

&#x20;  - \*\*TXT/CSV\*\* → lectura directa con detección de encoding.

&#x20;  - \*\*Imagen\*\* → OCR + EXIF.

3\. Normalización: saltos de línea, espacios, encoding, idioma, fechas candidatas.

4\. Cálculo de \*\*calidad\*\* (ratio alfanumérico, densidad léxica, confianza OCR).

5\. \*\*Segmentación estructural:\*\* identificar secciones lógicas (encabezado, cuerpo, tablas, firmas, anexos) mediante heurísticas + regex por tipo documental.

6\. \*\*Chunking semántico:\*\*

&#x20;  - Estrategia por defecto: \*\*recursive character splitting con respeto a límites de sección\*\*.

&#x20;  - Estrategias alternativas configurables: `fixed`, `sentence`, `semantic` (basado en similitud de embeddings adyacentes), `hierarchical` (respetando estructura del documento).

&#x20;  - Cada chunk ≤ `chunk\_max\_tokens` (por defecto 512), con `chunk\_overlap\_tokens` (por defecto 64).

&#x20;  - Se preservan metadatos de sección y posición.

7\. \*\*Resumen denso (dos pasadas):\*\*

&#x20;  - \*\*Pasada 1 (extractiva):\*\* selección de las N frases/párrafos con mayor score (TF-IDF + posición + presencia de entidades).

&#x20;  - \*\*Pasada 2 (abstractiva, opcional):\*\* si el LLM local está disponible y el documento es extenso, generar resumen de ≤ `resumen\_max\_tokens` con prompt controlado.

&#x20;  - Fallback: si el LLM no está disponible, se usa solo el extractivo.

8\. Persistencia de `TextoExtraido`, `ResumenDenso` y `Chunks\[]` en el `DocumentoRaw` extendido.

9\. Emisión al pipeline.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — PDF mixto:\*\* extracción por página; `metodo="mixto"`.

\- \*\*A2 — OCR falla:\*\* reintentar con idioma alternativo; si falla → `CORRUPTO`.

\- \*\*A3 — Documento cifrado:\*\* `CIFRADO` → `\_Pendientes`.

\- \*\*A4 — Encoding desconocido:\*\* probar `utf-8`, `latin-1`, `cp1252`, `utf-16`.

\- \*\*A5 — Documento demasiado extenso (> 500 páginas):\*\* activar modo `streaming` por capítulos; resumen jerárquico (resumen de resúmenes).



\*\*Postcondiciones:\*\*

\- Texto normalizado, resumen denso y chunks listos para clasificación y extracción.

\- Ningún chunk excede la ventana de contexto configurada.



\*\*Rendimiento:\*\*

\- PDF digital: < 1 s por documento típico.

\- OCR: 2–10 s por página.

\- Chunking: < 200 ms por documento típico.

\- Resumen extractivo: < 500 ms.

\- Resumen abstractivo (LLM): 1–5 s por documento.



\*\*Métricas:\*\*

\- `% chunks dentro del límite de tokens` = 100%.

\- Cobertura del resumen sobre entidades clave > 90%.



\---



\### UC-03: Clasificación Documental Híbrida



\*\*Propósito:\*\* Asignar categoría principal, tipo documental y etiquetas secundarias con un nivel de confianza medible, combinando reglas deterministas, embeddings y LLM, \*\*gestionando explícitamente el límite de contexto del LLM mediante chunking, resumen denso y agregación de votos\*\*.



\*\*Actores:\*\* Motor de Clasificación, NLPPort, LLMPort, ClassifierPort, ChunkerPort.



\*\*Precondiciones:\*\*

\- `TextoExtraido`, `ResumenDenso` y `Chunks\[]` disponibles.

\- `taxonomia.yaml` cargado y validado.

\- Prototipos/embeddings cacheados.

\- \*\*Ventana de contexto del LLM conocida\*\* (`llm\_ventana\_contexto`, por defecto 8192 tokens para modelos locales pequeños).



\*\*Inputs:\*\*

\- Texto normalizado + resumen denso + chunks.

\- Taxonomía (categorías, tipos, palabras clave, prototipos).

\- Umbrales: `confianza\_alta`, `confianza\_baja`.

\- \*\*Parámetros de contexto:\*\* `max\_chunks\_llm`, `max\_tokens\_prompt`, `estrategia\_agregacion` (`voto\_mayoria|ponderada|jerarquica`).



\*\*Outputs:\*\*

\- `ClasificacionResultado`: `categoria`, `tipo`, `etiquetas\[]`, `confianza`, `metodo`.

\- Evidencia: reglas activadas, scores de embeddings, respuesta(s) del LLM, \*\*número de chunks usados\*\*, \*\*votos por categoría\*\*.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Capa 1 — Reglas deterministas:\*\*

&#x20;  - Palabras clave por categoría/tipo.

&#x20;  - Regex (RUC, DNI, número de factura, fecha, montos).

&#x20;  - Estructura documental (encabezados, tablas, sellos).

&#x20;  - Si match fuerte y confianza ≥ `confianza\_alta` → salida directa (sin LLM).



2\. \*\*Capa 2 — Embeddings + similitud:\*\*

&#x20;  - `sentence-transformers` genera embeddings.

&#x20;  - \*\*Se calcula embedding del resumen denso\*\* (representación global) y \*\*de cada chunk\*\* (representación local).

&#x20;  - Similitud coseno con prototipos por categoría.

&#x20;  - Score global = 0.6·(resumen) + 0.4·(media de chunks).

&#x20;  - Si margen amplio → salida con `metodo="embedding"`.



3\. \*\*Capa 3 — LLM (árbitro con contexto controlado):\*\*

&#x20;  - Se invoca solo si las capas previas son ambiguas o hay conflicto.

&#x20;  - \*\*Estrategia anti-saturación:\*\*

&#x20;    - \*\*Paso 3.1 — Clasificación global con resumen denso:\*\* prompt compacto con resumen (≤ `resumen\_max\_tokens`) + taxonomía + 2–3 ejemplos few-shot. Costo de tokens acotado.

&#x20;    - \*\*Paso 3.2 — Si la confianza del paso 3.1 < `confianza\_baja`, clasificación por chunks:\*\*

&#x20;      - Seleccionar `max\_chunks\_llm` chunks (por defecto 5) usando \*\*priorización\*\*: primero chunk de encabezado, último chunk (firmas/anexos), y los de mayor score de embedding hacia categorías candidatas.

&#x20;      - Cada chunk se clasifica individualmente con prompt corto.

&#x20;      - \*\*Agregación:\*\* `estrategia\_agregacion` configurable:

&#x20;        - `voto\_mayoria`: categoría más votada.

&#x20;        - `ponderada`: peso por posición (encabezado y firma pesan más) y por score de embedding.

&#x20;        - `jerarquica`: si el chunk de encabezado tiene confianza alta, prevalece.

&#x20;    - \*\*Paso 3.3 — Cálculo de confianza final:\*\* combinar confianza global (resumen) y agregada (chunks) mediante media ponderada.

&#x20;  - Salida estructurada JSON validada con Pydantic.



4\. \*\*Fusión:\*\*

&#x20;  - Combinar scores (reglas + embeddings + LLM) con pesos configurables.

&#x20;  - Elegir categoría principal y tipo.

&#x20;  - Asignar etiquetas secundarias (multi-etiqueta).



5\. \*\*Umbral de revisión:\*\*

&#x20;  - Si `confianza < confianza\_baja` → `requiere\_revision=True`, sufijo `\_REVISAR`.

&#x20;  - Si `confianza ≥ confianza\_alta` → auto-publicación.



6\. \*\*Registro de evidencia extendida:\*\* número de chunks, votos por categoría, tokens usados, motivo de activación del LLM.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Texto vacío o ilegible:\*\* `OTR` + `\_REVISAR`.

\- \*\*A2 — Documento mixto:\*\* clasificación por página dominante; registrar `paginas\_secundarias`.

\- \*\*A3 — LLM no disponible:\*\* degradar a reglas + embeddings; registrar `llm\_unavailable`.

\- \*\*A4 — Múltiples categorías empatadas:\*\* `AMBIGUO` → revisión.

\- \*\*A5 — Documento excede capacidad de chunks:\*\* reducir `max\_chunks\_llm` y priorizar encabezado + firma + primeros chunks.

\- \*\*A6 — Prompt excede ventana de contexto:\*\* truncar resumen o reducir few-shot; si aún excede → usar solo paso 3.2 (chunks).



\*\*Postcondiciones:\*\*

\- Clasificación con evidencia, confianza y trazabilidad de uso de contexto.

\- \*\*Ningún prompt excede la ventana de contexto del LLM objetivo.\*\*



\*\*Rendimiento:\*\*

\- Reglas + embeddings: < 500 ms.

\- Con LLM local (Ollama): 1–5 s (resumen) + 0.5–1 s por chunk adicional.

\- Con LLM remoto: 2–8 s según red.



\*\*Métricas:\*\*

\- F1 por categoría > 0.85.

\- Tasa de auto-publicación > 80%.

\- Tasa de revisión < 20%.

\- `% prompts dentro de ventana` = 100%.

\- Latencia p95 con LLM < 15 s.



\---



\### UC-04: Extracción de Metadatos y Entidades



\*\*Propósito:\*\* Extraer campos estructurados clave (fecha, entidad, persona, ID, versión) que alimentan la convención de nombres, \*\*respetando los límites de contexto del LLM mediante uso de resumen denso, chunks priorizados y extracción en dos pasadas\*\*.



\*\*Actores:\*\* Motor de Extracción de Metadatos, NLPPort, LLMPort, ChunkerPort.



\*\*Precondiciones:\*\*

\- `TextoExtraido`, `ResumenDenso`, `Chunks\[]` y `ClasificacionResultado` disponibles.

\- Esquema de metadatos por tipo documental (YAML).

\- Ventana de contexto del LLM conocida.



\*\*Inputs:\*\*

\- Texto normalizado + resumen denso + chunks.

\- Esquema de campos por tipo (`factura`, `contrato`, `certificado`, etc.).

\- Configuración: `max\_tokens\_prompt`, `max\_chunks\_metadatos`, `priorizar\_encabezado\_firma`.



\*\*Outputs:\*\*

\- `MetadatosExtraidos`: `fecha\_documento`, `entidad\_emisora`, `entidad\_receptora`, `persona\_relacionada`, `identificador`, `version`, `confianza\_global`.

\- Evidencia por campo (fuente: `regla`, `ner`, `llm\_resumen`, `llm\_chunk`).



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Pasada 1 — Reglas + NER sobre texto completo (barato, sin LLM):\*\*

&#x20;  - \*\*NER con spaCy:\*\* personas, organizaciones, ubicaciones, fechas.

&#x20;  - \*\*Regex por tipo documental:\*\* RUC, DNI, número de factura, total, notaría, código.

&#x20;  - \*\*dateparser:\*\* normaliza fechas en múltiples formatos y locales.

&#x20;  - \*\*Detección de versión:\*\* `v1`, `v2`, `rev`, `final`, `borrador`.

&#x20;  - Resultado parcial con confianza por campo.



2\. \*\*Pasada 2 — LLM sobre resumen denso (contexto controlado):\*\*

&#x20;  - Prompt compacto: resumen denso (≤ `resumen\_max\_tokens`) + lista de campos faltantes + esquema del tipo documental.

&#x20;  - Solo se invoca si hay campos críticos sin resolver (fecha, entidad o persona).

&#x20;  - Salida JSON validada con Pydantic.



3\. \*\*Pasada 3 — LLM sobre chunks priorizados (fallback quirúrgico):\*\*

&#x20;  - Se activa si la pasada 2 no resuelve campos críticos.

&#x20;  - \*\*Priorización de chunks:\*\*

&#x20;    - Primer chunk (encabezado, suele tener emisor/fecha).

&#x20;    - Últimos chunks (firmas, sellos, pies con ID).

&#x20;    - Chunks que contienen palabras clave del tipo documental (`factura`, `contrato`, `certificado`, `total`, `firma`).

&#x20;  - Cada chunk se procesa individualmente con prompt corto y específico por campo.

&#x20;  - Se agregan resultados con reglas de precedencia (encabezado > firma > cuerpo).



4\. \*\*Resolución de conflictos:\*\*

&#x20;  - Si múltiples entidades → emisor > receptor.

&#x20;  - Si múltiples personas → titular > beneficiario.

&#x20;  - Si múltiples fechas → fecha de emisión > fecha de vencimiento > fecha de firma.



5\. \*\*Cálculo de confianza por campo\*\* y `confianza\_global` (media ponderada por criticidad).



6\. Emisión de `MetadatosExtraidos` con evidencia.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Fecha no detectada:\*\* usar `mtime` con flag `FECHA-ESTIMADA`.

\- \*\*A2 — Entidad no detectada:\*\* `DESCONOCIDO` + `\_REVISAR`.

\- \*\*A3 — ID no detectado:\*\* hash corto (`sha256\[:8]`).

\- \*\*A4 — Documento demasiado extenso:\*\* omitir pasada 2 y usar pasada 3 con chunks priorizados.

\- \*\*A5 — Ventana de contexto insuficiente:\*\* reducir `max\_chunks\_metadatos`; si aún excede → modo solo reglas + NER + `\_REVISAR`.

\- \*\*A6 — LLM no disponible:\*\* solo pasada 1; marcar campos faltantes para revisión.



\*\*Postcondiciones:\*\*

\- Metadatos listos para naming con evidencia y trazabilidad.

\- \*\*Ningún prompt excede la ventana de contexto del LLM.\*\*



\*\*Rendimiento:\*\*

\- Pasada 1 (reglas + spaCy): < 300 ms.

\- Pasada 2 (LLM resumen): 1–3 s.

\- Pasada 3 (LLM chunks): 0.5–1 s por chunk (máx 3–5 chunks).



\*\*Métricas:\*\*

\- Precisión de extracción > 0.80 por campo.

\- `% documentos con todos los campos críticos` > 75%.

\- `% prompts dentro de ventana` = 100%.



\---



\### UC-05: Generación de Nombre Estructurado



\*\*Propósito:\*\* Construir un nombre de archivo claro, consistente y ordenable a partir de metadatos, aplicando la convención y resolviendo ambigüedades.



\*\*Actores:\*\* Generador de Nombres, NamingPort.



\*\*Precondiciones:\*\*

\- `ClasificacionResultado` + `MetadatosExtraidos` disponibles.

\- `convencion.yaml` cargado.



\*\*Inputs:\*\*

\- Categoría, tipo, entidad/persona, ID, fecha, versión.

\- Estado (`REVISAR`, `DUP01`, `BLOQUEADO`).



\*\*Outputs:\*\*

\- `nombre\_final`, `ruta\_logica\_final`.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Normalización de tokens:\*\* mayúsculas, sin acentos, sin espacios; eliminar `/\\:\*?"<>|`.

2\. \*\*Construcción:\*\*

&#x20;  ```

&#x20;  {YYYY-MM-DD}\_{CAT}\_{TIPO}\_{ENTIDAD-PERSONA}\_{ID}\_{vNN}{\_ESTADO}.{ext}

&#x20;  ```

3\. \*\*Reglas de desambiguación:\*\*

&#x20;  - Sin fecha → `0000-00-00` + `\_FECHA-ESTIMADA`.

&#x20;  - Múltiples entidades → emisor > receptor.

&#x20;  - Múltiples personas → titular > beneficiario.

&#x20;  - Baja confianza → `\_REVISAR`.

&#x20;  - Duplicado → `\_DUP01`, `\_DUP02`.

&#x20;  - Bloqueado → `\_BLOQUEADO`.

4\. \*\*Colisión:\*\* verificar destino; incrementar `vNN` o añadir `\_v02`.

5\. \*\*Longitud:\*\* truncar entidad a 60 chars; total ≤ 180.

6\. \*\*Ruta lógica:\*\* `{categoria}/{YYYY}/{MM}/{nombre\_final}`.

7\. Emisión.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Nombre inválido en SO:\*\* fallback hash + extensión.

\- \*\*A2 — Colisión persistente:\*\* añadir timestamp corto (`\_T143022`).



\*\*Postcondiciones:\*\*

\- Nombre único, válido y trazable.



\*\*Rendimiento:\*\*

\- < 50 ms por documento.



\---



\### UC-06: Organización, Movimiento y Publicación



\*\*Propósito:\*\* Publicar el documento en la carpeta destino, garantizando consistencia entre BD y filesystem mediante patrón outbox, \*\*manejando explícitamente el caso de movimiento entre volúmenes/particiones distintas\*\*.



\*\*Actores:\*\* Organizador, StoragePort, Repositorio de Auditoría.



\*\*Precondiciones:\*\*

\- `nombre\_final` y `ruta\_logica\_final` definidos.

\- Carpeta destino accesible.



\*\*Inputs:\*\*

\- Documento original + nombre final + ruta lógica.

\- Política: `mover` vs `copiar`; `mantener\_original`.



\*\*Outputs:\*\*

\- Archivo en `Organizados/{categoria}/{YYYY}/{MM}/{nombre\_final}`.

\- Estado `MOVIDO` o `FALLO` en auditoría.

\- \*\*Registro del método usado:\*\* `rename\_atomico` o `copy\_and\_delete`.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Persistencia outbox:\*\* insertar `DocumentoProcesado` con estado `PENDIENTE\_MOVER`.

2\. \*\*Creación de carpetas destino\*\* si no existen.

3\. \*\*Detección de mismo volumen / partición:\*\*

&#x20;  - Comparar `os.stat(ruta\_origen).st\_dev` con `os.stat(carpeta\_destino).st\_dev`.

&#x20;  - \*\*Mismo `st\_dev` → movimiento atómico\*\* con `os.replace(origen, destino)`.

&#x20;  - \*\*Distinto `st\_dev` → Copy-and-Delete\*\* (ver paso 4).

4\. \*\*Movimiento cross-partition (Copy-and-Delete):\*\*

&#x20;  - \*\*Copiar a destino temporal\*\* en la misma partición del destino: `{destino}.tmp-{uuid}`.

&#x20;  - `shutil.copy2(origen, destino\_tmp)` preservando metadatos.

&#x20;  - \*\*Verificación de integridad post-copia:\*\*

&#x20;    - Tamaño coincide.

&#x20;    - Hash coincide (`sha256` del origen vs. destino).

&#x20;  - \*\*Renombrar atómico dentro del destino:\*\* `os.replace(destino\_tmp, destino\_final)`.

&#x20;  - \*\*Eliminar origen\*\* (si `mantener\_original=false`).

&#x20;  - \*\*Limpieza ante error a mitad del proceso:\*\*

&#x20;    - Si falla la copia → eliminar `destino\_tmp`; estado `FALLO\_COPIA`; reintentar.

&#x20;    - Si falla el `os.replace` → eliminar `destino\_tmp`; origen intacto; estado `FALLO\_RENAME`.

&#x20;    - Si falla la eliminación del origen → \*\*mantener ambos\*\*, marcar `FALLO\_LIMPIEZA`, registrar ruta duplicada, alertar al administrador (no perder datos).

&#x20;  - \*\*Idempotencia:\*\* si `destino\_final` ya existe y coincide hash → eliminar `destino\_tmp` y continuar; si no coincide → renombrar con sufijo incremental.

5\. \*\*Verificación post-movimiento:\*\* archivo existe, tamaño coincide, hash coincide.

6\. \*\*Actualización de estado\*\* a `MOVIDO` con ruta final, método y timestamp.

7\. \*\*Si falla:\*\* `FALLO`, registrar excepción, reintentar o enviar a `\_Pendientes`.



\*\*Nota técnica — Atomicidad en filesystem:\*\*



> `os.replace` es atómico \*\*solo si origen y destino residen en el mismo sistema de archivos / partición / volumen\*\*. Cuando `st\_dev` difiere, el SO no puede garantizar atomicidad y la operación se degrada a copia + eliminación. El sistema detecta esta condición explícitamente y aplica el patrón \*\*Copy-and-Delete\*\* con archivo temporal, verificación de integridad, rename atómico final dentro del volumen destino y limpieza transaccional ante cualquier fallo intermedio. En ningún caso el origen se elimina antes de que el destino esté verificado.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Permiso denegado:\*\* `FALLO\_PERMISO`, alerta al administrador.

\- \*\*A2 — Disco lleno:\*\* `FALLO\_DISCO`, pausar pipeline.

\- \*\*A3 — Colisión inesperada:\*\* renombrar con sufijo incremental y reintentar.

\- \*\*A4 — Cross-partition con archivo grande:\*\* copia en streaming por chunks; progreso registrado.

\- \*\*A5 — Crash entre copia y delete:\*\* al reiniciar, el sistema detecta `destino\_tmp` huérfano o `origen` + `destino\_final` con mismo hash → reconcilia según política.



\*\*Postcondiciones:\*\*

\- Documento publicado y trazable.

\- BD y filesystem consistentes.

\- \*\*Sin pérdida de datos en ningún escenario de fallo.\*\*



\*\*Rendimiento:\*\*

\- Mismo volumen: < 200 ms.

\- Cross-partition: dependiente de tamaño y velocidad de disco; < 2 s para documentos típicos (< 10 MB).

\- Documentos grandes (> 100 MB): < 30 s con progreso.



\*\*Métricas:\*\*

\- `% movimientos exitosos` > 99.9%.

\- `% inconsistencias BD-filesystem` = 0 en operación normal.

\- `% recuperaciones exitosas tras crash` = 100%.



\---



\### UC-07: Auditoría, Trazabilidad y Control de Duplicados



\*\*Propósito:\*\* Registrar cada decisión del pipeline y detectar duplicados por hash.



\*\*Actores:\*\* Repositorio de Auditoría, WriterThread, Auditor.



\*\*Precondiciones:\*\* SQLite en modo WAL con PRAGMAs configurados.



\*\*Inputs:\*\* Eventos del pipeline; SHA-256 de cada documento.



\*\*Outputs:\*\* Registros en `auditoria.db`; reportes CSV/JSON.



\*\*Comunicación / Flujo Principal:\*\*



1\. Workers envían eventos a `Local Event Bus` → `WriterThread`.

2\. `WriterThread` agrupa en batches y ejecuta transacciones atómicas.

3\. Lectores (UI/CLI) usan conexión RO, sin bloquear al escritor.

4\. \*\*Detección de duplicados:\*\* `buscar\_por\_hash(sha256)`.

5\. \*\*Checkpoint periódico:\*\* `PRAGMA wal\_checkpoint(TRUNCATE)`.

6\. \*\*Backup:\*\* `VACUUM INTO`.

7\. \*\*Exportación:\*\* reportes con filtros.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — BD bloqueada:\*\* `busy\_timeout=5000`.

\- \*\*A2 — WAL crece demasiado:\*\* checkpoint forzado.

\- \*\*A3 — Corrupción de BD:\*\* restaurar desde backup.



\*\*Postcondiciones:\*\* Trazabilidad completa; cero `database is locked`.



\---



\### UC-08: Revisión Humana y Ajuste de Umbrales



\*\*Propósito:\*\* Permitir al analista revisar, corregir y aprobar documentos con baja confianza.



\*\*Actores:\*\* Analista Documental, UI Streamlit, Review Rules Engine.



\*\*Precondiciones:\*\* Documentos en `\_Pendientes` con `requiere\_revision=True`.



\*\*Inputs:\*\* Documento + clasificación + metadatos + evidencia. Corrección del analista.



\*\*Outputs:\*\* Documento reclasificado y republicado; registro de corrección; actualización opcional de prototipos.



\*\*Comunicación / Flujo Principal:\*\*



1\. UI lista `\_Pendientes` ordenados por prioridad/confianza.

2\. Analista revisa evidencia (\*\*incluyendo número de chunks usados y votos del LLM\*\*).

3\. Analista corrige campos y confirma.

4\. Sistema recalcula nombre y ruta, mueve documento, registra corrección.

5\. \*\*Retroalimentación opcional:\*\* añadir ejemplo al set de prototipos.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Documento irrelevante:\*\* `DESCARTADO`.

\- \*\*A2 — Duplicado confirmado:\*\* `DUP`.

\- \*\*A3 — Corrección masiva:\*\* selección múltiple.



\*\*Postcondiciones:\*\* Cola de revisión vaciada progresivamente.



\---



\### UC-09: Integración y Consumo (UI / CLI / API)



\*\*Propósito:\*\* Exponer resultados, métricas y operaciones a usuarios y sistemas externos.



\*\*Actores:\*\* API/CLI Gateway, Dashboard, sistemas de terceros.



\*\*Precondiciones:\*\* Servicios locales activos; token local opcional.



\*\*Inputs:\*\* Comandos CLI, peticiones HTTP, eventos WebSocket.



\*\*Outputs:\*\* JSON, CSV, reportes, streams.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*CLI:\*\* `reto5 procesar|vigilar|revisar|reporte`.

2\. \*\*UI Streamlit:\*\* carga, resultados, cola, métricas, bitácora.

3\. \*\*API local (opcional):\*\* `POST /documentos`, `GET /documentos/{id}`, `GET /metrics/clasificacion`, `GET /auditoria`, `WS /stream`.

4\. \*\*Exportación:\*\* CSV/JSON, manifiesto `organizacion.json`.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — UI sin BD:\*\* modo RO con caché.

\- \*\*A2 — API saturada:\*\* rate limiting local + backpressure.

\- \*\*A3 — Exportación grande:\*\* streaming por chunks.



\*\*Postcondiciones:\*\* Información consistente sin acoplamiento a BD.



\---



\### UC-10: Mantenimiento, Configuración y Administración



\*\*Propósito:\*\* Gestionar configuración, taxonomía, convención, umbrales y mantenimiento de BD.



\*\*Actores:\*\* Administrador del Sistema.



\*\*Precondiciones:\*\* Acceso a archivos YAML.



\*\*Inputs:\*\* Ediciones; comandos de mantenimiento.



\*\*Outputs:\*\* Configuración aplicada; BD mantenida.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Configuración:\*\* validación con Pydantic; hot reload.

2\. \*\*Mantenimiento:\*\* `checkpoint`, `vacuum`, `backup`, `optimizar`.

3\. \*\*Diagnóstico:\*\* `reto5 admin estado` → workers, cola, WAL size, locks, \*\*uso de contexto del LLM\*\*.

4\. \*\*Migración futura:\*\* preparar cambio a PostgreSQL.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Configuración inválida:\*\* rechazar; mantener anterior.

\- \*\*A2 — Migración de esquema:\*\* scripts versionados.



\*\*Postcondiciones:\*\* Sistema configurado y observable.



\---



\### UC-11: Seguridad, Privacidad y Manejo de PII



\*\*Propósito:\*\* Proteger información sensible con opción local y enmascaramiento antes de LLM remoto.



\*\*Actores:\*\* Administrador, Auditor, Motor de Clasificación, LLMPort.



\*\*Precondiciones:\*\* Política de privacidad configurada.



\*\*Inputs:\*\* Documentos con PII potencial.



\*\*Outputs:\*\* Documentos procesados con PII protegida; registro de enmascaramiento.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Detección de PII:\*\* spaCy NER + regex.

2\. \*\*Enmascaramiento antes de LLM remoto:\*\* tokens `<PERSONA\_1>`, rehidratación posterior.

3\. \*\*LLM local por defecto\*\* para documentos sensibles.

4\. \*\*Cifrado opcional\*\* (SQLCipher; carpeta cifrada).

5\. \*\*Control de acceso\*\* por permisos del SO.

6\. \*\*Auditoría de acceso.\*\*

7\. \*\*Sin telemetría saliente.\*\*



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — LLM remoto no permitido:\*\* forzar local.

\- \*\*A2 — PII en nombre:\*\* enmascarar o hash.



\*\*Postcondiciones:\*\* PII protegida y trazable.



\---



\### UC-12: Observabilidad y Métricas de Calidad



\*\*Propósito:\*\* Medir desempeño y detectar degradaciones.



\*\*Actores:\*\* Administrador, Analista, Dashboard.



\*\*Precondiciones:\*\* Logs y auditoría activos.



\*\*Inputs:\*\* Eventos, timestamps, decisiones, confianzas, \*\*tokens usados por LLM, número de chunks\*\*.



\*\*Outputs:\*\* Dashboard; reportes periódicos.



\*\*Comunicación / Flujo Principal:\*\*



1\. \*\*Recolección:\*\* logs estructurados con `doc\_id`, `etapa`, `resultado`, `duración`, `tokens\_llm`.

2\. \*\*Cálculo:\*\* throughput, latencia (p50, p95), tasa de auto-publicación, distribución de categorías, tasas de duplicados/corruptos/bloqueados, F1 estimado, \*\*costo de contexto (tokens/doc)\*\*.

3\. \*\*Alertas locales:\*\* cola saturada, tasa de revisión alta, errores de BD, \*\*prompts cerca del límite de contexto\*\*.

4\. \*\*Visualización:\*\* Streamlit con gráficos.



\*\*Flujos Alternativos:\*\*



\- \*\*A1 — Sin datos:\*\* "recolectando".

\- \*\*A2 — Degradación:\*\* alerta.



\*\*Postcondiciones:\*\* Visibilidad operativa y de calidad.



\---



\## 4. Matriz de Trazabilidad — Reto 5 vs. Casos de Uso



| Requisito del Reto | Criterio | Casos de Uso |

|---|---|---|

| 1. Análisis de documentos | Análisis documental | UC-01, UC-02, UC-04 |

| 2. Clasificación documental | Clasificación | UC-03, UC-08 |

| 3. Nombramiento automatizado | Nombramiento | UC-05 |

| 4. Automatización del flujo | Automatización | UC-01, UC-06, UC-07 |

| 5. Documentación y justificación | Documentación | UC-10, UC-12, todos |

| Formatos diversos | Análisis | UC-01, UC-02 |

| Incompletos / mal nombrados | Robustez | UC-01, UC-04, UC-05 |

| Duplicados | Control | UC-07 |

| Escaneados | OCR | UC-02 |

| Ambigüedad | Revisión | UC-03, UC-08 |

| Protección de información | Privacidad | UC-11 |

| Integración con almacenamiento/APIs | Arquitectura | UC-06, UC-09 |

| \*\*Atomicidad cross-partition\*\* | \*\*Robustez\*\* | \*\*UC-06\*\* |

| \*\*Límites de contexto LLM\*\* | \*\*Uso de IA\*\* | \*\*UC-02, UC-03, UC-04\*\* |



\---



\## 5. Matriz de Actores vs. Casos de Uso



| Actor \\ UC | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 |

|---|---|---|---|---|---|---|---|---|---|---|---|---|

| Analista Documental | | | | | | | | ● | ● | | | ● |

| Administrador | | | | | | | | | ● | ● | ● | ● |

| Auditor | | | | | | | ● | | ● | | ● | |

| Desarrollador | | | | | | | | | ● | ● | | |

| Nodo de Ingesta | ● | | | | | | ● | | | | | |

| Motor de Extracción | | ● | | ● | | | | | | | | |

| Motor de Clasificación | | | ● | | | | | | | | ● | |

| Generador de Nombres | | | | | ● | | | | | | | |

| Organizador | | | | | | ● | ● | | | | | |

| WriterThread | | | | | | | ● | | | | | |

| API/CLI Gateway | | | | | | | | | ● | | | |

| Dashboard/UI | | | | | | | | ● | ● | | | ● |



\---



\## 6. Reglas de Negocio Transversales



| ID | Regla | Aplica a |

|---|---|---|

| RN-01 | Nunca procesar archivos en tránsito | UC-01 |

| RN-02 | Deduplicar por SHA-256 | UC-01, UC-07 |

| RN-03 | Validar integridad por magic bytes | UC-01 |

| RN-04 | Toda decisión debe ser trazable | UC-03, UC-04, UC-05, UC-07 |

| RN-05 | Confianza < umbral → `\_REVISAR` | UC-03, UC-05, UC-08 |

| RN-06 | Nombres normalizados: mayúsculas, sin acentos, sin espacios | UC-05 |

| RN-07 | Consistencia BD ↔ filesystem vía outbox | UC-06, UC-07 |

| RN-08 | Lectores RO, escritor único, WAL | UC-07, UC-09 |

| RN-09 | PII protegida; LLM local por defecto | UC-11 |

| RN-10 | Configuración externa validada | UC-10 |

| RN-11 | Longitud de nombre ≤ 180 chars | UC-05 |

| RN-12 | Backoff exponencial en reintentos | UC-01 |

| RN-13 | Lock huérfano expira a los 10 min | UC-01 |

| RN-14 | Reportes exportables sin tocar BD directa | UC-09 |

| \*\*RN-15\*\* | \*\*`os.replace` solo si origen y destino comparten `st\_dev`; si no, Copy-and-Delete con temporal y verificación\*\* | \*\*UC-06\*\* |

| \*\*RN-16\*\* | \*\*Nunca eliminar el origen antes de verificar el destino (tamaño + hash)\*\* | \*\*UC-06\*\* |

| \*\*RN-17\*\* | \*\*Ningún prompt al LLM debe exceder `llm\_ventana\_contexto`; en su defecto, usar resumen denso o chunks priorizados\*\* | \*\*UC-03, UC-04\*\* |

| \*\*RN-18\*\* | \*\*Documentos extensos se procesan por chunks con estrategia de agregación configurable (voto\_mayoria, ponderada, jerarquica)\*\* | \*\*UC-03\*\* |

| \*\*RN-19\*\* | \*\*Ante fallo de limpieza cross-partition, mantener ambos archivos y alertar; nunca perder datos\*\* | \*\*UC-06\*\* |

| \*\*RN-20\*\* | \*\*Registrar tokens usados por LLM y número de chunks para auditoría y control de costo\*\* | \*\*UC-03, UC-04, UC-12\*\* |



\---



\## 7. Requisitos No Funcionales



| Categoría | Requisito | UC relacionado |

|---|---|---|

| Rendimiento | < 10 s por documento típico | UC-02, UC-03, UC-06 |

| Rendimiento | Throughput ≥ 100 docs/hora con 3 workers | UC-01, UC-02 |

| Escalabilidad | Añadir workers sin reconfigurar pipeline | UC-01, UC-02 |

| Concurrencia | Cero `database is locked` | UC-07, UC-09 |

| Concurrencia | Cero procesamiento de archivos en tránsito | UC-01 |

| Confiabilidad | Recuperación ante crash entre commit y move | UC-06, UC-07 |

| \*\*Atomicidad\*\* | \*\*`os.replace` en mismo volumen; Copy-and-Delete verificado en cross-volume\*\* | \*\*UC-06\*\* |

| \*\*Atomicidad\*\* | \*\*Cero pérdida de datos en cualquier escenario de fallo\*\* | \*\*UC-06\*\* |

| \*\*Contexto LLM\*\* | \*\*100% de prompts dentro de `llm\_ventana\_contexto`\*\* | \*\*UC-03, UC-04\*\* |

| \*\*Contexto LLM\*\* | \*\*Latencia p95 con LLM < 15 s\*\* | \*\*UC-03, UC-04\*\* |

| \*\*Contexto LLM\*\* | \*\*Costo de tokens auditable por documento\*\* | \*\*UC-03, UC-04, UC-12\*\* |

| Seguridad | PII enmascarada antes de LLM remoto | UC-11 |

| Privacidad | Procesamiento 100% local por defecto | UC-11 |

| Mantenibilidad | Puertos/adaptadores, sin acoplamiento | UC-10, todos |

| Portabilidad | Migrable a PostgreSQL y storage virtual | UC-10 |

| Observabilidad | Logs estructurados + métricas | UC-12 |

| Usabilidad | UI con cola de revisión clara | UC-08 |

| Documentación | ADRs, manuales, contratos | UC-10, UC-12 |



\---



\## 8. ADRs Actualizados



| ADR | Decisión | Justificación |

|---|---|---|

| ADR-001 | Local-first monousuario | Alcance del reto, simplicidad, privacidad |

| ADR-002 | Arquitectura por capas con puertos/adaptadores | Portabilidad futura |

| ADR-003 | Pipeline híbrido (reglas + NLP + embeddings + LLM) | Robustez, explicabilidad |

| ADR-004 | SQLite como repositorio inicial | Cero configuración |

| ADR-005 | OCR con Tesseract + PaddleOCR | Cobertura amplia |

| ADR-006 | LLM local por defecto (Ollama) | Privacidad y costo cero |

| ADR-007 | Convención de nombres `YYYY-MM-DD\_CAT\_TIPO\_ENTIDAD\_ID\_vNN` | Ordenable, filtrable |

| ADR-008 | Umbral de confianza → `\_Pendientes` | Precisión sobre cobertura |

| ADR-009 | Auditoría obligatoria por documento | Trazabilidad |

| ADR-010 | Configuración externa en YAML | Flexibilidad |

| ADR-011 | File locking en 5 capas | Evita OCR sobre archivos en tránsito |

| ADR-012 | SQLite WAL + escritor único + lectores RO | Elimina `database is locked` |

| ADR-013 | Patrón outbox para mover archivos tras commit | Consistencia BD ↔ filesystem |

| ADR-014 | `FileLockPort` y `MetadataRepoPort` como puertos | Portabilidad cross-platform |

| \*\*ADR-015\*\* | \*\*Detección de `st\_dev` + Copy-and-Delete con temporal, verificación de integridad y limpieza transaccional para movimientos cross-partition\*\* | \*\*`os.replace` no es atómico entre volúmenes; se garantiza consistencia sin pérdida de datos\*\* |

| \*\*ADR-016\*\* | \*\*Chunking + resumen denso + agregación de votos para LLM; pasadas múltiples en UC-04 con priorización de chunks\*\* | \*\*Evita saturar la ventana de contexto del LLM local; mantiene precisión y controla costo\*\* |



\---



\## 9. Plan por Fases



| Fase | Entregable |

|---|---|

| \*\*Fase 0\*\* | Arquitectura, taxonomía, convención, stack, ADRs, concurrencia, \*\*atomicidad filesystem, gestión de contexto LLM\*\* \*(este documento)\* |

| Fase 1 | UC-01 (ingesta robusta) + UC-02 (extracción + OCR + chunking + resumen) |

| Fase 2 | UC-03 (clasificación híbrida con chunks) + UC-04 (metadatos con pasadas) |

| Fase 3 | UC-05 (naming) + UC-06 (organización con cross-partition) |

| Fase 4 | UC-08 (revisión) + UC-09 (UI/CLI/API) + UC-10 (admin) |

| Fase 5 | UC-11 (PII) + UC-12 (observabilidad) + pruebas end-to-end + demo |



\---



\## 10. Plan de Pruebas Ampliado



\### Funcionales

\- Clasificación por categoría.

\- Extracción de fecha, entidad, persona, ID, versión.

\- Naming correcto.

\- Duplicados por SHA-256.

\- OCR sobre PDF escaneado e imagen.



\### Concurrencia

| Test | Objetivo |

|---|---|

| `test\_archivo\_estable` | No procesar hasta estabilizar |

| `test\_file\_lock\_posix/windows` | Solo un proceso gana el lock |

| `test\_cuarentena\_backoff` | Reintentos y `\_Pendientes` |

| `test\_magic\_bytes` | Extensión mentida → `CORRUPTO` |

| `test\_wal\_concurrent\_read\_write` | Sin `database is locked` |

| `test\_outbox\_crash\_recovery` | Recuperación tras crash |

| `test\_checkpoint` | WAL truncado |

| `test\_idempotencia\_sha256` | Duplicado detectado |



\### Atomicidad Filesystem (nuevas)

| Test | Objetivo |

|---|---|

| `test\_move\_same\_partition` | `os.replace` usado cuando `st\_dev` coincide |

| `test\_move\_cross\_partition` | Copy-and-Delete con temporal y verificación |

| `test\_copy\_delete\_falla\_copia` | Elimina `destino\_tmp`, origen intacto |

| `test\_copy\_delete\_falla\_rename` | Elimina `destino\_tmp`, origen intacto |

| `test\_copy\_delete\_falla\_delete` | Mantiene ambos, alerta, sin pérdida |

| `test\_destino\_tmp\_huerfano` | Reconciliación al reiniciar |

| `test\_hash\_mismatch\_post\_copia` | Detecta corrupción, reintenta |



\### Contexto LLM (nuevas)

| Test | Objetivo |

|---|---|

| `test\_chunk\_max\_tokens` | Ningún chunk excede el límite |

| `test\_resumen\_max\_tokens` | Resumen dentro del límite |

| `test\_prompt\_dentro\_ventana` | 100% de prompts válidos |

| `test\_agregacion\_voto\_mayoria` | Chunks votan correctamente |

| `test\_agregacion\_ponderada` | Pesos por posición y score |

| `test\_agregacion\_jerarquica` | Encabezado prevalece |

| `test\_fallback\_sin\_llm` | Degradación a reglas + embeddings |

| `test\_documento\_extenso` | Chunking jerárquico y resumen de resúmenes |



\---



\## 11. Entregables de la Fase 0



1\. Documento de arquitectura general (`planeacion\_v2.0.1.md`).

2\. Comparativa de alternativas y justificación.

3\. Taxonomía documental inicial.

4\. Convención de nombramiento.

5\. Flujo de procesamiento documental.

6\. Stack tecnológico definido.

7\. Contratos de datos.

8\. Plan de pruebas y métricas.

9\. ADRs (001–016).

10\. Riesgos, limitaciones y mejoras.

11\. Diseño de concurrencia de ingesta (5 capas).

12\. Diseño de transacciones SQLite (WAL, WriterThread, outbox).

13\. \*\*Diseño de atomicidad cross-partition (Copy-and-Delete con limpieza).\*\*

14\. \*\*Diseño de gestión de contexto LLM (chunking, resumen denso, agregación de votos).\*\*

15\. \*\*Casos de uso completos (este documento).\*\*



\---



\## 12. Conclusión



`CDU\_v1.0.1` especifica los \*\*12 casos de uso\*\* que cubren el 100% de los requisitos del Reto 5, ahora con dos robustecimientos críticos:



1\. \*\*Atomicidad en filesystem (UC-06):\*\* detección de `st\_dev` y patrón Copy-and-Delete con archivo temporal, verificación de integridad y limpieza transaccional. Cero pérdida de datos en cualquier escenario.

2\. \*\*Gestión de contexto del LLM (UC-02, UC-03, UC-04):\*\* chunking semántico, resumen denso, pasadas múltiples con priorización de chunks y agregación de votos. Cero prompts fuera de ventana, latencia acotada y costo auditable.



Ambos ajustes se reflejan en ADRs (015, 016), reglas de negocio (RN-15 a RN-20), requisitos no funcionales y plan de pruebas.



\*\*Próximo paso:\*\* derivar contratos de API/CLI, diagramas de secuencia por UC crítico (UC-01, UC-03, UC-04, UC-06) y comenzar \*\*Fase 1\*\* implementando UC-01 y UC-02.

