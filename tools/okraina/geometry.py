"""Geometry helpers: rounding, simplification, clipping, compact ring encoding."""

import math

from .config import CLIP_BOX, SIMPLIFY_TOLERANCE


def round_points(points):
    return [[round(lon, 3), round(lat, 3)] for lon, lat in points]


def simplify(points, tolerance=SIMPLIFY_TOLERANCE):
    """Ramer–Douglas–Peucker."""
    if len(points) < 3:
        return points

    def distance(point, start, end):
        (x, y), (x1, y1), (x2, y2) = point, start, end
        dx, dy = x2 - x1, y2 - y1
        if dx == dy == 0:
            return math.hypot(x - x1, y - y1)
        return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / math.hypot(dx, dy)

    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        best, index = 0.0, None
        for i in range(first + 1, last):
            d = distance(points[i], points[first], points[last])
            if d > best:
                best, index = d, i
        if index is not None and best > tolerance:
            keep[index] = True
            stack += [(first, index), (index, last)]
    return [p for p, k in zip(points, keep) if k]


def clip_polygon(points, box=CLIP_BOX):
    """Sutherland–Hodgman clipping against the box."""
    west, south, east, north = box
    edges = [
        (lambda p: p[0] >= west, lambda a, b: (west, a[1] + (b[1] - a[1]) * (west - a[0]) / (b[0] - a[0]))),
        (lambda p: p[0] <= east, lambda a, b: (east, a[1] + (b[1] - a[1]) * (east - a[0]) / (b[0] - a[0]))),
        (lambda p: p[1] >= south, lambda a, b: (a[0] + (b[0] - a[0]) * (south - a[1]) / (b[1] - a[1]), south)),
        (lambda p: p[1] <= north, lambda a, b: (a[0] + (b[0] - a[0]) * (north - a[1]) / (b[1] - a[1]), north)),
    ]
    output = [tuple(p) for p in points]
    for inside, intersect in edges:
        source, output = output, []
        if not source:
            break
        previous = source[-1]
        for current in source:
            if inside(current):
                if not inside(previous):
                    output.append(intersect(previous, current))
                output.append(current)
            elif inside(previous):
                output.append(intersect(previous, current))
            previous = current
    return output


def clip_polyline(points, box=CLIP_BOX):
    """Keeps the runs of a line that lie inside the box."""
    west, south, east, north = box
    runs, run = [], []
    for lon, lat in points:
        if west <= lon <= east and south <= lat <= north:
            run.append((lon, lat))
        elif run:
            runs.append(run)
            run = []
    if run:
        runs.append(run)
    return [r for r in runs if len(r) > 1]


def encode_ring(points):
    """
    Compact ring: flat list of integers in thousandths of a degree, first point absolute,
    then differences to the previous point. Decoded by decodeRing() in js/features/atlas.js.
    """
    encoded, previous = [], (0, 0)
    for lon, lat in points:
        current = (round(lon * 1000), round(lat * 1000))
        encoded += [current[0] - previous[0], current[1] - previous[1]]
        previous = current
    return encoded
