import numpy as np
import torch
from torchvision.ops import box_iou
from sklearn.metrics import roc_auc_score, average_precision_score

def calculate_classification_metrics(targets, preds, classes):
    """Calculates AUC and AP for the classification task."""
    targets = np.vstack(targets)
    preds = np.vstack(preds)
    
    aucs = []
    aps = []
    
    for i in range(targets.shape[1]):
        if np.sum(targets[:, i]) > 0:
            aucs.append(roc_auc_score(targets[:, i], preds[:, i]))
            aps.append(average_precision_score(targets[:, i], preds[:, i]))
        else:
            aucs.append(float('nan'))
            aps.append(float('nan'))
            
    return {'aucs': aucs, 'aps': aps, 'mean_auc': np.nanmean(aucs), 'mean_ap_cls': np.nanmean(aps)}

def calculate_detection_map(all_targets, all_preds, iou_threshold=0.5):
    """Calculates mean Average Precision (mAP) for the detection task."""
    
    all_detections = {i: [] for i in range(1, 15)}
    all_ground_truths = {i: [] for i in range(1, 15)}

    for (gt_boxes, gt_labels), (pred_boxes, pred_scores, pred_labels) in zip(all_targets, all_preds):
        for box, label in zip(gt_boxes, gt_labels):
            all_ground_truths[label].append(box)
        for box, score, label in zip(pred_boxes, pred_scores, pred_labels):
            all_detections[label].append((box, score))
            
    aps = {}
    for cls_id in range(1, 15):
        if not all_ground_truths[cls_id]:
            continue

        dets = sorted(all_detections[cls_id], key=lambda x: x[1], reverse=True)
        if not dets:
            aps[cls_id] = 0.0
            continue
            
        gt_boxes = np.array(all_ground_truths[cls_id])
        pred_boxes = np.array([d[0] for d in dets])
        
        tp = np.zeros(len(pred_boxes))
        fp = np.zeros(len(pred_boxes))
        used_gt = np.zeros(len(gt_boxes))

        for i, p_box in enumerate(pred_boxes):
            overlaps = box_iou(torch.tensor([p_box]), torch.tensor(gt_boxes)).numpy().flatten()
            best_gt_idx = np.argmax(overlaps)
            
            if overlaps[best_gt_idx] >= iou_threshold and not used_gt[best_gt_idx]:
                tp[i] = 1
                used_gt[best_gt_idx] = 1
            else:
                fp[i] = 1
                
        tp_cum, fp_cum = np.cumsum(tp), np.cumsum(fp)
        rec = tp_cum / len(gt_boxes)
        prec = tp_cum / (tp_cum + fp_cum)
        
        # Standard 11-point interpolation for AP
        ap = 0.0
        for t in np.arange(0, 1.1, 0.1):
            if np.sum(rec >= t) == 0:
                p = 0
            else:
                p = np.max(prec[rec >= t])
            ap += p / 11
        aps[cls_id] = ap
        
    return aps