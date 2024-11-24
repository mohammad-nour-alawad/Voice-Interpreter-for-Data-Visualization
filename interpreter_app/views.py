# interpreter_app/views.py

from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import requests
import json
import pandas as pd
import base64
import io

# Backend API URL
API_URL = "http://10.32.15.90:6000"  # Update if backend is hosted elsewhere

def index(request):
    if 'history' not in request.session:
        request.session['history'] = []
    return render(request, 'interpreter_app/index.html')

@csrf_exempt
def upload_data(request):
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        files = {'file': (uploaded_file.name, uploaded_file.read())}
        try:
            response = requests.post(f"{API_URL}/upload_data", files=files)
            if response.status_code == 200:
                metadata = response.json().get("metadata", {})
                return JsonResponse({'status': 'success', 'metadata': metadata})
            else:
                return JsonResponse({'status': 'error', 'message': response.text}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
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
    if request.method == 'POST':
        data = json.loads(request.body)
        command = data.get('command', '')
        payload = {'command': command}
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
    if request.method == 'POST':
        data = json.loads(request.body)
        code = data.get('code', '')
        payload = {'code': code}
        headers = {'Content-Type': 'application/json'}
        try:
            response = requests.post(f"{API_URL}/execute_code", headers=headers, data=json.dumps(payload))
            if response.status_code == 200:
                result = response.json()
                return JsonResponse({'status': 'success', 'result': result})
            else:
                return JsonResponse({'status': 'error', 'message': response.text}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

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
