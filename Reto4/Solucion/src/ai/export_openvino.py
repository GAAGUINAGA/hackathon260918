"""CLI: exporta pesos YOLOv11s (.pt) a OpenVINO IR + genera SHA256SUMS (CU-06.1).

Herramienta de build (manual, un humano la ejecuta una vez por modelo),
no forma parte del runtime del motor: el runtime solo necesita
`openvino` (ver src/ai/detector.py). `ultralytics` es dependencia de
build/dev unicamente (requirements-dev.txt) por eso se importa de forma
diferida dentro de export_to_openvino().

Uso:
    python -m src.ai.export_openvino --weights yolov11s.pt \
        --out models/yolov11s_openvino_model
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

_CHUNK_SIZE = 1024 * 1024


def _sha256_of_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(_CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def export_to_openvino(weights_path: Path, out_dir: Path, imgsz: int = 640) -> Path:
    from ultralytics import YOLO  # type: ignore[attr-defined]

    model = YOLO(str(weights_path))
    exported_dir = Path(model.export(format="openvino", imgsz=imgsz))
    if exported_dir.resolve() != out_dir.resolve():
        out_dir.parent.mkdir(parents=True, exist_ok=True)
        exported_dir.replace(out_dir)
    return out_dir


def write_sha256sums(model_dir: Path) -> Path:
    sums_path = model_dir / "SHA256SUMS"
    artifacts = sorted(model_dir.glob("*.xml")) + sorted(model_dir.glob("*.bin"))
    lines = [f"{_sha256_of_file(artifact)}  {artifact.name}" for artifact in artifacts]
    sums_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return sums_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()

    model_dir = export_to_openvino(args.weights, args.out, args.imgsz)
    sums_path = write_sha256sums(model_dir)
    print(f"Modelo exportado a {model_dir}")
    print(f"SHA256SUMS escrito en {sums_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
