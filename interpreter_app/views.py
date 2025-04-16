# views.py

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd
import numpy as np
import base64
import io
import json
import matplotlib

from interpreter_app.helpers import update_metadata
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.axes import Axes

import seaborn as sns
import plotly
import plotly.express as px
import plotly.io as pio

import requests

API_URL = "http://10.32.15.88:6000"

df_store = None
metadata_store = {}

def index(request):
    if 'history' not in request.session:
        request.session['history'] = []
    request.session['chat_history'] = []
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
    """
    preview:
    - Sends a POST request to the /converse endpoint.
    - Uses payload keys 'user_input', 'metadata', and 'conversation_history' (from 'chat_history').
    - Updates the session chat_history with the returned updated_history.
    - Returns code and message.
    """
    global metadata_store
    if request.method == 'POST':
        data = json.loads(request.body)
        command = data.get('command', '')
        chat_history = request.session.get('chat_history', [])
        payload = {
            'user_input': command,
            'metadata': metadata_store,
            'conversation_history': chat_history
        }
        headers = {'Content-Type': 'application/json'}
        try:
            response = requests.post(f"{API_URL}/converse", headers=headers, data=json.dumps(payload))
            if response.status_code == 200:
                res_json = response.json()
                code = res_json.get('code', '')
                message = res_json.get('message', '')
                audio = res_json.get('audio', '')
                updated_history = res_json.get('updated_history', [])
                request.session['chat_history'] = updated_history
                return JsonResponse({
                    'status': 'success',
                    'code': code,
                    'message': message,
                    'audio': audio,
                })
            else:
                return JsonResponse({'status': 'error', 'message': response.text}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def execute_code(request):
    global df_store, metadata_store
    if request.method == 'POST':
        if df_store is None:
            return JsonResponse({'status': 'error', 'message': 'No data uploaded yet.'}, status=400)
        data = json.loads(request.body)
        code = data.get('code', '')
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
        cleaned_code_lines = []
        for line in code.split("\n"):
            if not line.strip().startswith("import"):
                cleaned_code_lines.append(line)
        cleaned_code = "\n".join(cleaned_code_lines)
        lines = cleaned_code.strip().split('\n')
        last_line = lines[-1].strip() if lines else ''
        def is_expression(s):
            return (
                not s.startswith(('print', 'plt.', 'sns.', 'px.' ))
                and '=' not in s
                and not s.endswith(':')
            )
        result_value = None
        try:
            if len(lines) > 1 and is_expression(last_line):
                code_body = '\n'.join(lines[:-1])
                exec(code_body, exec_globals, allowed_locals)
                result_value = eval(last_line, exec_globals, allowed_locals)
            else:
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

        # Update the stored DataFrame and metadata if 'df' is modified
        if 'df' in allowed_locals and isinstance(allowed_locals['df'], pd.DataFrame):
            df_store = allowed_locals['df']
            metadata_store = update_metadata(df_store)  # update metadata

        output_items = []
        collected_ids = set()
        def convert_and_add(obj):
            obj_id = id(obj)
            if obj_id in collected_ids:
                return
            converted = _convert_object_to_output(obj)
            if converted:
                collected_ids.add(obj_id)
                output_items.append(converted)
        if result_value is not None:
            convert_and_add(result_value)
        fig_nums = plt.get_fignums()
        for fignum in fig_nums:
            fig = plt.figure(fignum)
            convert_and_add(fig)
        plt.close('all')
        standard_vars = {'pd', 'np', 'plt', 'sns', 'px', 'plotly', 'df'}
        for var_name, var_value in allowed_locals.items():
            if var_name in standard_vars:
                continue
            convert_and_add(var_value)
        if not output_items:
            output_items.append({
                'type': 'text',
                'data': "Code executed successfully but no notable object found."
            })
        return JsonResponse({
            'status': 'success',
            'result': {
                'type': 'multi',
                'data': output_items
            },
            'metadata': metadata_store  # include updated metadata in response
        })
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

def _convert_object_to_output(obj):
    import base64
    import io
    import plotly
    if isinstance(obj, pd.DataFrame):
        return {
            'type': 'table',
            'data': obj.to_json(orient="split")
        }
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
    if hasattr(obj, '__class__') and 'plotly' in str(type(obj)):
        fig_html = plotly.io.to_html(obj, full_html=False)
        return {
            'type': 'plotly',
            'data': fig_html
        }
    if isinstance(obj, (str, int, float, bool)):
        return {
            'type': 'text',
            'data': str(obj)
        }
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
