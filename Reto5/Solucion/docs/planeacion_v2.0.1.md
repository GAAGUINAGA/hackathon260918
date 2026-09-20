planeacion_v2.0.1.md
Sistema local de clasificación, organización y nombramiento automatizado de documentos
Versión: 2.0.1
Enfoque: Local-first, monousuario, arquitectura portable
Estado: Fase 0 — Diseño teórico, arquitectura y stack
Cambios vs v2.0.0: Se integran concurrencia de ingesta (file locking en 5 capas) y transacciones SQLite (WAL + escritor único + outbox).

0.1. Historial de versiones
Versión	Cambios
v1.0.0	Diseño inicial, alcance indefinido (local vs web)
v2.0.0	Local-first monousuario, puertos/adaptadores, stack definido
v2.0.1	+ Concurrencia en ingesta (file locking 5 capas)
+ SQLite WAL, escritor único, lectores RO, outbox
+ ADRs 011–014, tests de concurrencia
0.2. Objetivo de la Fase 0
Definir la solución completa antes de implementar código:

Entender el reto y sus criterios de evaluación.

Fijar el alcance: local, monousuario.

Definir arquitectura modular con puertos y adaptadores.

Establecer taxonomía documental y convención de nombres.

Definir flujo automatizado end-to-end.

Garantizar robustez ante concurrencia (ingesta y BD).

Seleccionar stack tecnológico.

Preparar el proyecto para implementarse por fases (1 a 5).

En esta fase no se escribe código funcional; se producen los planos.

0.3. Entendimiento del reto
El reto solicita una solución de IA para:

Analizar documentos de distintas fuentes, formatos y calidades.

Clasificarlos en categorías útiles y justificadas.

Extraer información relevante: fechas, entidades, personas, IDs, versiones.

Renombrarlos automáticamente con convención clara y consistente.

Automatizar el flujo desde la carga hasta el resultado.

Documentar y justificar arquitectura, herramientas, reglas y limitaciones.

Casos reales que debe contemplar:

PDF digitales, PDF escaneados, imágenes, DOCX, XLSX, TXT, CSV.

Archivos mal nombrados, duplicados, incompletos o desordenados.

OCR parcialmente legible.

Documentos con múltiples entidades, fechas ambiguas o sin fecha.

Distintas versiones de un mismo documento.

Información sensible o PII.

Archivos grandes copiándose mientras el sistema los detecta.

UI y workers accediendo a la BD simultáneamente.

Ruta base del reto:

text
Desktop/Hackathon/Reto 5/Documentos
Criterios de evaluación mapeados:

Criterio	Cómo se aborda
Análisis documental	Pipeline de extracción de texto, OCR, NLP y reglas
Clasificación	Taxonomía jerárquica configurable
Nombramiento	Convención estándar + reglas de desambiguación
Uso de IA	Híbrido: reglas + NLP + embeddings + LLM
Automatización	Flujo por etapas con cola de revisión
Arquitectura	Diseño modular por capas con puertos/adaptadores
Robustez	File locking + WAL + outbox + auditoría
Documentación	ADRs, contratos de datos, manuales y justificación
0.4. Alcance v2.0.1 (local, monousuario)
Incluye:

Ejecución en una sola máquina.

Observación y procesamiento de una carpeta local de entrada.

Clasificación, extracción, renombrado y organización en carpetas locales.

Auditoría en SQLite local (modo WAL).

UI local (Streamlit) y CLI (Typer).

Uso opcional de LLM local (Ollama) o remoto (OpenAI/Anthropic/Gemini).

Procesamiento por lotes e incremental.

Ingesta robusta ante archivos en tránsito.

Concurrencia segura entre workers, UI y CLI.

No incluye (queda para versiones futuras):

Autenticación, sesiones, cuentas de usuario.

Despliegue web público.

Multiusuario concurrente.

Object storage (S3/GCS/Azure).

Colas distribuidas, microservicios.

Firma digital, workflows de aprobación.

Preparado para:

Añadir VirtualStorageAdapter y autenticación sin reescribir el core.

Migrar de SQLite a PostgreSQL.

Reemplazar el agente local por una API web.

0.5. Alternativas de solución y comparativa
Alternativa	Descripción	Ventajas	Desventajas	¿Óptima?
A. Solo reglas heurísticas	Regex, palabras clave, metadatos	Rápida, explicable, barata	Frágil ante variaciones	No como solución única
B. ML clásico	TF-IDF + SVM/NB	Bueno con dataset etiquetado	Requiere dataset, poca generalización	Parcial
C. NLP/Transformers	spaCy, BERT, embeddings, zero-shot	Buena generalización, extrae entidades	Más complejo, puede requerir GPU	Sí, como componente
D. LLM multimodal	GPT-4o, Claude, Gemini, Ollama	Entiende contexto, maneja ambigüedad	Costo, latencia, no determinista	Sí, como árbitro/extracción
E. Pipeline híbrido	Reglas + OCR + NLP + embeddings + LLM	Robusto, explicable, eficiente	Requiere orquestación	Sí, solución óptima
Decisión
Pipeline híbrido modular:

Reglas deterministas para casos claros.

OCR para escaneos e imágenes.

NLP/embeddings para clasificación y similitud.

LLM como apoyo en casos ambiguos.

Umbrales de confianza para derivar a revisión.

Auditoría de cada decisión.

0.6. Arquitectura general v2.0.1
Arquitectura modular por capas con puertos/adaptadores. Monolito modular en local, evolucionable a servicios.

text
┌──────────────────────────────────────────────────────────────┐
│                       CAPA DE PRESENTACIÓN                    │
│   CLI (Typer)        UI local (Streamlit)      Reportes       │
│                        ▲  (lectores RO)                       │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                   CAPA DE APLICACIÓN                         │
│   Orquestador de pipeline   Casos de uso   Configuración     │
│                                                              │
│   ┌────────────────┐    ┌─────────────────┐                  │
│   │ Ingest Worker  │    │  WriterThread   │                  │
│   │  (N workers)   │───▶│  (escritor BD)  │                  │
│   └────────────────┘    └─────────────────┘                  │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                       CAPA DE DOMINIO                        │
│  Modelos: Documento, Clasificación, Metadatos, Nombre        │
│  Reglas: taxonomía, convención, desambiguación               │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                   CAPA DE INFRAESTRUCTURA                    │
│  Puertos: IngestPort, StoragePort, MetadataRepoPort,         │
│           OCRPort, NLPPort, LLMPort, FileLockPort            │
│  Adaptadores locales:                                        │
│    LocalFolderIngest + DebouncedEventHandler                 │
│    LocalFileSystemStorage + Outbox                           │
│    SQLiteMetadataRepo (WAL + WriterThread)                   │
│    TesseractOCR                                              │
│    SpaCyNLP                                                  │
│    OllamaLLM / OpenAILLM                                     │
│    PlatformFileLock (msvcrt / fcntl / lockfile)              │
└──────────────────────────────────────────────────────────────┘
Flujo del pipeline
text
[Entrada: Documentos/]
      │
      ▼
1. Ingesta        → watchdog + debounce + estabilidad + lock + hash + duplicados
      │
      ▼
2. Extracción     → texto nativo, OCR, metadatos, EXIF, propiedades
      │
      ▼
3. Normalización  → limpieza, encoding, fechas, idioma
      │
      ▼
4. Clasificación  → reglas + embeddings + LLM → categoría y tipo
      │
      ▼
5. Metadatos      → fecha, entidad, persona, ID, versión
      │
      ▼
6. Nombramiento   → convención + desambiguación → nombre final
      │
      ▼
7. Organización   → StoragePort.guardar + Outbox (mover tras commit)
      │
      ▼
8. Auditoría      → WriterThread → SQLite WAL
      │
      ▼
9. Presentación   → CLI/UI (RO), reporte CSV/JSON, _Pendientes
Puertos (interfaces)
python
class IngestPort:
    def listar_pendientes(self) -> list[Path]: ...
    def leer(self, path: Path) -> DocumentoRaw: ...

class FileLockPort:
    def try_lock(self, path: Path) -> bool: ...
    def release(self, path: Path) -> None: ...

class StoragePort:
    def guardar(self, doc_id, ruta_logica, contenido, metadata) -> str: ...
    def mover(self, ruta_origen, ruta_logica) -> str: ...
    def existe(self, ruta_logica) -> bool: ...

class MetadataRepoPort:
    def guardar(self, doc_procesado) -> None: ...
    def buscar_por_hash(self, sha256) -> DocumentoProcesado | None: ...
    def listar(self, filtros) -> list[DocumentoProcesado]: ...

class OCRPort:
    def extraer_texto(self, path: Path) -> str: ...

class NLPPort:
    def entidades(self, texto: str) -> Entidades: ...
    def clasificar(self, texto: str) -> ClasificacionCandidata: ...

class LLMPort:
    def analizar(self, prompt: str, contexto: dict) -> dict: ...
0.7. Flujo documental automatizado (detallado)
Carga

El usuario coloca documentos en Documentos/Entrada.

O ejecuta reto5 procesar --ruta ... desde CLI.

O usa la UI de Streamlit.

Detección y deduplicación

Calcular SHA-256 tras estabilizar y bloquear el archivo.

Si ya existe en auditoria.db → marcar como duplicado, no reprocesar.

Extracción de contenido

PDF digital → texto nativo.

PDF escaneado/imagen → OCR.

DOCX/XLSX → texto estructurado.

TXT/CSV → lectura directa.

Normalización

Limpiar caracteres, unificar fechas, detectar idioma.

Separar encabezado, cuerpo, pie si aplica.

Clasificación

Reglas de alta precisión.

Embeddings + similitud con prototipos.

LLM para casos ambiguos.

Salida: categoría, tipo, confianza, método.

Extracción de metadatos

Fecha del documento.

Entidad emisora/receptora.

Persona relacionada.

Número de documento/ID.

Versión.

Generación de nombre

Aplicar convención.

Resolver ambigüedades.

Si confianza < umbral → _REVISAR.

Organización

Persistir en BD con estado PENDIENTE_MOVER (outbox).

Mover archivo vía StoragePort.

Actualizar estado a MOVIDO.

Registrar ruta original y final.

Si duplicado → _DUP01.

Presentación

Reporte CSV/JSON.

UI con resultados (lectura RO de BD).

Cola de revisión humana en Organizados/_Pendientes.

0.8. Estructura de directorios local
text
Reto5/
├── Documentos/                        # entrada original (dada por el reto)
│   ├── Entrada/                       # nuevos documentos a procesar
│   └── Procesados/                    # opcional: originales movidos
├── Organizados/                       # salida organizada
│   ├── FIN/
│   │   └── 2025/03/
│   │       └── 2025-03-14_FIN_FACTURA_ACME-SA_FA-00123_v01.pdf
│   ├── LEG/
│   ├── RRH/
│   ├── MED/
│   ├── EDU/
│   ├── ADM/
│   ├── TEC/
│   ├── IDP/
│   ├── OTR/
│   └── _Pendientes/                   # baja confianza / bloqueados
│       └── 0000-00-00_OTR_DESCONOCIDO_XXX_REVISAR.pdf
├── data/
│   ├── auditoria.db                   # SQLite (WAL)
│   ├── auditoria.db-wal               # WAL activo
│   ├── auditoria.db-shm               # shared memory
│   ├── backup_auditoria.db
│   ├── duplicados.json
│   ├── cuarentena/                    # archivos no estables
│   ├── config.yaml
│   ├── taxonomia.yaml
│   └── convencion.yaml
├── logs/
│   └── pipeline.log
├── src/                               # código fuente
├── tests/
├── docs/
│   ├── arquitectura.md
│   ├── ADRs/
│   └── manual.md
├── pyproject.toml
├── README.md
└── docker-compose.yml                 # opcional
0.9. Taxonomía de clasificación
Configurable en taxonomia.yaml. Categoría principal + tipo documental + etiquetas secundarias.

Código	Categoría	Ejemplos	Criterios
FIN	Financiero/Contable	Facturas, recibos, balances	Montos, impuestos, cuentas
LEG	Legal/Contractual	Contratos, poderes, demandas	Cláusulas, partes, notaría
RRH	Recursos Humanos	Contratos laborales, nóminas	Empleado, cargo, salario
MED	Médico/Salud	Historias clínicas, recetas	Paciente, diagnóstico, médico
EDU	Académico	Certificados, títulos, matrículas	Estudiante, institución, programa
ADM	Administrativo	Cartas, memorandos, actas	Emisor, asunto, fecha
TEC	Técnico/Proyectos	Informes técnicos, manuales	Proyecto, versión, responsable
IDP	Identidad/Personal	DNI, pasaporte, licencias	Nombre, número, vigencia
OTR	Otros	No clasificados	Revisión humana
Cada documento registra:

Categoría principal: una sola, usada para naming.

Tipo documental: factura, contrato, certificado, etc.

Etiquetas secundarias: varias, para búsqueda.

Confianza: 0.0 a 1.0.

Método: regla / embedding / LLM / híbrido.

0.10. Convención de nombramiento
Formato estándar:

text
{YYYY-MM-DD}_{CAT}_{TIPO}_{ENTIDAD-PERSONA}_{ID}_{vNN}{_ESTADO}.{ext}
Reglas:

Fecha en ISO 8601. Si no existe: 0000-00-00.

Códigos en mayúsculas, sin acentos, sin espacios.

Separador: _.

Entidad/persona normalizada: JUAN-PEREZ, ACME-SA.

ID: número o código del documento. Si no existe, hash corto.

Versión: v01, v02.

Estado opcional: REVISAR, DUP01, BLOQUEADO.

Máximo 180 caracteres.

Extensión original en minúscula.

Ejemplos:

text
2025-03-14_FIN_FACTURA_ACME-SA_FA-00123_v01.pdf
2024-11-02_RRH_CERTIFICADO_MARIA-LOPEZ_CERT-889_v01.docx
0000-00-00_LEG_CONTRATO_JUAN-PEREZ_C-045_v02_REVISAR.pdf
2025-01-10_MED_RECETA_CLINICA-SAN-JOSE_REC-778_v01.jpg
2025-02-01_TEC_INFORME_PROYECTO-ALFA_INF-2025-02_v03.pdf
Casos ambiguos:

Caso	Regla
Sin fecha	0000-00-00 + _FECHA-ESTIMADA si se usa mtime
Múltiples entidades	Priorizar emisor, luego receptor
Múltiples personas	Priorizar titular o beneficiario
Baja confianza	Añadir _REVISAR y mover a _Pendientes
Duplicado	Añadir _DUP01, _DUP02
Versión detectada	v01, v02, etc.
Documento mixto	Clasificar por página dominante
Nombre colisiona	Añadir _vNN incremental
Archivo bloqueado	_BLOQUEADO tras max reintentos
0.11. Stack tecnológico v2.0.1
Capa	Herramientas
Lenguaje	Python 3.11
CLI	Typer + Rich
UI local	Streamlit
Validación	Pydantic v2
Configuración	YAML + pydantic-settings
Persistencia	SQLite en WAL (SQLModel/SQLAlchemy)
OCR	Tesseract (pytesseract) + PaddleOCR
PDF	PyMuPDF, pdfplumber
DOCX/XLSX	python-docx, openpyxl, pandas
NLP	spaCy, regex, dateparser
Embeddings	sentence-transformers
ML clásico	scikit-learn
LLM local	Ollama (llama3, mistral, qwen)
LLM remoto (opcional)	OpenAI / Anthropic / Gemini
File locking	msvcrt / fcntl / lockfile adyacente
Observabilidad	watchdog + loguru
Pruebas	pytest + pytest-cov
Empaquetado	pyproject.toml (Poetry o uv)
Entorno	venv + Makefile
Contenedor (opcional)	Docker + docker-compose
0.12. Contratos de datos (Pydantic)
python
class DocumentoRaw(BaseModel):
    ruta_original: str
    nombre_original: str
    extension: str
    mime: str
    tamano_bytes: int
    sha256: str
    fecha_ingesta: datetime
    estado_ingesta: Literal["ok", "cuarentena", "bloqueado", "corrupto", "duplicado"]

class TextoExtraido(BaseModel):
    texto: str
    metodo: Literal["nativo", "ocr", "mixto", "directo"]
    idioma: str | None
    calidad: float

class ClasificacionResultado(BaseModel):
    categoria: str
    tipo: str
    etiquetas: list[str]
    confianza: float
    metodo: Literal["regla", "embedding", "llm", "hibrido"]

class MetadatosExtraidos(BaseModel):
    fecha_documento: date | None
    entidad_emisora: str | None
    entidad_receptora: str | None
    persona_relacionada: str | None
    identificador: str | None
    version: str | None
    confianza_global: float

class DocumentoProcesado(BaseModel):
    raw: DocumentoRaw
    texto: TextoExtraido
    clasificacion: ClasificacionResultado
    metadatos: MetadatosExtraidos
    nombre_final: str
    ruta_logica_final: str
    estado_publicacion: Literal["PENDIENTE_MOVER", "MOVIDO", "FALLO"]
    requiere_revision: bool
    timestamp_proceso: datetime
0.13. Flujo de automatización
Modo lote (manual):

bash
reto5 procesar --entrada ./Documentos/Entrada --salida ./Organizados
Modo vigilancia (automático):

bash
reto5 vigilar --entrada ./Documentos/Entrada --salida ./Organizados
watchdog detecta archivos nuevos.

Debounce + estabilidad + lock antes de encolar.

Se procesan en orden por N workers.

Al terminar, se actualiza auditoria.db y el reporte.

Modo UI:

bash
streamlit run src/ui/app.py
Panel de carga, resultados, cola de revisión y métricas.

Conexión RO a SQLite.

0.14. Concurrencia en Ingesta y File Locking
0.14.1. Problema
watchdog dispara on_created en el instante en que el SO crea el archivo, no cuando termina de copiarse. Si el documento pesa varios MB, el pipeline puede:

Leer un archivo parcialmente escrito.

Lanzar OCR sobre bytes corruptos.

Extraer texto incompleto y clasificar mal.

Mover el archivo mientras el SO aún lo copia → PermissionError.

Producir un nombre final a partir de basura.

0.14.2. Estrategia en 5 capas
text
[watchdog on_created/modified/moved]
        │
        ▼
1. Debounce de eventos
        │
        ▼
2. Estabilidad de tamaño
        │
        ▼
3. Try-lock exclusivo
        │
        ▼
4. Cuarentena y reintento con backoff
        │
        ▼
5. Validación post-lectura (magic bytes + hash)
        │
        ▼
[Encolar en pipeline]
Capa 1 — Debounce de eventos
python
class DebouncedEventHandler(FileSystemEventHandler):
    def __init__(self, delay=2.0):
        self._delay = delay
        self._timers: dict[str, threading.Timer] = {}
        self._lock = threading.Lock()

    def _schedule(self, path: Path):
        with self._lock:
            if path in self._timers:
                self._timers[path].cancel()
            t = threading.Timer(self._delay, self._emit, args=[path])
            self._timers[path] = t
            t.start()

    def on_created(self, event):
        if not event.is_directory:
            self._schedule(Path(event.src_path))

    def on_modified(self, event):
        if not event.is_directory:
            self._schedule(Path(event.src_path))

    def _emit(self, path: Path):
        with self._lock:
            self._timers.pop(path, None)
        ingesta_queue.put(path)
Capa 2 — Estabilidad de tamaño
python
def archivo_estable(path: Path, checks: int = 3, intervalo: float = 1.0) -> bool:
    prev = -1
    for _ in range(checks):
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            return False
        if size == prev and size > 0:
            return True
        prev = size
        time.sleep(intervalo)
    return False
Capa 3 — Try-lock exclusivo
Windows: msvcrt.locking(fd, LK_NBLCK, 1).

Linux/macOS: fcntl.flock(fd, LOCK_EX | LOCK_NB).

Cross-platform: lock file adyacente archivo.ext.lock con O_CREAT | O_EXCL.

Staleness: lock huérfano > 10 min se elimina y reintenta.

Capa 4 — Cuarentena y reintento
Backoff exponencial: 2s, 4s, 8s, 16s, 32s, 60s.

Máx 6 intentos → _Pendientes con estado BLOQUEADO.

python
class ColaReintentos:
    def __init__(self, max_intentos=6):
        self._items: dict[Path, tuple[int, float]] = {}
        self._max = max_intentos

    def fallo(self, path: Path) -> bool:
        intentos, _ = self._items.get(path, (0, 0))
        intentos += 1
        if intentos >= self._max:
            return False
        delay = min(2 ** intentos, 60)
        self._items[path] = (intentos, time.time() + delay)
        return True
Capa 5 — Validación post-lectura
python
MAGIC_BYTES = {
    b"%PDF": "application/pdf",
    b"PK\x03\x04": "application/zip",
    b"\xFF\xD8\xFF": "image/jpeg",
    b"\x89PNG": "image/png",
}

def validar_integridad(path: Path) -> tuple[bool, str]:
    if path.stat().st_size < 1024:
        return False, "tamano_minimo"
    with open(path, "rb") as f:
        header = f.read(8)
    if not any(header.startswith(m) for m in MAGIC_BYTES):
        return False, "magic_bytes"
    return True, "ok"
0.14.3. Orquestador concurrente
1 hilo productor: watchdog + debounce → cola.

N workers (default 3): consumen y procesan.

Backpressure: si la cola supera N ítems, se pausa la ingesta.

Idempotencia: (sha256, ruta); si ya está PROCESANDO, se ignora.

yaml
ingesta:
  debounce_segundos: 2.0
  estabilidad_checks: 3
  estabilidad_intervalo: 1.0
  max_reintentos: 6
  backoff_max_segundos: 60
  lock_stale_segundos: 600
  workers: 3
  cola_max: 200
0.15. Transacciones y WAL en SQLite
0.15.1. Problema
La UI (Streamlit/CLI) y los workers de ingesta pueden leer/escribir auditoria.db simultáneamente. SQLite por defecto usa journal_mode=DELETE y bloquea toda la BD durante escrituras → database is locked.

0.15.2. Solución: WAL + PRAGMAs
python
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA temp_store=MEMORY")
    cursor.execute("PRAGMA wal_autocheckpoint=1000")
    cursor.execute("PRAGMA journal_size_limit=67108864")
    cursor.execute("PRAGMA cache_size=-64000")
    cursor.close()
PRAGMA	Valor	Motivo
journal_mode	WAL	Lectores concurrentes + 1 escritor sin bloquear
synchronous	NORMAL	Balance durabilidad/velocidad
busy_timeout	5000 ms	Espera en lugar de fallar
foreign_keys	ON	Integridad referencial
temp_store	MEMORY	Tablas temporales rápidas
wal_autocheckpoint	1000	Checkpoint automático
journal_size_limit	64 MB	Evita WAL gigante
cache_size	-64000	64 MB de caché
0.15.3. Modelo de concurrencia
text
┌─────────────────────────────────────────────┐
│              SQLite (WAL)                   │
│  Lectores concurrentes (UI, reportes, CLI)  │
│         │  │  │                             │
│         ▼  ▼  ▼                             │
│      [auditoria.db-wal]                     │
│         ▲                                   │
│         │                                   │
│  Escritor único serializado (WriterThread)  │
└─────────────────────────────────────────────┘
python
class WriterThread(threading.Thread):
    def __init__(self, engine, cola: queue.Queue, batch=50):
        super().__init__(daemon=True)
        self.engine = engine
        self.cola = cola
        self.batch = batch

    def run(self):
        while True:
            items = [self.cola.get()]
            while len(items) < self.batch:
                try:
                    items.append(self.cola.get_nowait())
                except queue.Empty:
                    break
            with Session(self.engine) as s, s.begin():
                for item in items:
                    s.add(item)
Lectores:

python
engine_ro = create_engine("sqlite:///data/auditoria.db?mode=ro&uri=true")
engine_rw = create_engine("sqlite:///data/auditoria.db")
0.15.4. Transacciones explícitas + Outbox
Toda escritura dentro de with session.begin():.

Guardado de un documento es atómico.

Outbox pattern: se persiste con estado PENDIENTE_MOVER, luego se mueve el archivo, luego se actualiza a MOVIDO. Un crash entre ambos pasos no pierde el archivo.

python
def persistir_documento(engine, doc: DocumentoProcesado, storage: StoragePort):
    with Session(engine) as s:
        with s.begin():
            s.add(DocumentoRow.from_dto(doc, estado="PENDIENTE_MOVER"))
    try:
        storage.guardar(doc.nombre_final, doc.ruta_logica_final)
        with Session(engine) as s, s.begin():
            s.execute(update(DocumentoRow)
                      .where(DocumentoRow.id == doc.raw.sha256)
                      .values(estado="MOVIDO"))
    except Exception:
        with Session(engine) as s, s.begin():
            s.execute(update(DocumentoRow)
                      .where(DocumentoRow.id == doc.raw.sha256)
                      .values(estado="FALLO"))
        raise
0.15.5. Checkpoint y mantenimiento
python
def mantenimiento(engine):
    with engine.connect() as c:
        c.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
        c.execute(text("PRAGMA optimize"))
        c.execute(text("VACUUM INTO 'data/backup_auditoria.db'"))
0.15.6. Migración futura a PostgreSQL
Cambiar URI del engine.

Sustituir PRAGMAs por pool_size, max_overflow, pool_pre_ping.

WriterThread opcional (Postgres maneja concurrencia nativa).

Sin cambios en dominio ni pipeline.

0.15.7. Configuración YAML
yaml
persistencia:
  motor: sqlite
  ruta: data/auditoria.db
  modo_lectura_uri: "?mode=ro&uri=true"
  writer_batch: 50
  writer_flush_ms: 200
  pragmas:
    journal_mode: WAL
    synchronous: NORMAL
    busy_timeout: 5000
    foreign_keys: ON
    temp_store: MEMORY
    wal_autocheckpoint: 1000
    journal_size_limit: 67108864
    cache_size: -64000
  mantenimiento:
    checkpoint_cada_min: 60
    vacuum_al_cerrar: true
0.16. Seguridad y privacidad
Procesamiento 100% local por defecto.

LLM local (Ollama) opcional para documentos sensibles.

Si se usa LLM remoto: detección de PII y enmascaramiento previo.

Cifrado opcional de SQLite (SQLCipher) y de carpeta Organizados.

Control de acceso al sistema de archivos vía permisos del SO.

Registro de auditoría: qué documento, cuándo, qué decisión, qué método.

Política de retención configurable.

Sin telemetría saliente por defecto.

0.17. Métricas de éxito
Métrica	Objetivo
Exactitud/F1 de clasificación	> 0.85
Precisión de extracción de campos	> 0.80
Nombres correctos	> 0.90
Tasa de revisión humana	< 20%
Tiempo promedio por documento	< 10 s
Duplicados detectados	> 95%
Escaneados procesados correctamente	> 80%
Errores database is locked	0
Archivos corruptos procesados	0
0.18. Limitaciones y mejoras futuras
Limitaciones v2.0.1:

OCR imperfecto en documentos deteriorados.

Clasificación multietiqueta compleja.

Dependencia de LLM externo si no hay local.

Documentos mixtos o multipágina.

Falta de dataset etiquetado propio.

Monousuario, sin autenticación.

Mejoras futuras (v3.0.0+):

Fine-tuning de modelo de clasificación.

Procesamiento página por página.

Búsqueda semántica con vector DB.

VirtualStorageAdapter + autenticación + sesiones.

Migración a PostgreSQL y object storage.

Integración con SharePoint, Drive, correo.

Flujos de aprobación y firma digital.

Detección de anomalías y fraude documental.

API REST y despliegue web.

0.19. ADRs (Architecture Decision Records)
ADR	Decisión	Justificación
ADR-001	Local-first monousuario	Alcance del reto, simplicidad, privacidad
ADR-002	Arquitectura por capas con puertos/adaptadores	Portabilidad futura a web sin reescribir core
ADR-003	Pipeline híbrido (reglas + NLP + embeddings + LLM)	Robustez, explicabilidad, eficiencia
ADR-004	SQLite como repositorio inicial	Cero configuración, suficiente para local
ADR-005	OCR con Tesseract + PaddleOCR	Cobertura amplia de idiomas y layouts
ADR-006	LLM local por defecto (Ollama)	Privacidad y costo cero
ADR-007	Convención de nombres YYYY-MM-DD_CAT_TIPO_ENTIDAD_ID_vNN	Ordenable, filtrable, consistente
ADR-008	Umbral de confianza → _Pendientes	Precisión sobre cobertura
ADR-009	Auditoría obligatoria por documento	Trazabilidad y mejora continua
ADR-010	Configuración externa en YAML	Flexibilidad sin recompilar
ADR-011	File locking en 5 capas (debounce + estabilidad + try-lock + cuarentena + validación)	Evita OCR sobre archivos en tránsito; robusto ante archivos grandes
ADR-012	SQLite en modo WAL + escritor único serializado + lectores RO	Elimina database is locked; permite UI y workers concurrentes
ADR-013	Patrón outbox para mover archivos tras commit	Evita inconsistencia BD ↔ filesystem ante crash
ADR-014	FileLockPort y MetadataRepoPort como puertos	Portabilidad cross-platform y migración a PostgreSQL sin tocar dominio
0.20. Plan por fases
Fase	Entregable
Fase 0	Arquitectura, taxonomía, convención, stack, ADRs, concurrencia (este documento)
Fase 1	Ingesta robusta (debounce + estabilidad + lock + validación) + extracción de texto + OCR
Fase 2	Clasificación + extracción de entidades
Fase 3	Generación de nombres + organización con outbox
Fase 4	Automatización (watchdog) + CLI + UI local (lectores RO)
Fase 5	Pruebas de concurrencia + documentación final + demo
Cada fase produce:

Código funcional y testeado.

Documentación actualizada.

Métricas parciales.

Demo ejecutable.

0.21. Plan de pruebas
Funcionales
Clasificación por categoría (FIN, LEG, RRH, MED, EDU, ADM, TEC, IDP, OTR).

Extracción de fecha, entidad, persona, ID, versión.

Naming correcto según convención.

Duplicados detectados por SHA-256.

OCR sobre PDF escaneado e imagen.

Concurrencia
Test	Objetivo
test_archivo_estable	Escritura lenta; no procesar hasta estabilizar
test_file_lock_posix/windows	Dos procesos, solo uno gana el lock
test_cuarentena_backoff	Bloqueado se reintenta y va a _Pendientes
test_magic_bytes	Extensión mentida → CORRUPTO
test_wal_concurrent_read_write	1 escritor + 3 lectores durante 60 s sin database is locked
test_outbox_crash_recovery	Crash entre commit y move; recuperación correcta
test_checkpoint	WAL se trunca tras N inserciones
test_idempotencia_sha256	Mismo archivo dos veces → duplicado
0.22. Entregables de la Fase 0
Documento de arquitectura general (este).

Comparativa de alternativas y justificación.

Taxonomía documental inicial.

Convención de nombramiento.

Flujo de procesamiento documental.

Stack tecnológico definido.

Contratos de datos.

Plan de pruebas y métricas.

ADRs (001–014).

Riesgos, limitaciones y mejoras.

Diseño de concurrencia de ingesta (5 capas).

Diseño de transacciones SQLite (WAL, WriterThread, outbox).

0.23. Conclusión de Fase 0 v2.0.1
La solución óptima para este reto es un pipeline híbrido modular, local-first y monousuario, con arquitectura por capas y puertos/adaptadores que permiten evolucionar a web/multiusuario sin reescribir el core.

Se prioriza:

Precisión sobre cobertura (umbral de confianza → revisión).

Explicabilidad (reglas + auditoría por documento).

Privacidad (local por defecto, LLM local opcional).

Portabilidad (puertos/adaptadores, configuración externa).

Trazabilidad (SQLite + logs + reportes).

Robustez (file locking + WAL + outbox + auditoría).

Con v2.0.1 quedan cubiertos los dos riesgos clásicos que suelen hundir pipelines documentales locales:

Archivos en tránsito → ingesta robusta con 5 capas de defensa.

Contención de BD → SQLite WAL + escritor único + lectores RO + outbox.

La Fase 0 deja listo el diseño para comenzar la Fase 1: ingesta robusta y extracción de contenido, con contratos de datos, interfaces, stack y pruebas definidas.