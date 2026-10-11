"""Convert Lloyd's saved Krita annotations to scene-space vector masks.

This reads the saved projection, never edits either source artwork, and writes
only mask geometry / inspection data. Requires the bundled Pillow and NumPy.
"""
import argparse
import hashlib
import json
from collections import deque
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO

import numpy as np
from PIL import Image, ImageDraw


def components(mask):
    seen = np.zeros_like(mask, dtype=bool)
    groups = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        q = deque([(int(x), int(y))])
        seen[y, x] = True
        points = []
        while q:
            px, py = q.popleft()
            points.append((px, py))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = px + dx, py + dy
                    if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((nx, ny))
        groups.append(points)
    return sorted(groups, key=len, reverse=True)




def rdp(points, epsilon=.55):
    if len(points) <= 2:
        return points
    a, b = np.array(points[0], float), np.array(points[-1], float)
    v = b - a
    p = np.array(points, float)
    t = np.clip(((p - a) @ v) / max(float(v @ v), 1e-12), 0, 1)
    distances = np.linalg.norm(p - (a + t[:, None] * v), axis=1)
    i = int(np.argmax(distances))
    if distances[i] <= epsilon:
        return [points[0], points[-1]]
    return rdp(points[:i + 1], epsilon)[:-1] + rdp(points[i:], epsilon)


def filled_outline(stroke, closure=None):
    """Contour the filled stroke, retaining thin flags/spires lost by thinning.

    The outer half of a three-pixel pen is removed with a subpixel Euclidean
    inset. No morphological smoothing is used: concave notches survive.
    """
    drawing = Image.fromarray(stroke.astype(np.uint8) * 255)
    if closure:
        ImageDraw.Draw(drawing).line(closure, fill=255, width=3)
    # Padding means an outline touching the image edge still has a real outside.
    wall = np.pad(np.array(drawing) > 0, 5)
    h, w = wall.shape
    seen = np.zeros_like(wall)
    q = deque([(0, 0)])
    seen[0, 0] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny, nx] and not wall[ny, nx]:
                seen[ny, nx] = True
                q.append((nx, ny))
    shape = ~seen
    if int((shape & ~wall).sum()) < 20:
        raise ValueError('Stroke has an unclosed gap; do not guess a replacement hull')
    # Exact Euclidean distances in the boundary band (all other pixels cap at 4).
    dist = np.full(shape.shape, 16., dtype=float)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = dx * dx + dy * dy
            if not 0 < d <= 16:
                continue
            shifted = np.roll(shape, (dy, dx), axis=(0, 1))
            dist[shape & ~shifted] = np.minimum(dist[shape & ~shifted], d)
    field = np.where(shape, np.sqrt(dist), 0.)
    # A 1.25px inset from the outside of a nominal 3px stroke keeps a 0.5px
    # silhouette in very narrow flag stems instead of deleting the whole tip.
    level = 1.75
    bits = (field[:-1, :-1] >= level).astype(int) + 2 * (field[:-1, 1:] >= level) + 4 * (field[1:, 1:] >= level) + 8 * (field[1:, :-1] >= level)
    connections = {1:[(3,0)],2:[(0,1)],3:[(3,1)],4:[(1,2)],5:[(3,0),(1,2)],6:[(0,2)],7:[(3,2)],8:[(2,3)],9:[(0,2)],10:[(0,1),(2,3)],11:[(1,2)],12:[(3,1)],13:[(0,1)],14:[(3,0)]}
    graph = {}
    for y, x in zip(*np.nonzero((bits != 0) & (bits != 15))):
        values = [field[y,x],field[y,x+1],field[y+1,x+1],field[y+1,x]]
        corners = [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]
        def edge(i):
            j = (i + 1) % 4
            t = (level - values[i]) / (values[j] - values[i])
            return tuple(round(corners[i][k] + t * (corners[j][k] - corners[i][k]) - 5, 4) for k in (0,1))
        for a,b in connections[int(bits[y,x])]:
            p,r = edge(a),edge(b)
            graph.setdefault(p,[]).append(r)
            graph.setdefault(r,[]).append(p)
    loops,visited = [],set()
    for start in graph:
        if start in visited:
            continue
        path,at,previous = [],start,None
        while at not in visited:
            visited.add(at);path.append(at)
            options = [p for p in graph[at] if p != previous]
            if not options:
                raise ValueError('Open contour produced during subpixel extraction')
            previous,at = at,options[0]
        path.append(start)
        loops.append(path)
    area = lambda p: abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:])))
    longest = max(loops,key=area)
    # Only remove collinear/redundant subpixel steps, not actual drawn detail.
    return rdp(longest,.08),len(longest)


def retraced_corners(name, points):
    """Retain three narrow valleys where brush sides overlap into solid ink.

    Flood filling cannot infer the centre of doubled-back strokes. These small
    corrections follow the visible pink stroke centres, not the painted scene.
    End anchors are checked so changes to extraction cannot silently misapply.
    """
    fixes = {
        'main-island': ((437.75,153), (433.25,156),
                        [(437.75,153),(434.5,162),(433.5,162),(433.25,156)]),
        'upper-island': ((543,59.75), (541.25,58),
                         [(543,59.75),(542.5,61.5),(541.5,62),(541.25,58)]),
        'castle': ((788.75,233), (784.25,233),
                   [(788.75,233),(787.75,236),(787.25,238.5),
                    (786,238.5),(785.25,236),(784.25,233)])
    }
    if name not in fixes:
        return points
    start, end, replacement = fixes[name]
    i, j = points.index(start), points.index(end)
    if not i < j < i + 15:
        raise ValueError(f'{name}: retraced-corner anchors changed')
    return points[:i] + replacement + points[j+1:]




def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--module', type=Path)
    args = parser.parse_args()
    with ZipFile(args.source) as archive:
        projection = archive.read('mergedimage.png')
    rgb = np.asarray(Image.open(BytesIO(projection)).convert('RGB'))
    if rgb.shape != (1024, 1536, 3):
        raise ValueError('Tracing must stay at the original 1536 × 1024 size')
    r, g, b = rgb.astype(int).transpose(2, 0, 1)
    ink = (r > 170) & (b > 110) & (r - g > 85) & (b - g > 45)
    ink[345:] = False
    ink[:, 1010:] = False
    raw = components(ink)
    print(json.dumps([{'pixels': len(p), 'box': [min(x for x, y in p), min(y for x, y in p), max(x for x, y in p), max(y for x, y in p)]} for p in raw if len(p) > 20]))
    regions = [('main-island', (318, 108, 485, 259), True),
               ('upper-island', (467, 40, 587, 165), True),
               ('small-island', (578, 131, 631, 187), True),
               ('tiny-island', (529, 201, 571, 245), True),
               ('left-ridge', (45, 175, 280, 305), False),
               ('castle', (729, 0, 994, 336), False)]
    result = {'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'projectionSha256': hashlib.sha256(projection).hexdigest(), 'size': [1536, 1024], 'outlines': {}}
    for name, (x0, y0, x1, y1), closed in regions:
        subset = np.zeros_like(ink)
        subset[y0:y1, x0:x1] = ink[y0:y1, x0:x1]
        groups = [group for group in components(subset) if len(group) > 20]
        # The island regions overlap nearby islands slightly. Only their main
        # component belongs to this outline; castle pen lifts need all parts.
        if closed:
            groups = groups[:1]
        subset[:] = False
        for group in groups:
            for x, y in group:
                subset[y, x] = True
        # Repair only the small, explicitly identified pen lifts in this trace.
        drawing = Image.fromarray(subset.astype(np.uint8) * 255)
        pen = ImageDraw.Draw(drawing)
        # Join actual pen-lift endpoints, not the closest parallel segments:
        # joining a narrow valley across its mouth would erase its full depth.
        if name == 'main-island':
            pen.line([(434,163),(438,152)],fill=255,width=2)
        elif name == 'upper-island':
            pen.line([(558,91),(560,88)],fill=255,width=2)
        elif name == 'castle':
            pen.line([(803,242),(807,241)],fill=255,width=2)
            pen.line([(858,225),(858,220)],fill=255,width=2)
        subset = np.array(drawing) > 0
        print(name, 'components', len(groups), flush=True)
        # Keep thin spires and flags as actual solid silhouettes, not a skeleton
        # path whose shortest route silently drops dangling thin details.
        closure = None
        if name == 'castle':
            closure = [(984,1),(984,0),(1535,0),(1535,500),(736,500),(736,326)]
        elif name == 'left-ridge':
            closure = [(56,231),(0,231),(0,450),(271,450),(271,294)]
        points, traced = filled_outline(subset,closure)
        points = retraced_corners(name,points)
        points = [(max(0,min(1536,x)),max(0,min(1024,y))) for x,y in points]
        pixels = np.argwhere(ink[y0:y1, x0:x1])[:, ::-1] + (x0, y0)
        review_points = np.array(points)
        if closure:
            review_points = review_points[(review_points[:,0]>=x0+3)&(review_points[:,0]<x1-3)&(review_points[:,1]>3)&(review_points[:,1]<y1-3)]
        errors = np.sqrt(((review_points[:, None] - pixels) ** 2).sum(axis=2).min(axis=1))
        if errors.max() > 3:
            raise ValueError(f'{name}: geometry strayed from the marked line: {errors.max()}')
        # Also check the reverse distance: testing vertices alone cannot detect
        # a flag or notch that was omitted altogether.
        original = np.array([p for group in groups for p in group])
        contour = np.array(points)
        edges = contour[1:] - contour[:-1]
        delta = original[:,None] - contour[:-1]
        along = np.clip((delta * edges).sum(axis=2) / np.maximum((edges * edges).sum(axis=1),1e-12),0,1)
        reverse = np.sqrt(((delta-along[:,:,None]*edges)**2).sum(axis=2).min(axis=1))
        if reverse.max() > 4:
            raise ValueError(f'{name}: part of the stroke was omitted at {original[reverse.argmax()]}: {reverse.max()}')
        result['outlines'][name] = {'points': points, 'closed': True, 'tracedPixels': traced,
                                    'maxDistanceToInk': round(float(errors.max()), 3),
                                    'maxInkDistanceToContour': round(float(reverse.max()),3),
                                    'p99InkDistanceToContour': round(float(np.percentile(reverse,99)),3)}
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')
    if args.module:
        module = '// Generated from Lloyd’s 1536 × 1024 Krita tracing, not the painted garden.\n'
        module += '// Regenerate with scripts/trace-garden-depth.py; never substitute the marked image.\n'
        module += 'export const traceSourceSha256=' + json.dumps(result['sourceSha256']) + ';\n'
        module += 'export const tracedContours=' + json.dumps({name: value['points'] for name, value in result['outlines'].items()}, separators=(',', ':')) + ';\n'
        module += "export const contourPath=points=>'M'+points.map(p=>p.join(' ')).join(' L');\n"
        module += "export const tracedIslands=['main-island','upper-island','small-island','tiny-island'].map(id=>contourPath(tracedContours[id])+'Z');\n"
        module += "export const tracedTerrain=[\n"
        module += " {id:'left-ridge',depth:.18,d:contourPath(tracedContours['left-ridge'])+'Z'},\n"
        module += " {id:'castle',depth:.16,d:contourPath(tracedContours.castle)+'Z'}\n];\n"
        args.module.write_text(module, encoding='utf8')


if __name__ == '__main__':
    main()
