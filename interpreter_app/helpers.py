import numpy as np
import pandas as pd


def update_metadata(df):
    metadata = {}
    metadata['columns'] = list(df.columns)
    metadata['dtypes'] = df.dtypes.apply(lambda x: x.name).to_dict()
    metadata['sample_rows'] = df.head(3).to_dict(orient='records')

    numerical_cols = df.select_dtypes(include=[np.number]).columns
    metadata['numerical_ranges'] = {}
    for col in numerical_cols:
        min_val = df[col].min()
        max_val = df[col].max()
        if pd.api.types.is_integer_dtype(df[col]):
            min_val, max_val = int(min_val), int(max_val)
        else:
            min_val, max_val = float(min_val), float(max_val)
        metadata['numerical_ranges'][col] = {'min': min_val, 'max': max_val}

    categorical_cols = df.select_dtypes(include=['object', 'category']).columns
    metadata['categorical_values'] = {}
    for col in categorical_cols:
        unique_vals = df[col].unique()
        if len(unique_vals) <= 20:
            metadata['categorical_values'][col] = unique_vals.tolist()
        else:
            metadata['categorical_values'][col] = unique_vals[:20].tolist() + ['...']
    return metadata
