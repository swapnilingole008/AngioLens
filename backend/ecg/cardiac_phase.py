"""
Cardiac Phase and RR Interval Calculation Module
Calculates RR intervals, approximate instantaneous and average heart rate,
and target cardiac phase trigger offsets.
"""

def calculate_rr_intervals(r_peaks):
    """
    Computes RR intervals between consecutive R-peaks and instantaneous Heart Rate.
    RR interval = current_r_peak_time - prev_r_peak_time
    Heart Rate = 60 / RR interval (BPM)
    Returns: list of dicts with RR interval and HR per cycle.
    """
    if not r_peaks or len(r_peaks) < 2:
        return []

    cycles = []
    for i in range(1, len(r_peaks)):
        prev_r = r_peaks[i - 1]
        curr_r = r_peaks[i]

        rr_interval = round(curr_r['timestamp'] - prev_r['timestamp'], 4)
        if rr_interval > 0:
            hr = round(60.0 / rr_interval, 1)
        else:
            hr = 0.0

        cycles.append({
            "cycle_index": i,
            "prev_r_peak_time": prev_r['timestamp'],
            "current_r_peak_time": curr_r['timestamp'],
            "rr_interval": rr_interval,
            "rr_interval_ms": round(rr_interval * 1000.0, 1),
            "heart_rate": hr,
            "confidence": round((prev_r.get('confidence', 0.95) + curr_r.get('confidence', 0.95)) / 2.0, 2)
        })

    return cycles


def calculate_trigger_time(r_peak_time, rr_interval, target_phase_percent=70.0):
    """
    Calculates trigger timestamp for a given cardiac cycle:
    trigger_time = R_peak_time + (target_phase / 100.0) * RR_interval

    NOTE: target_phase_percent is a prototype/simulation parameter. Clinically
    appropriate gating phase depends on clinical protocol, heart rate (diastasis vs end-systole),
    and whether CT/cine-angiography is used.
    """
    phase_ratio = float(target_phase_percent) / 100.0
    trigger_time = r_peak_time + (phase_ratio * rr_interval)
    return round(trigger_time, 4)


def calculate_cardiac_phase(cycles, target_phase_percent=70.0):
    """
    Processes all cardiac cycles to calculate target trigger events.
    """
    triggers = []
    for cycle in cycles:
        r_start = cycle['prev_r_peak_time']
        rr = cycle['rr_interval']
        trig_t = calculate_trigger_time(r_start, rr, target_phase_percent)

        triggers.append({
            "cycle_index": cycle['cycle_index'],
            "r_peak_time": r_start,
            "next_r_peak_time": cycle['current_r_peak_time'],
            "rr_interval": rr,
            "rr_interval_ms": cycle['rr_interval_ms'],
            "heart_rate": cycle['heart_rate'],
            "target_phase": float(target_phase_percent),
            "trigger_time": trig_t,
            "confidence": cycle['confidence'],
            "is_simulation_parameter": True
        })

    return triggers
