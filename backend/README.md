# Maya AI Character Backend

This is the Python backend for the Maya AI Character evaluation system using Google Gemini.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Set Environment Variable

**Option A: Set in your terminal (temporary)**
```bash
export GEMINI_API_KEY="your-actual-api-key-here"
```

**Option B: Create a .env file (recommended)**
```bash
echo "GEMINI_API_KEY=your-actual-api-key-here" > .env
```

### 4. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

- `GET /` - Health check
- `POST /chat` - Chat with Maya
- `POST /update-prompt` - Update the system prompt
- `GET /current-prompt` - Get current prompt
- `POST /evaluate` - Run evaluation on test scenarios
- `GET /health` - Detailed health check

## Testing the API

You can test the API using curl:

```bash
# Test chat endpoint
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi Maya, tell me about your morning routine!",
    "conversation_history": []
  }'
```

## Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Important Notes

- Make sure to replace `"your-gemini-api-key-here"` with your actual Google Gemini API key
- The server needs to be running for the frontend to work properly
- CORS is configured to allow requests from `http://localhost:5173` (Vite dev server)