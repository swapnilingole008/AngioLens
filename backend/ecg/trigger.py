"""
Virtual Trigger Generation and Frame Synchronization Module
Generates software synchronization triggers and maps trigger timestamps
to angiography video/sequence frame indices.
"""

def generate_virtual_triggers(r_peaks, target_phase=70.0):
    """
    Generates virtual trigger events from detected R-peaks and target phase.
    Each event conforms to the hackathon specification:
    {
      "trigger_time": 2.34,
      "cardiac_phase": 70,
      "rr_interval": 0.81,
      "heart_rate": 74,
      "confidence": 0.98
    }
    """
    if not r_peaks or len(r_peaks) < 2:
        return []

    from .cardiac_phase import calculate_rr_intervals, calculate_trigger_time

    cycles = calculate_rr_intervals(r_peaks)
    triggers = []

    for c in cycles:
        trig_time = calculate_trigger_time(c['prev_r_peak_time'], c['rr_interval'], target_phase)
        triggers.append({
            "trigger_time": trig_time,
            "cardiac_phase": float(target_phase),
            "rr_interval": c['rr_interval'],
            "heart_rate": c['heart_rate'],
            "confidence": c['confidence'],
            "cycle_index": c['cycle_index'],
            "r_peak_time": c['prev_r_peak_time'],
            "next_r_peak_time": c['current_r_peak_time'],
            "note": "Software-generated virtual trigger for simulated motion-gated synchronization"
        })

    return triggers


def synchronize_frame_with_trigger(trigger_event, total_frames=120, fps=30.0, video_duration=None):
    """
    Maps a virtual trigger timestamp to the corresponding angiography frame index.

    Formula:
    frame_index = round(trigger_time * fps)
    For looped playback simulation: (frame_index % total_frames) + 1 (1-based index)
    """
    trig_t = trigger_event.get('trigger_time', 0.0)
    fps = float(fps) if fps > 0 else 30.0

    raw_frame_number = int(round(trig_t * fps))

    if total_frames and total_frames > 0:
        # 1-indexed frame for clinical angiography reporting
        gated_frame = (raw_frame_number % total_frames)
        if gated_frame == 0:
            gated_frame = total_frames
    else:
        gated_frame = max(1, raw_frame_number)

    return {
        "trigger_time": trig_t,
        "selected_frame": gated_frame,
        "raw_frame_index": raw_frame_number,
        "cardiac_phase": trigger_event.get('cardiac_phase', 70.0),
        "rr_interval": trigger_event.get('rr_interval', 0.8),
        "heart_rate": trigger_event.get('heart_rate', 75.0),
        "confidence": trigger_event.get('confidence', 0.98),
        "is_simulation": True,
        "disclaimer": "Simulated motion-gated imaging synchronization. Not connected to clinical imaging hardware."
    }
