import torch
import numpy as np
from tqdm import tqdm
from src.metrics import calculate_classification_metrics, calculate_detection_map

def train_one_epoch(model, cls_criterion, data_loader, optimizer, device):
    """Runs a single epoch of training."""
    model.train()
    total_losses, cls_losses, rpn_losses, roi_losses = [], [], [], []

    for images, cls_targets, det_targets in tqdm(data_loader, desc="Training"):
        images = images.to(device)
        cls_targets = cls_targets.to(device)
        
        valid_det_targets = []
        valid_det_idxs = [i for i, t in enumerate(det_targets) if t['has_bbox']]
        
        optimizer.zero_grad()
        
        # Train on batches with bounding boxes (multi-task)
        if valid_det_idxs:
            valid_images = images[valid_det_idxs]
            valid_cls_targets = cls_targets[valid_det_idxs]
            valid_det_targets = [{k: v.to(device) for k, v in det_targets[i].items()} for i in valid_det_idxs]

            cls_output, det_losses = model(valid_images, valid_det_targets, mode='both')
            cls_loss = cls_criterion(cls_output, valid_cls_targets)
            rpn_loss = det_losses['loss_objectness'] + det_losses['loss_rpn_box_reg']
            roi_loss = det_losses['loss_classifier'] + det_losses['loss_box_reg']
            total_loss = cls_loss + rpn_loss + roi_loss
            
            total_loss.backward()

            # Log losses
            cls_losses.append(cls_loss.item())
            rpn_losses.append(rpn_loss.item())
            roi_losses.append(roi_loss.item())
            total_losses.append(total_loss.item())

        # Train on batches without bounding boxes (classification only)
        non_det_idxs = [i for i in range(len(images)) if i not in valid_det_idxs]
        if non_det_idxs:
            non_det_images = images[non_det_idxs]
            non_det_cls_targets = cls_targets[non_det_idxs]
            
            cls_output = model(non_det_images, mode='classification')
            cls_loss = cls_criterion(cls_output, non_det_cls_targets)

            cls_loss.backward()
            cls_losses.append(cls_loss.item())

        optimizer.step()

    return {
        'classification_loss': np.mean(cls_losses),
        'rpn_loss': np.mean(rpn_losses) if rpn_losses else 0,
        'roi_loss': np.mean(roi_losses) if roi_losses else 0,
        'total_loss': np.mean(total_losses) if total_losses else np.mean(cls_losses)
    }


def evaluate(model, cls_criterion, data_loader, device, classes):
    """Runs a single validation pass."""
    model.eval()
    cls_losses, all_cls_targets, all_cls_preds = [], [], []
    all_det_targets, all_det_preds = [], []

    with torch.no_grad():
        for images, cls_targets, det_targets in tqdm(data_loader, desc="Validating"):
            images = images.to(device)
            cls_targets = cls_targets.to(device)

            cls_output, det_output = model(images, mode='both')
            
            cls_losses.append(cls_criterion(cls_output, cls_targets).item())
            all_cls_targets.append(cls_targets.cpu().numpy())
            all_cls_preds.append(torch.sigmoid(cls_output).cpu().numpy())
            
            for target, pred in zip(det_targets, det_output):
                if target['has_bbox']:
                    all_det_targets.append((target['boxes'].numpy(), target['labels'].numpy()))
                    all_det_preds.append((pred['boxes'].cpu().numpy(), pred['scores'].cpu().numpy(), pred['labels'].cpu().numpy()))

    cls_metrics = calculate_classification_metrics(all_cls_targets, all_cls_preds, classes)
    det_aps = calculate_detection_map(all_det_targets, all_det_preds)
    
    metrics = {
        'classification_loss': np.mean(cls_losses),
        'mean_auc': cls_metrics['mean_auc'],
        'mean_ap_cls': cls_metrics['mean_ap_cls'],
        'mean_ap_det': np.nanmean(list(det_aps.values())) if det_aps else 0.0,
        'aucs': cls_metrics['aucs'],
        'aps_cls': cls_metrics['aps'],
        'aps_det': det_aps
    }
    return metrics