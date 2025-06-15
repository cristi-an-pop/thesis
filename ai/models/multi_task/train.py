import torch
import argparse
from torch.utils.tensorboard import SummaryWriter
from src.models import MultiTaskModel
from src.data_loader import get_dataloaders
from src.utils import train_one_epoch, evaluate

def main(args):
    device = torch.device("cuda" if torch.cuda.is_available() and args.use_cuda else "cpu")
    writer = SummaryWriter(log_dir=args.log_dir)

    # train_loader, val_loader, classes = get_dataloaders(args.data_path, args.batch_size)
    # model = MultiTaskModel().to(device)
    # optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    # cls_criterion = torch.nn.BCEWithLogitsLoss()
    # lr_scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min')
    
    # Exit if placeholders are not replaced
    if model is None: return

    # --- Training Loop ---
    best_val_loss = float('inf')
    history = {k: [] for k in ['train_loss', 'val_loss', 'val_auc', 'val_ap_cls', 'val_ap_det']}

    for epoch in range(args.epochs):
        print(f"\nEpoch {epoch + 1}/{args.epochs}")
        
        train_losses = train_one_epoch(model, cls_criterion, train_loader, optimizer, device)
        val_metrics = evaluate(model, cls_criterion, val_loader, device, classes)

        lr_scheduler.step(val_metrics['classification_loss'])
        
        # Logging to console
        print(f"Train Loss: {train_losses['total_loss']:.4f} | Val Loss: {val_metrics['classification_loss']:.4f} | "
              f"Val AUC: {val_metrics['mean_auc']:.4f} | Val mAP (Cls): {val_metrics['mean_ap_cls']:.4f} | "
              f"Val mAP (Det): {val_metrics['mean_ap_det']:.4f}")
        
        # Logging to TensorBoard
        writer.add_scalars('Loss', {'train': train_losses['total_loss'], 'validation': val_metrics['classification_loss']}, epoch)
        writer.add_scalar('Val/Mean_AUC', val_metrics['mean_auc'], epoch)
        writer.add_scalar('Val/Mean_AP_Classification', val_metrics['mean_ap_cls'], epoch)
        writer.add_scalar('Val/Mean_AP_Detection', val_metrics['mean_ap_det'], epoch)
        
        # Save best model
        if val_metrics['classification_loss'] < best_val_loss:
            best_val_loss = val_metrics['classification_loss']
            torch.save(model.state_dict(), args.save_path)
            print(f"Saved new best model to {args.save_path}")
    
    writer.close()
    print("--- Training complete ---")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train Multi-Task Chest X-ray Model")
    parser.add_argument('--epochs', type=int, default=20, help='Number of training epochs')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--batch_size', type=int, default=16)
    parser.add_argument('--data_path', type=str, required=True, help='Path to data directory')
    parser.add_argument('--log_dir', type=str, default='runs/experiment1', help='TensorBoard log directory')
    parser.add_argument('--save_path', type=str, default='best_model.pth', help='Path to save the best model')
    parser.add_argument('--use_cuda', action='store_true', help='Use CUDA if available')
    args = parser.parse_args()
    main(args)