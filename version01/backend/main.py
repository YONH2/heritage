import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, database, ai

app = FastAPI(title="Sejong City Cultural Heritage AI Curation Service API")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder to serve WebP images
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


# Pydantic models for request bodies
class AIChatRequest(BaseModel):
    query: str

class CandidateSubmit(BaseModel):
    name: str
    photo_url: Optional[str] = ""
    gps_lat: float
    gps_lng: float
    reason: str
    submitted_by: str

class ApproveRequest(BaseModel):
    status: str  # '승인' / '반려' / '담당자 검토중'
    reviewed_by: str

class CourseCreate(BaseModel):
    user_id: str
    title: str
    heritage_ids: List[str]
    transport_mode: str
    estimated_time: str
    theme: Optional[str] = "magazine"

class ReviewCreate(BaseModel):
    heritage_id: str
    user_id: str
    photo_url: Optional[str] = ""
    content: str


# Endpoints
@app.get("/api/heritage")
def get_heritages(district: Optional[str] = None, era: Optional[str] = None, query: Optional[str] = None):
    try:
        return database.get_all_heritages(district=district, era=era, query=query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/heritage/{h_id}")
def get_heritage_detail(h_id: str):
    heritage = database.get_heritage_by_id(h_id)
    if not heritage:
        raise HTTPException(status_code=404, detail="Cultural heritage not found.")
    
    # Attach reviews
    reviews = database.get_reviews(h_id)
    heritage["reviews"] = reviews
    return heritage

@app.post("/api/search/ai")
def ai_search(payload: AIChatRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    try:
        # 1. Parse natural language using Gemini (or fallback rule-based parser)
        parsed = ai.parse_natural_language_query(query)
        
        district = parsed.get("district")
        era = parsed.get("era")
        keywords = parsed.get("keywords")
        response_text = parsed.get("response_text", "검색 결과를 찾았습니다.")
        
        results = []
        
        # 2. If Gemini is available, we perform a vector semantic search
        if config.USE_GEMINI:
            query_vector = ai.get_gemini_embedding(query)
            if query_vector:
                # Local vector similarity on SQLite records
                vector_results = database.get_vector_search(query_vector, limit=8)
                
                # Apply filter post-retrieval or filter candidate list
                for r in vector_results:
                    # Apply parsed filters if extracted
                    if district and r["district"] != district:
                        continue
                    if era and r["era"] != era:
                        continue
                    results.append(r)
                    
        # 3. Fallback/Hybrid Keyword Search (if vector search returned nothing or Gemini is off)
        if not results:
            keyword_search = " ".join(keywords) if keywords else query
            results = database.get_all_heritages(district=district, era=era, query=keyword_search)
            
        # Limit total results
        results = results[:6]
        
        return {
            "response_text": response_text,
            "results": results,
            "filters": {
                "district": district,
                "era": era,
                "keywords": keywords
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    try:
        return database.get_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Citizen Heritage Candidates
@app.post("/api/candidate")
def submit_candidate(payload: CandidateSubmit):
    try:
        candidate_id = database.add_candidate(
            name=payload.name,
            photo_url=payload.photo_url,
            gps_lat=payload.gps_lat,
            gps_lng=payload.gps_lng,
            reason=payload.reason,
            submitted_by=payload.submitted_by
        )
        return {"id": candidate_id, "message": "Successfully submitted candidate heritage."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/candidates")
def list_candidates():
    try:
        return database.get_candidates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/candidate/{id}/recommend")
def recommend_candidate(id: int):
    try:
        database.increment_candidate_recommend(id)
        return {"message": "Recommendation count updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/candidate/{id}/approve")
def approve_candidate_submission(id: int, payload: ApproveRequest):
    try:
        database.approve_candidate(
            candidate_id=id,
            status=payload.status,
            reviewed_by=payload.reviewed_by
        )
        return {"message": f"Candidate status updated to {payload.status}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Custom Course Curation
@app.post("/api/courses")
def create_course(payload: CourseCreate):
    try:
        # Fetch detailed heritages for AI input
        heritages_info = []
        for h_id in payload.heritage_ids:
            h = database.get_heritage_by_id(h_id)
            if h:
                heritages_info.append(h)
                
        # Generate AI travel article/magazine/fairy tale
        ai_content = ai.generate_curation_content(heritages_info, payload.theme)
        
        course_id = database.add_course(
            user_id=payload.user_id,
            title=payload.title,
            heritage_ids=payload.heritage_ids,
            transport_mode=payload.transport_mode,
            estimated_time=payload.estimated_time,
            created_content=ai_content
        )
        
        return {
            "id": course_id,
            "title": payload.title,
            "content": ai_content,
            "message": "Successfully created custom tour course."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses")
def list_courses(user_id: str):
    try:
        courses = database.get_courses(user_id)
        # Hydrate heritage details for frontend rendering
        for course in courses:
            details = []
            for h_id in course["heritage_ids"]:
                h = database.get_heritage_by_id(h_id)
                if h:
                    details.append(h)
            course["heritages"] = details
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Reviews
@app.post("/api/reviews")
def create_review(payload: ReviewCreate):
    try:
        review_id = database.add_review(
            heritage_id=payload.heritage_id,
            user_id=payload.user_id,
            photo_url=payload.photo_url,
            content=payload.content
        )
        return {"id": review_id, "message": "Successfully submitted review."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reviews/{heritage_id}")
def get_heritage_reviews(heritage_id: str):
    try:
        return database.get_reviews(heritage_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health Check Route
@app.get("/health")
def health():
    return {"status": "ok"}
