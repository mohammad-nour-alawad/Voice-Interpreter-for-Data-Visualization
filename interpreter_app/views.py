from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd
import numpy as np
import base64
import io
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.axes import Axes

import seaborn as sns
import plotly
import plotly.express as px
import plotly.io as pio

import requests

API_URL = "http://10.32.15.90:6000"

df_store = None
metadata_store = {}

def index(request):
    if 'history' not in request.session:
        request.session['history'] = []
    return render(request, 'interpreter_app/index.html')

@csrf_exempt
def upload_data(request):
    global df_store, metadata_store

    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        try:
            if uploaded_file.name.endswith('.csv'):
                df = pd.read_csv(uploaded_file)
            elif uploaded_file.name.endswith('.xlsx'):
                df = pd.read_excel(uploaded_file)
            elif uploaded_file.name.endswith('.txt'):
                df = pd.read_csv(uploaded_file, delimiter='\t')
            else:
                return JsonResponse({'status': 'error', 'message': 'Unsupported file type.'}, status=400)

            df_store = df

            metadata = {}
            metadata['columns'] = list(df.columns)
            metadata['dtypes'] = df.dtypes.apply(lambda x: x.name).to_dict()
            metadata['sample_rows'] = df.head(3).to_dict(orient='records')

            numerical_cols = df.select_dtypes(include=[np.number]).columns
            metadata['numerical_ranges'] = {}
            for col in numerical_cols:
                min_value = df[col].min()
                max_value = df[col].max()
                if isinstance(min_value, (np.integer, np.int64, np.int32)):
                    min_value = int(min_value)
                elif isinstance(min_value, (np.floating, np.float64, np.float32)):
                    min_value = float(min_value)
                if isinstance(max_value, (np.integer, np.int64, np.int32)):
                    max_value = int(max_value)
                elif isinstance(max_value, (np.floating, np.float64, np.float32)):
                    max_value = float(max_value)
                metadata['numerical_ranges'][col] = {'min': min_value, 'max': max_value}

            categorical_cols = df.select_dtypes(include=['object', 'category']).columns
            metadata['categorical_values'] = {}
            for col in categorical_cols:
                unique_values = df[col].unique()
                if len(unique_values) <= 20:
                    metadata['categorical_values'][col] = unique_values.tolist()
                else:
                    metadata['categorical_values'][col] = unique_values[:20].tolist() + ['...']

            metadata_store = metadata
            return JsonResponse({'status': 'success', 'metadata': metadata})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def transcribe(request):
    if request.method == 'POST' and request.FILES.get('file'):
        audio_file = request.FILES['file']
        files = {'file': (audio_file.name, audio_file.read(), 'audio/wav')}
        try:
            response = requests.post(f"{API_URL}/transcribe", files=files)
            if response.status_code == 200:
                text = response.json().get("text", "")
                return JsonResponse({'status': 'success', 'text': text})
            else:
                return JsonResponse({'status': 'error', 'message': response.text}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def generate_code(request):
    global metadata_store
    if request.method == 'POST':
        data = json.loads(request.body)
        command = data.get('command', '')

        payload = {
            'command': command,
            'metadata': metadata_store
        }
        headers = {'Content-Type': 'application/json'}

        try:
            response = requests.post(f"{API_URL}/generate_code", headers=headers, data=json.dumps(payload))
            if response.status_code == 200:
                code = response.json().get('code', '')
                return JsonResponse({'status': 'success', 'code': code})
            else:
                return JsonResponse({'status': 'error', 'message': response.text}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def execute_code(request):
    """
    Executes user-submitted Python (Pandas) code within a restricted environment,
    collects all notable outputs (plots, DataFrames, Plotly figures, etc.),
    and returns them in a single 'multi' response for consistent visualization.
    De-duplicates objects so the same figure or variable won't show up twice.
    """
    global df_store
    if request.method == 'POST':
        if df_store is None:
            return JsonResponse({'status': 'error', 'message': 'No data uploaded yet.'}, status=400)

        data = json.loads(request.body)
        code = data.get('code', '')

        # local context
        df = df_store
        allowed_locals = {
            'df': df,
            'pd': pd,
            'np': np,
            'plt': plt,
            'sns': sns,
            'px': px,
            'plotly': plotly
        }
        exec_globals = {"__builtins__": None}

        # Remove any import lines for security
        cleaned_code_lines = []
        for line in code.split("\n"):
            if not line.strip().startswith("import"):
                cleaned_code_lines.append(line)
        cleaned_code = "\n".join(cleaned_code_lines)

        # Attempt to separate the last line if it's an expression
        lines = cleaned_code.strip().split('\n')
        last_line = lines[-1].strip() if lines else ''

        def is_expression(s):
            return (
                not s.startswith(('print', 'plt.', 'sns.', 'px.' )) # 'df ', 'df.', 'df['
                and '=' not in s
                and not s.endswith(':')
            )

        result_value = None
        try:
            if len(lines) > 1 and is_expression(last_line):
                # Exec everything except the last line
                code_body = '\n'.join(lines[:-1])
                exec(code_body, exec_globals, allowed_locals)
                # Evaluate the last line
                result_value = eval(last_line, exec_globals, allowed_locals)
            else:
                # Just exec all
                exec(cleaned_code, exec_globals, allowed_locals)

        except KeyError as e:
            return JsonResponse({
                'status': 'error',
                'message': f"KeyError: {str(e)}. Check your code logic and variable usage."
            }, status=200)
        except TypeError as e:
            return JsonResponse({
                'status': 'error',
                'message': f"TypeError: {str(e)}. Ensure your code initializes required variables."
            }, status=200)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f"Error: {str(e)}."}, status=200)

        # If user modified df in code, update df_store to keep changes
        if 'df' in allowed_locals and isinstance(allowed_locals['df'], pd.DataFrame):
            df_store = allowed_locals['df']

        output_items = []
        collected_ids = set()  # to avoid duplicates

        def convert_and_add(obj):
            """Converts object to output format once; avoids duplicates by ID."""
            obj_id = id(obj)
            if obj_id in collected_ids:
                return  # already processed
            converted = _convert_object_to_output(obj)
            if converted:
                collected_ids.add(obj_id)
                output_items.append(converted)

        # 1) If there was a direct expression result, handle that first
        if result_value is not None:
            convert_and_add(result_value)

        # 2) Gather any open matplotlib figures
        fig_nums = plt.get_fignums()
        for fignum in fig_nums:
            fig = plt.figure(fignum)
            convert_and_add(fig)
        # optionally close them to prevent re‐rendering next time
        plt.close('all')

        # 3) Inspect local variables for DataFrames, Plotly figures, etc.
        #    Some might be the same object as result_value or a figure above.
        standard_vars = {'pd', 'np', 'plt', 'sns', 'px', 'plotly', 'df'}
        for var_name, var_value in allowed_locals.items():
            if var_name in standard_vars:
                continue
            convert_and_add(var_value)

        # If no items found, show a text message
        if not output_items:
            output_items.append({
                'type': 'text',
                'data': "Code executed successfully but no notable object found."
            })

        # Return a single 'multi' response
        return JsonResponse({
            'status': 'success',
            'result': {
                'type': 'multi',
                'data': output_items
            }
        })

    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)


def _convert_object_to_output(obj):
    """
    Convert a Python object (DataFrame, figure, Plotly figure, string, numeric, etc.)
    into a dictionary { 'type': ..., 'data': ... } recognized by the frontend.

    Return None if the object is not recognized or is trivial (e.g., modules).
    """
    import base64
    import io
    import plotly

    # 1) Pandas DataFrame
    if isinstance(obj, pd.DataFrame):
        return {
            'type': 'table',
            'data': obj.to_json(orient="split")
        }

    # 2) Matplotlib Figure or Axes
    if isinstance(obj, matplotlib.figure.Figure):
        buf = io.BytesIO()
        obj.savefig(buf, format='png')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        return {
            'type': 'plot',
            'data': img_base64
        }
    if isinstance(obj, Axes):
        fig = obj.get_figure()
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        return {
            'type': 'plot',
            'data': img_base64
        }

    # 3) Plotly Figure
    if hasattr(obj, '__class__') and 'plotly' in str(type(obj)):
        fig_html = plotly.io.to_html(obj, full_html=False)
        return {
            'type': 'plotly',
            'data': fig_html
        }

    # 4) Primitive (string, numeric, bool) -> text
    if isinstance(obj, (str, int, float, bool)):
        return {
            'type': 'text',
            'data': str(obj)
        }

    # 5) If it's something else (like a list, dict, custom object), 
    #    either skip or return a truncated string representation.
    text_repr = str(obj)
    if len(text_repr) > 2000:
        text_repr = text_repr[:2000] + " ... [truncated]"
    return {
        'type': 'text',
        'data': text_repr
    }

@csrf_exempt
def add_history(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        command = data.get('command', '')
        code = data.get('code', '')
        history = request.session.get('history', [])
        history.append({'command': command, 'code': code})
        request.session['history'] = history
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

def get_history(request):
    if request.method == 'GET':
        history = request.session.get('history', [])
        return JsonResponse({'status': 'success', 'history': history})
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def delete_history(request):
    if request.method == 'POST':
        request.session['history'] = []
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)
