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

## Evaluation and Scoring Logic

For each model response, the backend computes the following for each of the four metrics:
- **Consistency**
- **Engagement**
- **Brand Alignment**
- **Authenticity**

### 1. Rule-Based Score (S_M)
Traditional, hand-crafted logic for each metric (range: 0–100).

### 2. Semantic Similarity Score (E_M)
Cosine similarity between the model response and a set of themes (using sentence-transformers embeddings) for each metric (range: 0–1, scaled to 0–100).

### 3. Combined Score (C_M)
For each metric M:

    C_M = (S_M + (E_M × 100)) / 2

Where:
- S_M = Rule-based score for metric M (0–100)
- E_M = Semantic similarity for metric M (0–1)

### 4. Cumulative Semantic Score

    Cumulative_Semantic = (E_Consistency + E_Engagement + E_BrandAlignment + E_Authenticity) / 4

### 5. Cumulative Combined Score

    Cumulative_Combined = (C_Consistency + C_Engagement + C_BrandAlignment + C_Authenticity) / 4

### 6. Overall Score

    Overall_Score = (Cumulative_Combined + (Cumulative_Semantic × 100)) / 2

### 7. Output Fields
- For each metric: rule-based, semantic, and combined scores
- Cumulative semantic score (0–1)
- Cumulative combined score (0–100)
- Overall score (0–100)

**This approach ensures both traditional and semantic (embedding-based) evaluation are used for robust, explainable scoring.**