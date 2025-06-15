import os
import numpy as np
import pandas as pd
from PIL import Image
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import torch
from torch.utils.data import Dataset

# Define class list as a constant for clarity and easy access
CLASSES: List[str] = [
    'Atelectasis', 'Cardiomegaly', 'Consolidation', 'Edema', 'Effusion',
    'Emphysema', 'Fibrosis', 'Hernia', 'Infiltration', 'Mass', 'Nodule',
    'Pleural_Thickening', 'Pneumonia', 'Pneumothorax'
]

CLASS_TO_IDX: Dict[str, int] = {cls_name: i for i, cls_name in enumerate(CLASSES)}


class ChestXrayDataset(Dataset):
    """
    Handles data loading for multi-label classification and object detection tasks.
    It pre-caches image paths for efficiency and validates the dataset to ensure
    all referenced images exist on disk.
    """
    def __init__(
        self,
        dataframe: pd.DataFrame,
        base_dir: str | Path,
        bbox_dict: Optional[Dict[str, Any]] = None,
        transform: Optional[callable] = None,
        mode: str = 'both'
    ):
        self.base_dir = Path(base_dir)
        self.bbox_dict = bbox_dict if bbox_dict is not None else {}
        self.transform = transform
        self.mode = mode
        self.classes = CLASSES
        self.class_to_idx = CLASS_TO_IDX

        # Pre-locate all image paths for fast lookups
        self.image_path_map = self._create_image_path_map()

        original_len = len(dataframe)
        self.dataframe = dataframe[dataframe['Image Index'].isin(self.image_path_map)].reset_index(drop=True)

    def _create_image_path_map(self) -> Dict[str, Path]:
        """Efficiently scans the directory and creates a map from image name to its full path."""
        print("Caching image paths for fast lookup...")

        image_paths = self.base_dir.rglob("images/*.png")
        path_map = {p.name: p for p in image_paths}
        print(f"Found {len(path_map)} images in the directory structure.")
        return path_map

    def __len__(self) -> int:
        return len(self.dataframe)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, ...]:
        """
        Retrieves an item from the dataset.

        Returns a tuple containing the image tensor and target(s) based on the specified mode.
        """
        row = self.dataframe.iloc[idx]
        img_name = row['Image Index']
        img_path = self.image_path_map[img_name]

        image = Image.open(img_path).convert('RGB')
        
        # --- Classification Target ---
        labels_list = row['Finding Labels'].split('|')
        cls_target = torch.zeros(len(self.classes), dtype=torch.float32)
        for lbl in labels_list:
            if lbl in self.class_to_idx:
                cls_target[self.class_to_idx[lbl]] = 1.0

        # --- Detection Target ---
        bboxes, det_labels = [], []
        if img_name in self.bbox_dict:
            for obj in self.bbox_dict[img_name]:
                if obj['label'] in self.class_to_idx:
                    x, y, w, h = obj['bbox']
                    bboxes.append([x, y, x + w, y + h])
                    det_labels.append(self.class_to_idx[obj['label']])

        if self.transform:
            transformed = self.transform(image=np.array(image), bboxes=bboxes, labels=det_labels)
            image = transformed['image']
            bboxes = transformed.get('bboxes', [])
            det_labels = transformed.get('labels', [])
        else:
            image = torch.from_numpy(np.array(image)).permute(2, 0, 1).float() / 255.0

        # Format detection target for Faster R-CNN
        det_target = self._create_detection_target(idx, bboxes, det_labels)

        if self.mode == 'classification':
            return image, cls_target
        elif self.mode == 'detection':
            return image, det_target
        else: # 'both'
            return image, cls_target, det_target

    def _create_detection_target(self, idx: int, bboxes: List, det_labels: List) -> Dict[str, Any]:
        """Creates a detection target dictionary in the format expected by Faster R-CNN."""
        has_bbox = bool(bboxes)
        if has_bbox:
            boxes_tensor = torch.tensor(bboxes, dtype=torch.float32)
            area = (boxes_tensor[:, 2] - boxes_tensor[:, 0]) * (boxes_tensor[:, 3] - boxes_tensor[:, 1])
            return {
                'boxes': boxes_tensor,
                # Faster R-CNN expects 1-indexed labels (0 is background)
                'labels': torch.tensor(det_labels, dtype=torch.int64) + 1,
                'image_id': torch.tensor([idx]),
                'area': area,
                'iscrowd': torch.zeros((len(det_labels),), dtype=torch.int64),
                'has_bbox': True
            }
        else:
            # Return empty tensors if no bounding boxes are present
            return {
                'boxes': torch.zeros((0, 4), dtype=torch.float32),
                'labels': torch.zeros((0,), dtype=torch.int64),
                'image_id': torch.tensor([idx]),
                'area': torch.zeros((0,), dtype=torch.float32),
                'iscrowd': torch.zeros((0,), dtype=torch.int64),
                'has_bbox': False
            }