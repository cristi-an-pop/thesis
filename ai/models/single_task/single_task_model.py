import tensorflow as tf

def build_model(backbone_name='MobileNetV2', input_shape=(224, 224, 3), num_classes=14):
    """
    Builds and compiles a Keras model using a specified pre-trained backbone.
    """
    BACKBONES = {
        'DenseNet121': tf.keras.applications.DenseNet121,
        'EfficientNetB0': tf.keras.applications.EfficientNetB0,
        'ResNet50': tf.keras.applications.ResNet50,
        'MobileNetV2': tf.keras.applications.MobileNetV2
    }

    if backbone_name not in BACKBONES:
        raise ValueError(f"Backbone '{backbone_name}' not supported. "
                         f"Choose from {list(BACKBONES.keys())}")

    base_model = BACKBONES[backbone_name](
        include_top=False,
        weights='imagenet',
        input_shape=input_shape
    )
    base_model.trainable = False 

    inputs = tf.keras.Input(shape=input_shape)
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    outputs = tf.keras.layers.Dense(num_classes, activation='sigmoid')(x)
    
    model = tf.keras.Model(inputs, outputs)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(),
        loss=tf.keras.losses.BinaryCrossentropy(),
        metrics=[tf.keras.metrics.AUC(multi_label=True, name='auc')]
    )
    
    print(f"Successfully built model with '{backbone_name}' backbone.")
    return model


def unfreeze_top_layers(model, num_layers_to_unfreeze=20):
    """Unfreezes the top layers of the model's backbone for fine-tuning."""
    base_model = model.layers[1] 
    base_model.trainable = True
    
    for layer in base_model.layers[:-num_layers_to_unfreeze]:
        layer.trainable = False
        
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss=tf.keras.losses.BinaryCrossentropy(),
        metrics=[tf.keras.metrics.AUC(multi_label=True, name='auc')]
    )
    print(f"Unfroze top {num_layers_to_unfreeze} layers for fine-tuning.")
    return model