# AI Data Assistant - Voice-Driven Data Analysis

![Django](https://img.shields.io/badge/django-4.2+-green.svg)
![Pandas](https://img.shields.io/badge/pandas-2.0+-blue.svg)
![Interactive Visualization](https://img.shields.io/badge/visualization-matplotlib%7Cseaborn%7Cplotly-orange.svg)

A full-stack web application that transforms natural language commands into executable data analysis code through voice/text input, featuring real-time visualization and collaborative history management.

## 🚀 Key Methodology

1. **Voice-First Architecture**  
   - Real-time Web Audio API recording
   - Dual input modality (voice/text)
   - Auto-playback of AI responses
   - Session-based conversation history

2. **Secure Code Sandboxing**  
   - Automatic result type detection (plots in Plotly/plt/sns, DataFrames, text)
   - Context-aware code execution environment
   - Namespace isolation with allowed globals
   - LLM code cleaning

3. **Smart Data Handling**  
   - Multi-format support (CSV/XLSX/TXT)
   - Dynamic metadata extraction
   - Data snapshot preservation
   - Type-safe numerical range detection

### Technical Highlights
- **Live Plot Rendering**: Matplotlib/Plotly/Seaborn visualization pipeline
- **Code Generation Memory**: Context-aware history tracking
- **Reactive UI**: Toast notifications + real-time updates
- **Session Storage**: Encrypted history preservation

## 🛠 Tech Stack

**Core Framework**  
- Django 4.2+
- Django REST Framework

**Data Ecosystem**  
- Pandas/Numpy
- Matplotlib/Seaborn
- Plotly

**Voice Processing**  
- Web Audio API
- FastAPI backend integration

**Frontend**  
- Bootstrap 5
- Toastr.js
- Plotly.js

## 🌐 Core Workflow

 ```mermaid
 graph TD
    A[User Uploads Data File] --> B[Initialize DataFrame]
    B --> C[User Provides Command]
    C -->|Voice Input| D[Record Audio]
    C -->|Text Input| E[Direct Command]
    D --> F[Transcribe to Text]
    E --> G[Generate Pandas Code]
    F --> G
    
    G --> H{Response Type?}
    H -->|Audio Chat| I[Play Voice Response]
    H -->|Code| J[Display Generated Code]
    
    J --> K[Execute Code]
    K --> L{Output Detection}
    L --> M[Text Output]
    L --> N[Data Table]
    L --> O[Matplotlib Plot]
    L --> P[Plotly Figure]
    
    style A fill:#4CAF50,stroke:#388E3C
    style G fill:#9C27B0,stroke:#7B1FA2
    style I fill:#FF5722,stroke:#E64A19
    style J fill:#3F51B5,stroke:#303F9F
    style M fill:#607D8B,stroke:#455A64
    style N fill:#795548,stroke:#5D4037
    style O fill:#2196F3,stroke:#1976D2
    style P fill:#009688,stroke:#00796B

    classDef outputTypes fill:#fff,stroke:#666,stroke-width:2px
    class M,N,O,P outputTypes
```

### 🗂 Core Project Files

``` bash
├── interpreter_app/
│   ├── migrations/
│   ├── static/
│   │   └── js/
│   │       ├── audio_recorder.js   # Voice processing
│   │       ├── command_handler.js  # AI interaction
│   │       ├── file_upload.js      # Data loader 
│   │       ├── toastr_config.js    # Notification config
│   │       └── history_handler.js  # Session management
│   ├── templates/
│   │   └── index.html              # Responsive UI
│   ├── urls.py                     # API endpoints
│   └── views.py                    # Core logic
└── requirements.txt
```

## 🚀 Getting Started

```bash
git clone https://github.com/mohammad-nour-alawad/Voice-Interpreter-for-Data-Visualization.git
cd Voice-Interpreter-for-Data-Visualization

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

python manage.py migrate
```

### Running the Application
```bash
python manage.py runserver
```
