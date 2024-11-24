from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('upload_data/', views.upload_data, name='upload_data'),
    path('transcribe/', views.transcribe, name='transcribe'),
    path('generate_code/', views.generate_code, name='generate_code'),
    path('execute_code/', views.execute_code, name='execute_code'),
    path('add_history/', views.add_history, name='add_history'),
    path('get_history/', views.get_history, name='get_history'),
    path('delete_history/', views.delete_history, name='delete_history'),
]
