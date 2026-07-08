import base64
import io
import os
from functools import lru_cache
from typing import Any, Dict, List, Tuple
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
    return {
        'ok': True,
        'configured': configured,
        'modelLoaded': model_loaded,
        'modelType': os.getenv('PRINTLAB_SEGMENTATION_MODEL_TYPE', 'vit_b'),
    }


@app.post('/segment')
def segment(request: SegmentRequest):
    image = decode_input_image(request.image)
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
        },
    }
