# Adaptado de Ultralytics (AGPL-3.0) - ver ./NOTICE.md y ./LICENSE-AGPL-3.0.txt
# Origen: ultralytics/trackers/byte_tracker.py (ultralytics==8.4.156).
# Cambios: se elimina la rama de GMC en _pre_first_associate (no vendorizada,
# funcionalidad opcional no usada); LOGGER local (sin ultralytics.utils);
# xywh2ltwh inlineada (sin ultralytics.utils.ops); imports re-apuntados a
# este paquete local.

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from . import matching
from .basetrack import BaseTrack, TrackState
from .kalman_filter import KalmanFilterXYAH
from .stracks import joint_stracks, merge_track_pools, parse_bboxes

LOGGER = logging.getLogger(__name__)


def _xywh_to_ltwh(xywh: np.ndarray) -> np.ndarray:
    ltwh = np.copy(xywh)
    ltwh[..., 0] = xywh[..., 0] - xywh[..., 2] / 2
    ltwh[..., 1] = xywh[..., 1] - xywh[..., 3] / 2
    return ltwh


class STrack(BaseTrack):
    """Single object tracking representation that uses Kalman filtering for state estimation."""

    shared_kalman = KalmanFilterXYAH()

    def __init__(self, xywh: np.ndarray, score: float, cls: Any):
        """Initialize a new STrack instance.

        Args:
            xywh (np.ndarray): Bounding box in `(x, y, w, h, idx)` format, where (x, y) is the
                center, (w, h) are width and height, and `idx` is the detection index.
            score (float): Confidence score of the detection.
            cls (Any): Class label for the detected object.
        """
        super().__init__()
        assert len(xywh) == 5, f"expected 5 values but got {len(xywh)}"
        self._tlwh = np.asarray(_xywh_to_ltwh(xywh[:4]), dtype=np.float32)
        self.kalman_filter = None
        self.mean, self.covariance = None, None
        self.is_activated = False

        self.score = score
        self.tracklet_len = 0
        self.cls = cls
        self.idx = xywh[-1]

    def predict(self):
        """Predict the next state (mean and covariance) of the object using the Kalman filter."""
        mean_state = self.mean.copy()
        if self.state != TrackState.Tracked:
            mean_state[7] = 0
        self.mean, self.covariance = self.kalman_filter.predict(
            mean_state, self.covariance
        )

    @staticmethod
    def multi_predict(stracks: list[STrack]):
        """Perform multi-object predictive tracking using Kalman filter for the provided list of STrack instances."""
        if not stracks:
            return
        multi_mean = np.asarray([st.mean for st in stracks])
        multi_covariance = np.asarray([st.covariance for st in stracks])
        for i, st in enumerate(stracks):
            if st.state != TrackState.Tracked:
                multi_mean[i][7] = 0
        multi_mean, multi_covariance = STrack.shared_kalman.multi_predict(
            multi_mean, multi_covariance
        )
        for i, (mean, cov) in enumerate(zip(multi_mean, multi_covariance)):
            stracks[i].mean = mean
            stracks[i].covariance = cov

    def activate(self, kalman_filter: KalmanFilterXYAH, frame_id: int):
        """Activate a new tracklet using the provided Kalman filter and initialize its state and covariance."""
        self.kalman_filter = kalman_filter
        self.track_id = self.next_id()
        self.mean, self.covariance = self.kalman_filter.initiate(
            self.convert_coords(self._tlwh)
        )

        self.tracklet_len = 0
        self.state = TrackState.Tracked
        if frame_id == 1:
            self.is_activated = True
        self.frame_id = frame_id
        self.start_frame = frame_id

    def re_activate(self, new_track: STrack, frame_id: int, new_id: bool = False):
        """Reactivate a previously lost track using new detection data and update its state and attributes."""
        self.mean, self.covariance = self.kalman_filter.update(
            self.mean, self.covariance, self.convert_coords(new_track.tlwh)
        )
        self.tracklet_len = 0
        self.state = TrackState.Tracked
        self.is_activated = True
        self.frame_id = frame_id
        if new_id:
            self.track_id = self.next_id()
        self.score = new_track.score
        self.cls = new_track.cls
        self.idx = new_track.idx

    def update(self, new_track: STrack, frame_id: int):
        """Update the state of a matched track."""
        self.frame_id = frame_id
        self.tracklet_len += 1

        new_tlwh = new_track.tlwh
        self.mean, self.covariance = self.kalman_filter.update(
            self.mean, self.covariance, self.convert_coords(new_tlwh)
        )
        self.state = TrackState.Tracked
        self.is_activated = True

        self.score = new_track.score
        self.cls = new_track.cls
        self.idx = new_track.idx

    def convert_coords(self, tlwh: np.ndarray) -> np.ndarray:
        """Convert a bounding box's top-left-width-height format to its x-y-aspect-height equivalent."""
        return self.tlwh_to_xyah(tlwh)

    @property
    def tlwh(self) -> np.ndarray:
        """Get the bounding box in top-left-width-height format from the current state estimate."""
        if self.mean is None:
            return self._tlwh.copy()
        ret = self.mean[:4].copy()
        ret[2] *= ret[3]
        ret[:2] -= ret[2:] / 2
        return ret

    @property
    def xyxy(self) -> np.ndarray:
        """Convert bounding box from (top left x, top left y, width, height) to (min x, min y, max x, max y)."""
        ret = self.tlwh  # already a fresh array, safe to mutate
        ret[2:] += ret[:2]
        return ret

    @staticmethod
    def tlwh_to_xyah(tlwh: np.ndarray) -> np.ndarray:
        """Convert bounding box from tlwh format to center-x-center-y-aspect-height (xyah) format."""
        ret = np.asarray(tlwh).copy()
        ret[:2] += ret[2:] / 2
        ret[2] /= ret[3]
        return ret

    @property
    def result(self) -> list[float]:
        """Get the current tracking results in the appropriate bounding box format."""
        coords = self.xyxy
        return [*coords.tolist(), self.track_id, self.score, self.cls, self.idx]

    def __repr__(self) -> str:
        """Return a string representation of the STrack object including start frame, end frame, and track ID."""
        return f"OT_{self.track_id}_({self.start_frame}-{self.end_frame})"


class BYTETracker:
    """BYTETracker: two-stage (high/low confidence) association tracker with Kalman filtering.

    `args` must expose: track_buffer, track_high_thresh, track_low_thresh, new_track_thresh,
    match_thresh, fuse_score.
    """

    track_class = STrack

    def __init__(self, args: Any):
        self.tracked_stracks: list[STrack] = []
        self.lost_stracks: list[STrack] = []
        self.removed_stracks: list[STrack] = []

        self.frame_id = 0
        self.args = args
        self.max_frames_lost = args.track_buffer
        self.kalman_filter = self.get_kalmanfilter()
        self.reset_id()

    def update(self, results: Any) -> np.ndarray:
        """Update the tracker with new detections and return the current list of tracked objects."""
        self.frame_id += 1
        activated_stracks: list[STrack] = []
        refind_stracks: list[STrack] = []
        lost_stracks: list[STrack] = []
        removed_stracks: list[STrack] = []

        results_high, results_low, mask_high, mask_low = self._split_detections(results)
        detections = self.init_track(results_high)
        detections_second = self.init_track(results_low)
        for tracks, mask in ((detections, mask_high), (detections_second, mask_low)):
            for track, i in zip(tracks, np.flatnonzero(mask)):
                track.idx = i  # idx must be in full detection-set space; parse_bboxes only sees the subset

        unconfirmed, tracked_stracks = self._split_tracked()
        strack_pool = joint_stracks(tracked_stracks, self.lost_stracks)
        self.multi_predict(strack_pool)

        u_track, u_detection = self._first_association(
            strack_pool, detections, activated_stracks, refind_stracks
        )
        self._second_association(
            strack_pool,
            u_track,
            detections_second,
            activated_stracks,
            refind_stracks,
            lost_stracks,
        )
        u_detection, detections = self._unconfirmed_association(
            unconfirmed, u_detection, detections, activated_stracks, removed_stracks
        )
        self._init_new_tracks(u_detection, detections, activated_stracks)
        self._remove_stale_lost(removed_stracks)

        merge_track_pools(
            self, activated_stracks, refind_stracks, lost_stracks, removed_stracks
        )
        return self._format_output()

    def _split_detections(
        self, results: Any
    ) -> tuple[Any, Any, np.ndarray, np.ndarray]:
        """Split detections into high-confidence and low-confidence subsets, dropping degenerate boxes."""
        scores = results.conf
        wh = results.xywh[:, 2:4]
        valid = (wh[:, 0] > 0) & (
            wh[:, 1] > 0
        )  # tlwh_to_xyah divides by height, so h=0 would give an inf Kalman mean
        remain_inds = valid & (scores >= self.args.track_high_thresh)
        inds_low = (
            valid
            & (scores > self.args.track_low_thresh)
            & (scores < self.args.track_high_thresh)
        )
        return results[remain_inds], results[inds_low], remain_inds, inds_low

    def _split_tracked(self) -> tuple[list[STrack], list[STrack]]:
        """Separate `self.tracked_stracks` into confirmed and unconfirmed lists."""
        unconfirmed, tracked = [], []
        for track in self.tracked_stracks:
            (unconfirmed if not track.is_activated else tracked).append(track)
        return unconfirmed, tracked

    def _first_association(
        self,
        strack_pool: list[STrack],
        detections: list[STrack],
        activated: list[STrack],
        refind: list[STrack],
    ) -> tuple[list[int], list[int]]:
        """First-stage association between track pool and high-score detections."""
        dists = self.get_dists(strack_pool, detections)
        matches, u_track, u_detection = matching.linear_assignment(
            dists, thresh=self.args.match_thresh
        )
        self._apply_matches(matches, strack_pool, detections, activated, refind)
        return u_track, u_detection

    def _apply_matches(
        self,
        matches: list[list[int]] | np.ndarray,
        pool: list[STrack],
        detections: list[STrack],
        activated: list[STrack],
        refind: list[STrack],
    ) -> None:
        """Apply a list of matched (track, detection) pairs from an association stage."""
        for itracked, idet in matches:
            self._apply_match(pool[itracked], detections[idet], activated, refind)

    def _apply_match(
        self, track: STrack, det: STrack, activated: list[STrack], refind: list[STrack]
    ) -> None:
        """Update or re-activate a single track with its matched detection."""
        if track.state == TrackState.Tracked:
            track.update(det, self.frame_id)
            activated.append(track)
        else:
            track.re_activate(det, self.frame_id, new_id=False)
            refind.append(track)

    def _second_association(
        self,
        strack_pool: list[STrack],
        u_track: list[int],
        detections_second: list[STrack],
        activated: list[STrack],
        refind: list[STrack],
        lost: list[STrack],
    ) -> None:
        """Second-stage association between remaining tracked tracks and low-score detections."""
        r_tracked_stracks = [
            strack_pool[i]
            for i in u_track
            if strack_pool[i].state == TrackState.Tracked
        ]
        if r_tracked_stracks and detections_second:
            # IoU-only by design (ByteTrack paper sec. 3.2): fusing low scores pushes costs above the 0.5 threshold
            dists = matching.iou_distance(r_tracked_stracks, detections_second)
            matches, u_track, _ = matching.linear_assignment(dists, thresh=0.5)
            self._apply_matches(
                matches, r_tracked_stracks, detections_second, activated, refind
            )
        else:
            u_track = list(range(len(r_tracked_stracks)))

        for it in u_track:
            track = r_tracked_stracks[it]
            if track.state != TrackState.Lost:
                track.mark_lost()
                lost.append(track)

    def _unconfirmed_association(
        self,
        unconfirmed: list[STrack],
        u_detection: list[int],
        detections: list[STrack],
        activated: list[STrack],
        removed: list[STrack],
    ) -> tuple[list[int], list[STrack]]:
        """Associate unconfirmed tracks with leftover high-score detections."""
        detections = [detections[i] for i in u_detection]
        if not unconfirmed:
            return list(range(len(detections))), detections
        dists = self.get_dists(unconfirmed, detections)
        matches, u_unconfirmed, u_detection = matching.linear_assignment(
            dists, thresh=0.7
        )
        for itracked, idet in matches:
            unconfirmed[itracked].update(detections[idet], self.frame_id)
            activated.append(unconfirmed[itracked])
        for it in u_unconfirmed:
            track = unconfirmed[it]
            track.mark_removed()
            removed.append(track)
        return u_detection, detections

    def _init_new_tracks(
        self,
        u_detection: list[int],
        detections: list[STrack],
        activated: list[STrack],
    ) -> None:
        """Activate new tracks from detections that survived all association stages."""
        for inew in u_detection:
            track = detections[inew]
            if track.score < self.args.new_track_thresh:
                continue
            track.activate(self.kalman_filter, self.frame_id)
            activated.append(track)

    def _remove_stale_lost(self, removed: list[STrack]) -> None:
        """Remove lost tracks that have exceeded the maximum allowed frames."""
        for track in self.lost_stracks:
            if self.frame_id - track.end_frame > self.max_frames_lost:
                track.mark_removed()
                removed.append(track)

    def _format_output(self) -> np.ndarray:
        """Format the current tracked objects into the output array."""
        return np.asarray(
            [x.result for x in self.tracked_stracks if x.is_activated], dtype=np.float32
        )

    def get_kalmanfilter(self) -> KalmanFilterXYAH:
        """Return a Kalman filter object for tracking bounding boxes using KalmanFilterXYAH."""
        return KalmanFilterXYAH()

    def init_track(self, results: Any) -> list[STrack]:
        """Initialize object tracking with given detections, scores, and class labels as STrack instances."""
        if len(results) == 0:
            return []
        bboxes = parse_bboxes(results)
        return [
            self.track_class(xywh, s, c)
            for (xywh, s, c) in zip(bboxes, results.conf, results.cls)
        ]

    def get_dists(self, tracks: list[STrack], detections: list[STrack]) -> np.ndarray:
        """Calculate the distance between tracks and detections using IoU and optionally fuse scores."""
        dists = matching.iou_distance(tracks, detections)
        if self.args.fuse_score:
            dists = matching.fuse_score(dists, detections)
        return dists

    def multi_predict(self, tracks: list[STrack]):
        """Predict the next states for multiple tracks using Kalman filter."""
        STrack.multi_predict(tracks)

    @staticmethod
    def reset_id():
        """Reset the ID counter for STrack instances to ensure unique track IDs across tracking sessions."""
        STrack.reset_id()

    def reset(self):
        """Reset the tracker by clearing all tracked, lost, and removed tracks and reinitializing the Kalman filter."""
        self.tracked_stracks = []
        self.lost_stracks = []
        self.removed_stracks = []
        self.frame_id = 0
        self.kalman_filter = self.get_kalmanfilter()
        self.reset_id()
