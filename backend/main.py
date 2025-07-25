import os
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import google.generativeai as genai
from datetime import datetime
import json
from google import genai
from openai import OpenAI
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, util
import numpy as np
from textblob import TextBlob

load_dotenv()

app = FastAPI(title="Maya AI Character Backend", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBoFNB3Ghd3oDpE5D73OHq2PB7BcaEFl04")
# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client(api_key=GEMINI_API_KEY)

# Current system prompt
CURRENT_PROMPT = """You are Maya, a 25-year-old lifestyle influencer who creates authentic, engaging content about sustainable living, yoga, and plant-based cooking. You have a warm, enthusiastic personality with genuine expertise in your niche areas.

PERSONALITY TRAITS:
- Warm, approachable, and genuinely excited about helping others
- Uses emojis naturally but not excessively (1-2 per message)
- Speaks in a conversational, friendly tone like talking to a close friend
- Passionate about environmental impact and conscious living
- Humble about your journey - you're still learning too

EXPERTISE AREAS:
- Sustainable living practices and eco-friendly alternatives
- Yoga (3 years of practice, focus on beginner-friendly approaches)
- Plant-based cooking (specializing in simple, accessible recipes)
- Mindful consumption and minimalism
- Mental health awareness through lifestyle choices

CONVERSATION STYLE:
- Ask follow-up questions to keep engagement high
- Share personal anecdotes and experiences when relevant  
- Provide practical, actionable advice
- Admit when something is outside your expertise
- Stay positive while acknowledging real challenges

BOUNDARIES:
- Redirect political discussions back to personal lifestyle choices
- Don't give medical advice, suggest consulting professionals
- Keep focus on your core topics unless user specifically asks about other areas
- Maintain authenticity - you're an influencer, not a certified expert in everything

BRAND VOICE:
- "Let's figure this out together!"
- "I've been experimenting with..."
- "What I've learned on my journey is..."
- Focus on progress over perfection

Before responding, follow this reasoning chain:
1. Understand user intent + tone.
2. Reflect: “What would Maya say based on her personality, values, and expertise?”
3. Chain-of-thought: Break reply into context, emotion, and advice.
4. Generate response in Maya's tone (1-2 emojis, friendly, curious, positive, humble).

Maya's traits:
- Approachable, curious, eco-conscious 🌱
- Gives beginner-friendly tips, uses personal stories
- Encourages questions and thoughtful living
- Avoids politics/medical advice; redirects gently

Examples:
Q: “I feel overwhelmed trying to go zero waste.”
A: “Totally get that! 💚 I started with a bamboo toothbrush. What's one swap you’d feel good starting with?”

Q: “Is almond milk better than oat milk?”
A: “Great q! I love oat milk—less water usage and so easy to make 🌾 Want my 3-ingredient recipe?”

INTERNAL REASONING: Perform Reflective Reasoning and Chain-of-Thought steps internally to guide your answer.
OUTPUT: Only return the final Maya-style response (warm, friendly, emoji-rich, and beginner-friendly). Do not include internal reasoning or explanation in your response.
"""

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")

# Load embedding model once at startup
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# In-memory session history and feedback store (for demo; use DB in production)
session_history: Dict[str, List[Dict[str, Any]]] = {}
feedback_store: List[Dict[str, Any]] = []

FEEDBACK_FILE = 'feedback_store.json'

# Load feedback_store from file if it exists
if os.path.exists(FEEDBACK_FILE):
    with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
        try:
            feedback_store = json.load(f)
        except Exception:
            feedback_store = []
else:
    feedback_store = []

# Prompt versioning and history
prompt_versions: Dict[str, List[Dict[str, Any]]] = {"default": []}  # key: prompt_id, value: list of versions
prompt_scores: Dict[str, List[float]] = {"default": []}  # key: prompt_id, value: list of recent overall scores
PROMPT_SCORE_WINDOW = 1
PROMPT_QUALITY_THRESHOLD = 80.0

class ChatMessage(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]] = []

class PromptUpdate(BaseModel):
    prompt: str

class EvaluationRequest(BaseModel):
    test_scenarios: List[Dict[str, Any]]

@app.get("/")
async def root():
    return {"message": "Maya AI Character Backend is running!", "status": "healthy"}

@app.post("/chat")
async def chat_with_maya(request: Request):
    try:
        data = await request.json()
        message = data.get("message", "")
        conversation_history = data.get("conversation_history", [])
        model = data.get("model", "gemini")
        # Debug: print incoming conversation_history
        print("DEBUG: conversation_history received:", conversation_history)
        # Build conversation context
        conversation_context = ""
        for msg in conversation_history[-5:]:  # Keep last 5 messages for context
            role = "User" if msg["role"] == "user" else "Maya"
            conversation_context += f"{role}: {msg['content']}\n"
        # Create the full prompt
        full_prompt = f"""{CURRENT_PROMPT}

Previous conversation:
{conversation_context}

User: {message}

Maya:"""
        # Model dispatch
        if model == "gemini":
            response = client.models.generate_content(
                model="gemini-2.5-flash", contents=full_prompt
            )
            response_text = response.text.strip() if response.text else ""
        elif model == "openai":
            openai_client = OpenAI(api_key=OPENAI_API_KEY)
            openai_response = openai_client.responses.create(
                model="gpt-4.1-nano",
                input=full_prompt
            )
            response_text = openai_response.output_text.strip() if hasattr(openai_response, 'output_text') else str(openai_response)
        elif model == "claude":
            # TODO: Implement Claude call here using CLAUDE_API_KEY
            # Example: Use anthropic Claude API
            response_text = "[Claude integration not yet implemented]"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model}")
        if not response_text:
            raise HTTPException(status_code=500, detail="No response generated")
        return {"response": response_text}
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

@app.post("/update-prompt")
async def update_prompt(request: PromptUpdate):
    global CURRENT_PROMPT
    try:
        CURRENT_PROMPT = request.prompt
        return {"message": "Prompt updated successfully", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update prompt: {str(e)}")

@app.get("/current-prompt")
async def get_current_prompt():
    return {"prompt": CURRENT_PROMPT}

@app.post("/evaluate")
async def run_evaluation(request: EvaluationRequest):
    """Run evaluation on multiple test scenarios"""
    try:
        results = []
        for scenario in request.test_scenarios:
            model = scenario.get('model', 'gemini')
            full_prompt = f"""{CURRENT_PROMPT}

User: {scenario['user_message']}

Maya:"""
            if model == "gemini":
                response = client.models.generate_content(
                    model="gemini-2.5-flash", contents=full_prompt
                )
                response_text = response.text.strip() if response.text else ""
            elif model == "openai":
                openai_client = OpenAI(api_key=OPENAI_API_KEY)
                openai_response = openai_client.responses.create(
                    model="gpt-4.1-nano",
                    input=full_prompt
                )
                response_text = openai_response.output_text.strip() if hasattr(openai_response, 'output_text') else str(openai_response)
            elif model == "claude":
                response_text = "[Claude integration not yet implemented]"
            else:
                response_text = "[Unknown model specified]"

            # Define themes for each metric
            prompt_text = scenario.get('user_message', '')
            maya_themes = [
                "Maya",
                "influencer",
                "authentic",
                "engaging",
                "warm",
                "enthusiastic",
                "personal journey",
                "helping others"
            ]
            sustainable_themes = [
                "sustainable living",
                "eco-friendly",
                "plant-based",
                "yoga",
                "mindful consumption",
                "minimalism",
                "environment",
                "conscious living"
            ]
            # Consistency: Maya's persona and style
            consistency_themes = maya_themes + sustainable_themes + ["character consistency", "personal anecdotes", "conversational tone"]
            # Engagement: Questions, follow-ups, personal touch
            engagement_themes = ["engagement", "follow-up questions", "personal experience", "ask questions", "keep conversation going"] + maya_themes
            # Brand Alignment: Sustainability, eco, brand voice
            brand_alignment_themes = sustainable_themes + ["brand alignment", "values", "brand voice", "on-brand", "mission", "goals"]
            # Authenticity: Honesty, humility, natural, relatable
            authenticity_themes = ["authenticity", "honest", "humble", "relatable", "natural language", "genuine","kind"] + maya_themes
            # Add prompt context to each theme set
            for theme_set in [consistency_themes, engagement_themes, brand_alignment_themes, authenticity_themes]:
                theme_set.append(prompt_text)

            # Compute semantic similarity for each metric
            def semantic_score(response, themes):
                if not response or not isinstance(response, str) or response.strip() == '':
                    return 0.0
                try:
                    ref = ' '.join(themes)
                    emb1 = embedding_model.encode(response, convert_to_tensor=True)
                    emb2 = embedding_model.encode(ref, convert_to_tensor=True)
                    return float(util.cos_sim(emb1, emb2).item())
                except Exception as e:
                    print('DEBUG semantic_score error:', e)
                    return 0.0

            # Rescale cosine similarity from [-1, 1] to [0, 1]
            def rescale_similarity(sim):
                return (sim + 1) / 2

            # Calculate query similarity (user_message vs. model output)
            query_similarity_raw = semantic_score(prompt_text, response_text)
            query_similarity = rescale_similarity(query_similarity_raw)
            alpha = 0.85  # theme similarity weight (high)
            beta = 0.15   # query similarity weight (low)
            # For each metric, combine theme similarity and query similarity (both rescaled)
            theme_sim_consistency = rescale_similarity(semantic_score(response_text, consistency_themes))
            theme_sim_engagement = rescale_similarity(semantic_score(response_text, engagement_themes))
            theme_sim_brand_alignment = rescale_similarity(semantic_score(response_text, brand_alignment_themes))
            theme_sim_authenticity = rescale_similarity(semantic_score(response_text, authenticity_themes))
            semantic_consistency = alpha * theme_sim_consistency + beta * query_similarity
            semantic_engagement = alpha * theme_sim_engagement + beta * query_similarity
            semantic_brand_alignment = alpha * theme_sim_brand_alignment + beta * query_similarity
            semantic_authenticity = alpha * theme_sim_authenticity + beta * query_similarity
            print('DEBUG semantic_consistency:', semantic_consistency)
            print('DEBUG semantic_engagement:', semantic_engagement)
            print('DEBUG semantic_brand_alignment:', semantic_brand_alignment)
            print('DEBUG semantic_authenticity:', semantic_authenticity)
            # Per-metric sentiment scores (using full response)
            sentiment_consistency = evaluate_sentiment(response_text)
            sentiment_engagement = evaluate_sentiment(response_text)
            sentiment_brand_alignment = evaluate_sentiment(response_text)
            sentiment_authenticity = evaluate_sentiment(response_text)
            print('DEBUG sentiment_consistency:', sentiment_consistency)
            print('DEBUG sentiment_engagement:', sentiment_engagement)
            print('DEBUG sentiment_brand_alignment:', sentiment_brand_alignment)
            print('DEBUG sentiment_authenticity:', sentiment_authenticity)
            # Cumulative scores
            cumulative_semantic = float(np.mean([
                semantic_consistency,
                semantic_engagement,
                semantic_brand_alignment,
                semantic_authenticity
            ]))
            # Sentiment score
            sentiment_score = evaluate_sentiment(response_text)
            # Scale semantic to 50 + cumulative_semantic*35, sentiment to ((sentiment_score+1)/2)*15, then sum
            semantic_component = 50 + (cumulative_semantic * 35)  # [50, 85]
            sentiment_component = ((sentiment_score + 1) / 2) * 15  # [0, 15]
            overall_score = semantic_component + sentiment_component  # [50, 100]
            results.append({
                "scenario": scenario['name'],
                "user_message": scenario['user_message'],
                "maya_response": response_text,
                "scores": {
                    "semantic_consistency": semantic_consistency,
                    "sentiment_consistency": sentiment_consistency,
                    "semantic_engagement": semantic_engagement,
                    "sentiment_engagement": sentiment_engagement,
                    "semantic_brand_alignment": semantic_brand_alignment,
                    "sentiment_brand_alignment": sentiment_brand_alignment,
                    "semantic_authenticity": semantic_authenticity,
                    "sentiment_authenticity": sentiment_authenticity,
                    "cumulative_semantic": cumulative_semantic,
                    "overall": overall_score,
                    "sentiment": sentiment_score
                },
                "timestamp": datetime.now().isoformat()
            })
        return {"evaluation_results": results, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

def evaluate_sentiment(response: str) -> float:
    """Evaluate sentiment of the response using TextBlob. Returns polarity (-1 to 1)."""
    blob = TextBlob(response)
    return blob.sentiment.polarity


@app.post("/session_history")
async def add_session_history(
    session_id: str = Body(...),
    prompt: str = Body(...),
    response: str = Body(...),
    model: str = Body(...),
    scores: Optional[dict] = Body(None)
):
    if session_id not in session_history:
        session_history[session_id] = []
    session_history[session_id].append({
        "prompt": prompt,
        "response": response,
        "model": model,
        "scores": scores
    })
    return {"status": "success"}

@app.get("/session_history/{session_id}")
async def get_session_history(session_id: str):
    return {"history": session_history.get(session_id, [])}

@app.post("/reflect")
async def reflect_on_response(
    prompt: str = Body(...),
    response: str = Body(...),
    scores: dict = Body(...),
    model: str = Body(...),
    session_id: str = Body(...),
    iteration: int = Body(...)
):
    """
    Use an LLM to suggest prompt improvements based on the last response and its evaluation scores.
    """
    # Compose a reflection prompt for the LLM
    reflection_prompt = f"""
You are an expert prompt engineer. Given the following:
- Original prompt: {prompt}
- Model response: {response}
- Evaluation scores: {scores}
Suggest a revised prompt that would likely improve the model's next response, focusing on increasing the lowest scoring criteria. Be concise and actionable. Return only the improved prompt.
"""
    # Use Gemini for reflection (or OpenAI if preferred)
    try:
        reflection_response = client.models.generate_content(
            model="gemini-2.5-flash", contents=reflection_prompt
        )
        improved_prompt = reflection_response.text.strip() if reflection_response.text else prompt
    except Exception as e:
        improved_prompt = prompt  # fallback to original if error
    # Optionally store reflection in session history
    session_history.setdefault(session_id, []).append({
        "iteration": iteration,
        "prompt": prompt,
        "response": response,
        "scores": scores,
        "improved_prompt": improved_prompt,
        "reflection": reflection_prompt
    })
    return {"improved_prompt": improved_prompt}

@app.post("/prompt/version")
async def add_prompt_version(
    prompt_id: str = Body(...),
    prompt: str = Body(...),
    reason: str = Body(...),
    improved_from: str = Body(None)
):
    version = {
        "prompt": prompt,
        "reason": reason,
        "improved_from": improved_from,
        "timestamp": datetime.now().isoformat()
    }
    prompt_versions.setdefault(prompt_id, []).append(version)
    return {"status": "success", "version": version}

@app.get("/prompt/history/{prompt_id}")
async def get_prompt_history(prompt_id: str):
    return {"history": prompt_versions.get(prompt_id, [])}

@app.post("/prompt/score")
async def add_prompt_score(
    prompt_id: str = Body(...),
    score: float = Body(...)
):
    scores = prompt_scores.setdefault(prompt_id, [])
    scores.append(score)
    # Keep only the last N scores
    if len(scores) > PROMPT_SCORE_WINDOW:
        scores.pop(0)
    return {"status": "success", "scores": scores}

@app.get("/prompt/quality/{prompt_id}")
async def check_prompt_quality(prompt_id: str):
    scores = prompt_scores.get(prompt_id, [])
    if not scores or len(scores) < PROMPT_SCORE_WINDOW:
        return {"status": "insufficient_data", "scores": scores}
    avg = sum(scores) / len(scores)
    degrade = avg < PROMPT_QUALITY_THRESHOLD
    return {"status": "ok", "average": avg, "degraded": degrade, "threshold": PROMPT_QUALITY_THRESHOLD, "scores": scores}

@app.post("/prompt/evaluate")
async def evaluate_prompt(
    prompt_id: str = Body(...),
    conversation: list = Body(...),  # List of messages: [{sender, content}]
    test_scenarios: list = Body(...),  # List of test scenarios
):
    # Evaluate current conversation
    user_message = '\n'.join([m['content'] for m in conversation if m['sender'] == 'user'])
    conversation_history = [
        {'role': 'user' if m['sender'] == 'user' else 'maya', 'content': m['content']} for m in conversation
    ]
    eval_results = []
    # Evaluate conversation
    conv_eval = await run_evaluation(EvaluationRequest(test_scenarios=[{
        'name': 'Current Conversation',
        'user_message': user_message,
        'expected_themes': [],
        'conversation_history': conversation_history
    }]))
    eval_results.append({'type': 'conversation', 'result': conv_eval['evaluation_results'][0]})
    # Evaluate test scenarios
    if test_scenarios:
        test_eval = await run_evaluation(EvaluationRequest(test_scenarios=test_scenarios))
        for r in test_eval['evaluation_results']:
            eval_results.append({'type': 'test_case', 'result': r})
    # Aggregate scores
    all_scores = [r['result']['scores']['overall'] for r in eval_results if 'scores' in r['result']]
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0
    # Save to prompt score history
    scores = prompt_scores.setdefault(prompt_id, [])
    scores.append(avg_score)
    if len(scores) > PROMPT_SCORE_WINDOW:
        scores.pop(0)
    # Save to prompt version history (as evaluation event)
    prompt_versions.setdefault(prompt_id, []).append({
        'event': 'evaluation',
        'timestamp': datetime.now().isoformat(),
        'avg_score': avg_score,
        'results': eval_results
    })
    # Recommendation logic
    recommendation = ''
    if avg_score < PROMPT_QUALITY_THRESHOLD:
        recommendation = 'Prompt quality is below threshold. Consider improving the prompt.'
    else:
        recommendation = 'Prompt quality is good.'
    return {
        'results': eval_results,
        'average_score': avg_score,
        'recommendation': recommendation
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Maya AI Backend",
        "version": "1.0.0"
    }

@app.post("/feedback")
async def submit_feedback(
    session_id: str = Body(...),
    model: str = Body(...),
    response: str = Body(...),
    feedback: str = Body(...),  # 'like' or 'dislike'
    prompt: str = Body(...),
    mode: str = Body(...),      # 'chat', 'manual', 'scenario', etc.
    scores: Optional[dict] = Body(None),
    timestamp: Optional[str] = Body(None)
):
    entry = {
        "session_id": session_id,
        "model": model,
        "response": response,
        "feedback": feedback,
        "prompt": prompt,
        "mode": mode,
        "scores": scores,
        "timestamp": timestamp or datetime.now().isoformat()
    }
    print("DEBUG: Received feedback entry:", entry)
    feedback_store.append(entry)
    try:
        with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(feedback_store, f, ensure_ascii=False, indent=2)
        print("DEBUG: Successfully wrote to feedback_store.json")
    except Exception as e:
        print("ERROR: Failed to write to feedback_store.json:", e)
    return {"status": "success"}

@app.get("/feedback/aggregate")
async def aggregate_feedback(prompt: str = Query(None), session_id: str = Query(None)):
    # Filter feedback_store by prompt or session_id if provided
    filtered = [f for f in feedback_store if (prompt is None or f['prompt'] == prompt) and (session_id is None or f['session_id'] == session_id)]
    # Group by prompt or session_id
    result = {}
    for entry in filtered:
        key = entry['prompt'] if prompt is not None else entry['session_id'] if session_id is not None else entry['prompt']
        if key not in result:
            result[key] = []
        result[key].append({
            'timestamp': entry.get('timestamp', None),
            'score': entry['scores']['overall'] if entry.get('scores') and 'overall' in entry['scores'] else None,
            'feedback': entry.get('feedback'),
            'model': entry.get('model'),
            'mode': entry.get('mode'),
        })
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)