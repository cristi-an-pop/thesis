import torch.nn as nn
from torchvision.models.detection import FasterRCNN
from torchvision.models.detection.anchor_utils import AnchorGenerator
from torchvision import models, ops

class MultiTaskModel(nn.Module):
    def __init__(self, num_classes=14, pretrained=True):
        super(MultiTaskModel, self).__init__()
        self.shared_backbone = models.densenet121(pretrained=pretrained).features

        # classification head
        self.cls_pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(1024, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )

        self.detection_backbone = self.create_detection_backbone()

        # anchor generator for RPN
        anchor_generator = AnchorGenerator(
            sizes=((32, 64, 128, 256),),
            aspect_ratios=((0.5, 1.0, 2.0),)
        )

        # define the RoI pooler
        roi_pooler = ops.MultiScaleRoIAlign(
            featmap_names=['0'],
            output_size=7,
            sampling_ratio=2
        )


        # create Faster R-CNN detector
        self.detector = FasterRCNN(
            self.detection_backbone,
            num_classes=num_classes + 1,  # +1 for background class
            rpn_anchor_generator=anchor_generator,
            box_roi_pool=roi_pooler,
            min_size=224,
            max_size=224,
            box_score_thresh=0.05,
            box_nms_thresh=0.5
        )

        # freeze the shared backbone parameters for the detector
        for param in self.shared_backbone.parameters():
            param.requires_grad = True

    def create_detection_backbone(self):
        class CustomBackbone(nn.Module):
            def __init__(self, shared_features):
                super(CustomBackbone, self).__init__()
                self.shared_features = shared_features
                self.out_channels = 1024

            def forward(self, x):
                features = self.shared_features(x)
                return {'0': features}

        return CustomBackbone(self.shared_backbone)

    def forward(self, images, targets=None, mode='both'):
        if mode == 'classification' or mode == 'both':
            # classification forward pass
            features = self.shared_backbone(images)
            pooled = self.cls_pool(features)
            cls_output = self.classifier(pooled)

            if mode == 'classification':
                return cls_output

        if mode == 'detection' or mode == 'both':
            # detection forward pass
            if self.training and targets is not None:
                # during training, we need to compute losses
                det_losses = self.detector(images, targets)

                if mode == 'detection':
                    return det_losses

                # for 'both' mode, we return both outputs
                return cls_output, det_losses
            else:
                # during evaluation/inference
                det_output = self.detector(images)

                if mode == 'detection':
                    return det_output

                # for 'both' mode
                return cls_output, det_output