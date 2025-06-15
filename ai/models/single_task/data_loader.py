import tensorflow as tf
import pandas as pd

AUTOTUNE = tf.data.AUTOTUNE

def get_dataset_slice(image_list_file, all_xray_df, image_dir, batch_size=32, image_size=(224, 224)):
    """Creates a tf.data.Dataset for a given slice of the data (train, val, or test)."""
    df = pd.read_csv(image_list_file, header=None, names=['Image Index'])
    df = df.merge(all_xray_df, on='Image Index')

    image_paths = image_dir + '/' + df['Image Index']
    labels = tf.constant(df.iloc[:, 2:].values, dtype=tf.float32)

    dataset = tf.data.Dataset.from_tensor_slices((image_paths, labels))

    def process_path(file_path, label):
        img = tf.io.read_file(file_path)
        img = tf.image.decode_png(img, channels=3)
        img = tf.image.resize(img, image_size)
        img = img / 255.0 
        return img, label

    dataset = dataset.map(process_path, num_parallel_calls=AUTOTUNE)
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(buffer_size=AUTOTUNE)

    return dataset