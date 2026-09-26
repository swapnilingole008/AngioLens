"""
Captured Frame Storage Module
Handles saving ECG-gated captured angiography frames from actual video to disk
and associating them with sessions, triggers, and patients.
"""

import os
import uuid
from pathlib import Path

# Base storage directory for captured gated images
STORAGE_DIR = Path(__file__).resolve().parent.parent / 'data' / 'captured_frames'
SAMPLE_IMAGE_PATH = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'src' / 'assets' / 'images' / 'angiogram-sample.jpg'

def ensure_storage_dir():
    os.makedirs(STORAGE_DIR, exist_ok=True)
    return STORAGE_DIR


def save_captured_frame(
    session_id=None,
    trigger_index=1,
    frame_number=1,
    trigger_timestamp=0.0,
    video_path=None,
    total_frames=120,
    fps=30.0
):
    """
    Extracts the exact frame from the uploaded video via OpenCV at frame_number
    and saves it to disk as rpeak_{trigger_index:03d}_frame_{frame_number:03d}.jpg.
    DO NOT use dummy or static sample images.
    """
    ensure_storage_dir()
    image_filename = f"rpeak_{trigger_index:03d}_frame_{frame_number:03d}.jpg"
    target_path = STORAGE_DIR / image_filename

    extracted = False
    error_msg = None

    # Frame extraction from the actual video file via OpenCV
    if video_path and os.path.exists(video_path):
        try:
            import cv2
            cap = cv2.VideoCapture(str(video_path))
            if cap.isOpened():
                # 0-indexed frame index in OpenCV
                frame_idx = max(0, int(frame_number) - 1)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if ret and frame is not None:
                    cv2.imwrite(str(target_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    extracted = True
                else:
                    error_msg = f"OpenCV read returned empty for frame #{frame_number}"
                cap.release()
            else:
                error_msg = f"Could not open video file at {video_path}"
        except Exception as e:
            error_msg = f"Failed to extract frame #{frame_number} from video: {e}"
            print(f"Warning: {error_msg}")
    else:
        error_msg = "Video file unavailable for frame capture"

    if extracted:
        image_id = f"IMG-TRIG-{trigger_index:03d}-{uuid.uuid4().hex[:6]}"
        return {
            "image_id": image_id,
            "filename": image_filename,
            "file_path": str(target_path),
            "image_url": f"/api/ecg/captured-images/{image_filename}",
            "frame_number": frame_number,
            "trigger_timestamp": round(float(trigger_timestamp), 4),
            "extracted": True,
            "error": None
        }
    else:
        return {
            "image_id": None,
            "filename": None,
            "file_path": None,
            "image_url": None,
            "frame_number": frame_number,
            "trigger_timestamp": round(float(trigger_timestamp), 4),
            "extracted": False,
            "error": error_msg or f"Frame extraction failure for Frame #{frame_number}"
        }
