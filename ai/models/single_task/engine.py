import tensorflow as tf
from src.single_task.single_task_model import unfreeze_top_layers

def train_model_sequentially(model, train_dataset, val_dataset, epochs_head=10, epochs_fine_tune=20, checkpoint_path='best_model.h5'):
    early_stopping = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    model_checkpoint = tf.keras.callbacks.ModelCheckpoint(checkpoint_path, save_best_only=True, monitor='val_loss')

    print("\n--- STAGE 1: Training classification head ---")
    history_head = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=epochs_head,
        callbacks=[early_stopping, model_checkpoint]
    )

    print("\n--- STAGE 2: Fine-tuning top layers ---")
    model = unfreeze_top_layers(model) # Assumes the function is imported or in this file
    
    initial_epoch = history_head.epoch[-1] + 1
    history_fine_tune = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=initial_epoch + epochs_fine_tune,
        initial_epoch=initial_epoch,
        callbacks=[early_stopping, model_checkpoint]
    )
    
    history = {}
    for key in history_head.history.keys():
        history[key] = history_head.history[key] + history_fine_tune.history[key]

    model.load_weights(checkpoint_path)
    
    return model, history