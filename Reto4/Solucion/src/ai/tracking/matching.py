# Adaptado de Ultralytics (AGPL-3.0) - ver ./NOTICE.md y ./LICENSE-AGPL-3.0.txt
# Origen: ultralytics/trackers/utils/matching.py + ultralytics/utils/metrics.py::bbox_ioa
# (ultralytics==8.4.156). Cambios: se elimina embedding_distance (ReID, fuera de alcance
# con with_reid=False) y la ruta OBB/batch_probiou (no usamos cajas orientadas); se
# inlinea bbox_ioa; `lap` pasa a ser dependencia directa obligatoria.

from __future__ import annotations

import lap
import numpy as np


def bbox_ioa(
    box1: np.ndarray, box2: np.ndarray, iou: bool = False, eps: float = 1e-7
) -> np.ndarray:
    """Calculate the intersection over box2 area given box1 and box2 (both x1y1x2y2)."""
    b1_x1, b1_y1, b1_x2, b1_y2 = box1.T
    b2_x1, b2_y1, b2_x2, b2_y2 = box2.T

    inter_area = (
        np.minimum(b1_x2[:, None], b2_x2) - np.maximum(b1_x1[:, None], b2_x1)
    ).clip(0) * (
        np.minimum(b1_y2[:, None], b2_y2) - np.maximum(b1_y1[:, None], b2_y1)
    ).clip(
        0
    )

    area = (b2_x2 - b2_x1) * (b2_y2 - b2_y1)
    if iou:
        box1_area = (b1_x2 - b1_x1) * (b1_y2 - b1_y1)
        area = area + box1_area[:, None] - inter_area

    return inter_area / (area + eps)


def linear_assignment(cost_matrix: np.ndarray, thresh: float):
    """Perform linear assignment using lap.lapjv."""
    if cost_matrix.size == 0:
        return (
            np.empty((0, 2), dtype=int),
            tuple(range(cost_matrix.shape[0])),
            tuple(range(cost_matrix.shape[1])),
        )

    _, x, y = lap.lapjv(cost_matrix, extend_cost=True, cost_limit=thresh)
    matches = [[ix, mx] for ix, mx in enumerate(x) if mx >= 0]
    unmatched_a = np.where(x < 0)[0]
    unmatched_b = np.where(y < 0)[0]
    return matches, unmatched_a, unmatched_b


def iou_distance(atracks: list, btracks: list) -> np.ndarray:
    """Compute cost based on Intersection over Union (IoU) between tracks (axis-aligned boxes only)."""
    if (atracks and isinstance(atracks[0], np.ndarray)) or (
        btracks and isinstance(btracks[0], np.ndarray)
    ):
        atlbrs = atracks
        btlbrs = btracks
    else:
        atlbrs = [track.xyxy for track in atracks]
        btlbrs = [track.xyxy for track in btracks]

    ious = np.zeros((len(atlbrs), len(btlbrs)), dtype=np.float32)
    if len(atlbrs) and len(btlbrs):
        ious = bbox_ioa(
            np.ascontiguousarray(atlbrs, dtype=np.float32),
            np.ascontiguousarray(btlbrs, dtype=np.float32),
            iou=True,
        )
    return 1 - ious  # cost matrix


def fuse_score(cost_matrix: np.ndarray, detections: list) -> np.ndarray:
    """Fuse cost matrix with detection scores to produce a single cost matrix."""
    if cost_matrix.size == 0:
        return cost_matrix
    iou_sim = 1 - cost_matrix
    det_scores = np.array([det.score for det in detections])
    det_scores = det_scores[None].repeat(cost_matrix.shape[0], axis=0)
    fuse_sim = iou_sim * det_scores
    return 1 - fuse_sim  # fuse_cost
