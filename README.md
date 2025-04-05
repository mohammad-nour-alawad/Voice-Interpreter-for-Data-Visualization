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
    A[User] --> B[Upload File]
    B --> C{Valid?}
    C -->|Yes| D[Store Data & Metadata]
    C -->|No| E(Error)
    
    A --> F[Command Input]
    F -->|Text| G(Process Text)
    F -->|Voice| H[Record Audio]
    H --> I{{External API}}-.Transcribe.->G
    
    G --> J{{External API}}-.Generate Code.->K
    K[Display Code] --> L[Execute]
    L --> M{Safe?}
    M -->|Yes| N[Run in Sandbox]
    M -->|No| E
    N --> O[Capture Output]
    O --> P[Update Data/Display]
    P --> Q[Plotly]
    P --> U[SNS]
    P --> V[PLT]
    P --> W[Dataframe]
    P --> X[Text/Numerical]
    Q --> T[Save History]
    U --> T[Save History]
    V --> T[Save History]
    W --> T[Save History]
    X --> T[Save History]
    
    J{{External API}}-.Generate Chat answer.->R
    R[Display Message] --> S[Play message]
    style E fill:#f44336,stroke:#d32f2f
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
