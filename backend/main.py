import os
import asyncio
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Request
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
- Focus on progress over perfection"""

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")

# Load embedding model once at startup
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

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
                    model="gpt-4o-mini",
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
            consistency_themes = maya_themes + ["character consistency", "personal anecdotes", "conversational tone"]
            # Engagement: Questions, follow-ups, personal touch
            engagement_themes = ["engagement", "follow-up questions", "personal experience", "ask questions", "keep conversation going"] + maya_themes
            # Brand Alignment: Sustainability, eco, brand voice
            brand_alignment_themes = sustainable_themes + ["brand alignment", "values", "brand voice", "on-brand", "mission"]
            # Authenticity: Honesty, humility, natural, relatable
            authenticity_themes = ["authenticity", "honest", "humble", "relatable", "natural language", "genuine"] + maya_themes
            # Add prompt context to each theme set
            for theme_set in [consistency_themes, engagement_themes, brand_alignment_themes, authenticity_themes]:
                theme_set.append(prompt_text)

            # Compute semantic similarity for each metric
            def semantic_score(response, themes):
                ref = ' '.join(themes)
                emb1 = embedding_model.encode(response, convert_to_tensor=True)
                emb2 = embedding_model.encode(ref, convert_to_tensor=True)
                return float(util.cos_sim(emb1, emb2).item())

            semantic_consistency = semantic_score(response_text, consistency_themes)
            semantic_engagement = semantic_score(response_text, engagement_themes)
            semantic_brand_alignment = semantic_score(response_text, brand_alignment_themes)
            semantic_authenticity = semantic_score(response_text, authenticity_themes)
            # Cumulative semantic score (mean of all 4)
            cumulative_semantic = float(np.mean([
                semantic_consistency,
                semantic_engagement,
                semantic_brand_alignment,
                semantic_authenticity
            ]))

            # Existing rule-based scores
            consistency_score = evaluate_consistency(response_text, scenario.get('expected_themes', []))
            engagement_score = evaluate_engagement(response_text)
            brand_alignment_score = evaluate_brand_alignment(response_text)
            authenticity_score = evaluate_authenticity(response_text)
            # Combined scores for each metric
            combined_consistency = (consistency_score + semantic_consistency * 100) / 2
            combined_engagement = (engagement_score + semantic_engagement * 100) / 2
            combined_brand_alignment = (brand_alignment_score + semantic_brand_alignment * 100) / 2
            combined_authenticity = (authenticity_score + semantic_authenticity * 100) / 2
            # Cumulative scores
            cumulative_semantic = float(np.mean([
                semantic_consistency,
                semantic_engagement,
                semantic_brand_alignment,
                semantic_authenticity
            ]))
            cumulative_combined = float(np.mean([
                combined_consistency,
                combined_engagement,
                combined_brand_alignment,
                combined_authenticity
            ]))
            # Overall score: average of cumulative_combined and cumulative_semantic (scaled to 0-100)
            overall_score = (cumulative_combined + (cumulative_semantic * 100)) / 2
            results.append({
                "scenario": scenario['name'],
                "user_message": scenario['user_message'],
                "maya_response": response_text,
                "scores": {
                    "consistency": consistency_score,
                    "semantic_consistency": semantic_consistency,
                    "combined_consistency": combined_consistency,
                    "engagement": engagement_score,
                    "semantic_engagement": semantic_engagement,
                    "combined_engagement": combined_engagement,
                    "brand_alignment": brand_alignment_score,
                    "semantic_brand_alignment": semantic_brand_alignment,
                    "combined_brand_alignment": combined_brand_alignment,
                    "authenticity": authenticity_score,
                    "semantic_authenticity": semantic_authenticity,
                    "combined_authenticity": combined_authenticity,
                    "cumulative_semantic": cumulative_semantic,
                    "cumulative_combined": cumulative_combined,
                    "overall": overall_score
                },
                "timestamp": datetime.now().isoformat()
            })
        return {"evaluation_results": results, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

def evaluate_consistency(response: str, expected_themes: List[str]) -> float:
    """Evaluate if response maintains character consistency"""
    score = 70.0  # Base score
    
    # Check for Maya's characteristic phrases
    maya_phrases = ["I've been", "Let's", "What I've learned", "journey", "experiment"]
    for phrase in maya_phrases:
        if phrase.lower() in response.lower():
            score += 5
    
    # Check for expected themes
    for theme in expected_themes:
        if theme.lower() in response.lower():
            score += 3
    
    return min(score, 100.0)

def evaluate_engagement(response: str) -> float:
    """Evaluate how engaging the response is"""
    score = 60.0  # Base score
    
    # Check for questions (engagement indicators)
    question_count = response.count('?')
    score += min(question_count * 10, 30)
    
    # Check for personal touches
    personal_indicators = ["I", "my", "me", "personally"]
    for indicator in personal_indicators:
        if indicator.lower() in response.lower():
            score += 2
    
    # Check length (not too short, not too long)
    word_count = len(response.split())
    if 20 <= word_count <= 100:
        score += 10
    
    return min(score, 100.0)

def evaluate_brand_alignment(response: str) -> float:
    """Evaluate alignment with sustainable living brand"""
    score = 70.0  # Base score
    
    # Brand-relevant keywords
    brand_keywords = ["sustainable", "eco", "plant-based", "mindful", "yoga", "environment", "conscious"]
    for keyword in brand_keywords:
        if keyword.lower() in response.lower():
            score += 5
    
    return min(score, 100.0)

def evaluate_authenticity(response: str) -> float:
    """Evaluate how authentic and human-like the response sounds"""
    score = 75.0  # Base score
    
    # Check for natural language patterns
    if "!" in response:
        score += 5
    if any(emoji in response for emoji in ["😊", "🌱", "💚", "✨", "🧘", "🌿"]):
        score += 10
    
    # Check for conversational tone
    conversational_words = ["really", "totally", "honestly", "actually", "definitely"]
    for word in conversational_words:
        if word.lower() in response.lower():
            score += 3
    
    return min(score, 100.0)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Maya AI Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)