import base64
import io
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image, ImageOps


class SegmentRequest(BaseModel):
    image: str
    mode: str = Field(pattern='^(objects|foreground)$')
    options: Dict[str, Any] = Field(default_factory=dict)


app = FastAPI(title='Printlab Segmentation Service', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('PRINTLAB_SEGMENTATION_CORS_ORIGINS', '*').split(','),
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['*'],
)


def read_image_from_bytes(raw: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(raw))
    return ImageOps.exif_transpose(image).convert('RGB')


def fetch_image_url(url: str) -> bytes:
    request = Request(
        url,
        headers={
            'user-agent': 'PrintlabSegmentation/0.1',
            'accept': 'image/*,*/*;q=0.8',
        },
    )
    with urlopen(request, timeout=float(os.getenv('PRINTLAB_SEGMENTATION_FETCH_TIMEOUT', '20'))) as response:
        content_type = response.headers.get('content-type', '')
        raw = response.read(int(os.getenv('PRINTLAB_SEGMENTATION_MAX_IMAGE_BYTES', '25000000')))
        if not raw:
            raise ValueError('empty image response')
        if content_type and 'image' not in content_type.lower() and not content_type.lower().startswith('application/octet-stream'):
            raise ValueError(f'URL did not return an image content-type: {content_type}')
        return raw


def resolve_image_url(value: str) -> str:
    if value.startswith('//'):
        return f'https:{value}'
    parsed = urlparse(value)
    if parsed.scheme in ('http', 'https'):
        return value
    if value.startswith('/'):
        public_origin = os.getenv('PRINTLAB_SEGMENTATION_PUBLIC_ORIGIN', 'http://localhost:8788')
        return urljoin(public_origin.rstrip('/') + '/', value.lstrip('/'))
    raise ValueError('image was not a data URL, absolute URL, or root-relative URL')


def decode_input_image(image_value: str) -> Image.Image:
    value = str(image_value or '').strip()
    if not value:
        raise HTTPException(status_code=400, detail={'error': 'No image provided', 'code': 'NO_IMAGE'})

    try:
        if value.startswith('data:image/'):
            payload = value.split(',', 1)[1] if ',' in value else ''
            if not payload:
                raise ValueError('missing data URL payload')
            return read_image_from_bytes(base64.b64decode(payload, validate=False))

        parsed = urlparse(value)
        if value.startswith('/') or parsed.scheme in ('http', 'https') or value.startswith('//'):
            return read_image_from_bytes(fetch_image_url(resolve_image_url(value)))

        return read_image_from_bytes(base64.b64decode(value, validate=False))
    except Exception as exc:
        preview = value[:90]
        raise HTTPException(
            status_code=400,
            detail={
                'error': f'Could not decode image: {exc}',
                'code': 'BAD_IMAGE',
                'imagePreview': preview,
            },
        ) from exc


def image_to_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode('ascii')


def clip_bbox(bbox: List[float], width: int, height: int) -> Tuple[int, int, int, int]:
    x, y, w, h = [int(round(float(value))) for value in bbox]
    x = max(0, min(width - 1, x))
    y = max(0, min(height - 1, y))
    w = max(1, min(width - x, w))
    h = max(1, min(height - y, h))
    return x, y, w, h


def mask_to_png_data_url(rgb: np.ndarray, mask: np.ndarray, bbox: List[float]) -> str:
    height, width = mask.shape[:2]
    x, y, w, h = clip_bbox(bbox, width, height)
    crop_rgb = rgb[y:y + h, x:x + w]
    crop_mask = mask[y:y + h, x:x + w]
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = crop_rgb
    rgba[:, :, 3] = np.where(crop_mask, 255, 0).astype(np.uint8)
    return image_to_data_url(Image.fromarray(rgba, mode='RGBA'))


def rgba_bounds(image: Image.Image, alpha_threshold: int = 12) -> Optional[Tuple[int, int, int, int, int]]:
    rgba = image.convert('RGBA')
    alpha = np.asarray(rgba.getchannel('A'))
    mask = alpha > alpha_threshold
    if not np.any(mask):
        return None
    ys, xs = np.where(mask)
    x1 = int(xs.min())
    y1 = int(ys.min())
    x2 = int(xs.max()) + 1
    y2 = int(ys.max()) + 1
    area = int(mask.sum())
    return x1, y1, x2 - x1, y2 - y1, area


def foreground_response_from_rgba(rgba_image: Image.Image, source_width: int, source_height: int, options: Dict[str, Any], source: str) -> Dict[str, Any]:
    alpha_threshold = int(options.get('alphaThreshold', os.getenv('PRINTLAB_ALPHA_THRESHOLD', '12')))
    bounds = rgba_bounds(rgba_image, alpha_threshold)
    if not bounds:
        raise ValueError('background remover produced an empty foreground')
    x, y, width, height, area = bounds
    crop = rgba_image.convert('RGBA').crop((x, y, x + width, y + height))
    return {
        'sourceWidth': source_width,
        'sourceHeight': source_height,
        'foreground': {
            'src': image_to_data_url(crop),
            'bbox': [float(x), float(y), float(width), float(height)],
            'score': 1.0,
            'area': area,
            'foregroundRatio': area / max(1, source_width * source_height),
            'source': source,
        },
    }


@lru_cache(maxsize=1)
def get_rembg_session():
    model_name = os.getenv('PRINTLAB_REMBG_MODEL', 'u2net').strip() or 'u2net'
    from rembg import new_session
    return new_session(model_name)


def run_rembg(image: Image.Image):
    from rembg import remove

    session = get_rembg_session()
    rgba = remove(image.convert('RGBA'), session=session)
    if not isinstance(rgba, Image.Image):
        rgba = Image.open(io.BytesIO(rgba)).convert('RGBA')
    return rgba.convert('RGBA')


def remove_background_with_rembg(image: Image.Image, options: Dict[str, Any]) -> Dict[str, Any]:
    source_width, source_height = image.size
    rgba = run_rembg(image)
    return foreground_response_from_rgba(rgba, source_width, source_height, options, 'rembg')


def objects_response_from_rgba(rgba_image: Image.Image, source_width: int, source_height: int, options: Dict[str, Any], source: str) -> Dict[str, Any]:
    try:
        import cv2
    except Exception as exc:
        raise ValueError(f'OpenCV is required for object splitting: {exc}') from exc

    alpha_threshold = int(options.get('alphaThreshold', os.getenv('PRINTLAB_ALPHA_THRESHOLD', '12')))
    max_objects = int(options.get('maxObjects', 24))
    min_area_ratio = float(options.get('magicSplitMinAreaRatio', options.get('minAreaRatio', 0.002)))
    max_area_ratio = float(options.get('magicSplitMaxAreaRatio', options.get('maxAreaRatio', 0.98)))
    image_area = max(1, source_width * source_height)
    min_area = max(16, int(round(image_area * min_area_ratio)))
    max_area = max(min_area, int(round(image_area * max_area_ratio)))

    rgba = np.asarray(rgba_image.convert('RGBA'), dtype=np.uint8)
    alpha = rgba[:, :, 3]
    mask = (alpha > alpha_threshold).astype(np.uint8)

    if int(mask.sum()) <= 0:
        raise ValueError('background remover produced no alpha mask to split')

    merge_pixels = int(options.get('magicSplitMergePixels', options.get('mergePixels', 0)))
    if merge_pixels > 0:
        kernel_size = max(1, (merge_pixels * 2) + 1)
        kernel = np.ones((kernel_size, kernel_size), dtype=np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    candidates = []
    for label in range(1, labels_count):
        x, y, width, height, area = [int(value) for value in stats[label]]
        if area < min_area or area > max_area:
            continue
        if width <= 0 or height <= 0:
            continue
        candidates.append((label, x, y, width, height, area))

    candidates.sort(key=lambda item: item[5], reverse=True)
    objects = []
    for index, (label, x, y, width, height, area) in enumerate(candidates[:max_objects]):
        crop = rgba[y:y + height, x:x + width].copy()
        component_alpha = np.where(labels[y:y + height, x:x + width] == label, crop[:, :, 3], 0).astype(np.uint8)
        crop[:, :, 3] = component_alpha
        objects.append({
            'id': f'object-{index + 1}',
            'src': image_to_data_url(Image.fromarray(crop, mode='RGBA')),
            'bbox': [float(x), float(y), float(width), float(height)],
            'score': float(area / image_area),
            'area': area,
            'source': source,
        })

    if not objects:
        raise ValueError('Could not identify separate alpha objects')

    return {'sourceWidth': source_width, 'sourceHeight': source_height, 'objects': objects}


def split_objects_with_rembg(image: Image.Image, options: Dict[str, Any]) -> Dict[str, Any]:
    source_width, source_height = image.size
    rgba = run_rembg(image)
    return objects_response_from_rgba(rgba, source_width, source_height, options, 'rembg-alpha-split')


def bbox_iou(a: List[float], b: List[float]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    intersection = iw * ih
    union = (aw * ah) + (bw * bh) - intersection
    return intersection / union if union else 0.0


def touches_edge_count(bbox: List[float], width: int, height: int, margin: int = 3) -> int:
    x, y, w, h = bbox
    return sum([
        x <= margin,
        y <= margin,
        x + w >= width - margin,
        y + h >= height - margin,
    ])


def score_mask(mask_record: Dict[str, Any], width: int, height: int) -> float:
    bbox = mask_record.get('bbox', [0, 0, width, height])
    x, y, w, h = bbox
    area_ratio = float(mask_record.get('area', 0)) / max(1, width * height)
    center_x = x + (w / 2)
    center_y = y + (h / 2)
    center_distance = ((center_x - (width / 2)) ** 2 + (center_y - (height / 2)) ** 2) ** 0.5
    max_distance = ((width / 2) ** 2 + (height / 2) ** 2) ** 0.5
    center_score = 1 - min(1, center_distance / max_distance)
    edge_penalty = touches_edge_count(bbox, width, height) * 0.12
    iou_score = float(mask_record.get('predicted_iou', 0.7))
    stability = float(mask_record.get('stability_score', 0.7))
    useful_area = min(1.0, max(0.0, area_ratio * 4))
    return (iou_score * 0.34) + (stability * 0.26) + (center_score * 0.25) + (useful_area * 0.15) - edge_penalty


def filter_masks(masks: List[Dict[str, Any]], width: int, height: int, options: Dict[str, Any]) -> List[Dict[str, Any]]:
    min_area_ratio = float(options.get('minAreaRatio', 0.0015))
    max_area_ratio = float(options.get('maxAreaRatio', 0.82))
    min_iou = float(options.get('minPredictedIou', 0.72))
    min_stability = float(options.get('minStabilityScore', 0.72))
    dedupe_iou = float(options.get('dedupeIou', 0.88))
    image_area = max(1, width * height)
    filtered: List[Dict[str, Any]] = []

    for mask_record in masks:
        bbox = mask_record.get('bbox') or [0, 0, width, height]
        area_ratio = float(mask_record.get('area', 0)) / image_area
        if area_ratio < min_area_ratio or area_ratio > max_area_ratio:
            continue
        if float(mask_record.get('predicted_iou', 1)) < min_iou:
            continue
        if float(mask_record.get('stability_score', 1)) < min_stability:
            continue
        _, _, box_w, box_h = bbox
        if (box_w / width) > 0.96 and (box_h / height) > 0.96:
            continue
        candidate = dict(mask_record)
        candidate['_score'] = score_mask(candidate, width, height)
        filtered.append(candidate)

    filtered.sort(key=lambda item: item.get('_score', 0), reverse=True)
    deduped: List[Dict[str, Any]] = []
    for item in filtered:
        if any(bbox_iou(item.get('bbox', []), existing.get('bbox', [])) >= dedupe_iou for existing in deduped):
            continue
        deduped.append(item)
    return deduped


@lru_cache(maxsize=1)
def get_mask_generator():
    checkpoint = os.getenv('PRINTLAB_SEGMENTATION_CHECKPOINT', '').strip()
    model_type = os.getenv('PRINTLAB_SEGMENTATION_MODEL_TYPE', 'vit_b').strip() or 'vit_b'
    device = os.getenv('PRINTLAB_SEGMENTATION_DEVICE', 'cpu').strip() or 'cpu'
    if not checkpoint:
        raise HTTPException(
            status_code=501,
            detail={'error': 'Segmentation model not configured', 'code': 'SEGMENTATION_NOT_CONFIGURED'},
        )
    if not os.path.exists(checkpoint):
        raise HTTPException(
            status_code=501,
            detail={'error': f'Segmentation checkpoint not found: {checkpoint}', 'code': 'CHECKPOINT_NOT_FOUND'},
        )
    try:
        import torch
        from segment_anything import SamAutomaticMaskGenerator, sam_model_registry
    except Exception as exc:
        raise HTTPException(
            status_code=501,
            detail={'error': f'SAM dependencies are not installed: {exc}', 'code': 'SAM_DEPENDENCIES_MISSING'},
        ) from exc

    if model_type not in sam_model_registry:
        raise HTTPException(status_code=400, detail={'error': f'Unsupported SAM model type: {model_type}', 'code': 'BAD_MODEL_TYPE'})

    sam = sam_model_registry[model_type](checkpoint=checkpoint)
    sam.to(device=device)
    if device == 'cuda' and hasattr(torch, 'cuda'):
        torch.cuda.empty_cache()

    return SamAutomaticMaskGenerator(
        model=sam,
        points_per_side=int(os.getenv('PRINTLAB_SAM_POINTS_PER_SIDE', '32')),
        pred_iou_thresh=float(os.getenv('PRINTLAB_SAM_PRED_IOU_THRESH', '0.76')),
        stability_score_thresh=float(os.getenv('PRINTLAB_SAM_STABILITY_THRESH', '0.76')),
        crop_n_layers=int(os.getenv('PRINTLAB_SAM_CROP_N_LAYERS', '1')),
        min_mask_region_area=int(os.getenv('PRINTLAB_SAM_MIN_MASK_REGION_AREA', '64')),
    )


def generate_masks(rgb: np.ndarray) -> List[Dict[str, Any]]:
    generator = get_mask_generator()
    return generator.generate(rgb)


@app.get('/health')
def health():
    configured = bool(os.getenv('PRINTLAB_SEGMENTATION_CHECKPOINT', '').strip())
    model_loaded = get_mask_generator.cache_info().currsize > 0
    rembg_model = os.getenv('PRINTLAB_REMBG_MODEL', 'u2net')
    return {
        'ok': True,
        'configured': configured,
        'modelLoaded': model_loaded,
        'modelType': os.getenv('PRINTLAB_SEGMENTATION_MODEL_TYPE', 'vit_b'),
        'backgroundModel': rembg_model,
        'backgroundModelLoaded': get_rembg_session.cache_info().currsize > 0,
    }


@app.post('/segment')
def segment(request: SegmentRequest):
    image = decode_input_image(request.image)

    if request.mode == 'objects' and not request.options.get('disableRembgObjects'):
        try:
            return split_objects_with_rembg(image, request.options or {})
        except Exception as exc:
            if request.options.get('failOnRembgError'):
                raise HTTPException(
                    status_code=502,
                    detail={'error': f'Object splitter failed: {exc}', 'code': 'REMBG_OBJECTS_FAILED'},
                ) from exc

    if request.mode == 'foreground' and not request.options.get('disableRembg'):
        try:
            return remove_background_with_rembg(image, request.options or {})
        except Exception as exc:
            if request.options.get('failOnRembgError'):
                raise HTTPException(
                    status_code=502,
                    detail={'error': f'Background remover failed: {exc}', 'code': 'REMBG_FAILED'},
                ) from exc

    rgb = np.asarray(image, dtype=np.uint8)
    height, width = rgb.shape[:2]
    masks = generate_masks(rgb)
    filtered = filter_masks(masks, width, height, request.options or {})

    if request.mode == 'objects':
        max_objects = int(request.options.get('maxObjects', 24))
        objects = []
        for index, mask_record in enumerate(filtered[:max_objects]):
            bbox = [float(value) for value in mask_record['bbox']]
            objects.append({
                'id': f'object-{index + 1}',
                'src': mask_to_png_data_url(rgb, mask_record['segmentation'], bbox),
                'bbox': bbox,
                'score': float(mask_record.get('_score', mask_record.get('predicted_iou', 0))),
                'area': int(mask_record.get('area', 0)),
                'source': 'sam',
            })
        if not objects:
            raise HTTPException(status_code=422, detail={'error': 'Could not identify separate objects', 'code': 'NO_OBJECT_MASKS'})
        return {'sourceWidth': width, 'sourceHeight': height, 'objects': objects}

    foreground_candidates = filtered or filter_masks(
        masks,
        width,
        height,
        {**request.options, 'minPredictedIou': 0.62, 'minStabilityScore': 0.62, 'maxAreaRatio': 0.9},
    )
    if not foreground_candidates:
        raise HTTPException(status_code=422, detail={'error': 'Could not identify a foreground subject', 'code': 'NO_FOREGROUND_MASK'})
    foreground = max(foreground_candidates, key=lambda item: score_mask(item, width, height))
    bbox = [float(value) for value in foreground['bbox']]
    return {
        'sourceWidth': width,
        'sourceHeight': height,
        'foreground': {
            'src': mask_to_png_data_url(rgb, foreground['segmentation'], bbox),
            'bbox': bbox,
            'score': float(foreground.get('_score', foreground.get('predicted_iou', 0))),
            'area': int(foreground.get('area', 0)),
            'source': 'sam',
        },
    }
