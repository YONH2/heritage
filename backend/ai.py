import os
import json
import httpx
import re
from . import config

# Lists for fallback parsing
DISTRICTS = ["조치원읍", "연서면", "전의면", "전동면", "금남면", "부강면", "소정면", "장군면", "연기면", "연동면", 
             "한솔동", "도담동", "아름동", "종촌동", "고운동", "보람동", "소담동", "대평동", "새롬동", "다정동", "해밀동", "반곡동", "나성동", "어진동", "세종동"]
ERAS = ["청동기", "삼국", "통일신라", "고려", "조선 전기", "조선 중기", "조선 후기", "조선", "근대", "현대"]

def get_gemini_embedding(text: str) -> list:
    """Generate vector embedding (768 dimensions) using text-embedding-004."""
    if not config.USE_GEMINI:
        return []
    
    url = f"https://generativelang.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={config.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text}]}
    }
    
    try:
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=payload, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()["embedding"]["values"]
            else:
                print(f"Gemini embedding returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Error calling Gemini Embedding: {e}")
        
    return []

def fallback_parse_query(query: str) -> dict:
    """Offline heuristic search parser when Gemini API Key is missing."""
    detected_district = None
    detected_era = None
    
    # 1. Match district
    for d in DISTRICTS:
        if d in query or d[:-1] in query: # Match '조치원' as well as '조치원읍'
            detected_district = d
            break
            
    # 2. Match era
    for e in ERAS:
        if e in query:
            detected_era = e
            break
            
    # 3. Clean keywords (remove standard query helper words)
    cleaned = query
    for word in DISTRICTS + ERAS + ["보여줘", "찾아줘", "알려줘", "검색", "문화유산", "어디", "추천"]:
        cleaned = cleaned.replace(word, "")
    keywords = [k.strip() for k in re.split(r'[\s,]+', cleaned) if len(k.strip()) > 1]
    
    response_text = "필터 조건 및 자연어 매칭을 통해 최적의 문화유산을 검색했습니다. "
    if detected_district:
        response_text += f"지역: '{detected_district}' "
    if detected_era:
        response_text += f"시대: '{detected_era}' "
    if keywords:
        response_text += f"키워드: '{', '.join(keywords)}'"
        
    return {
        "district": detected_district,
        "era": detected_era,
        "keywords": keywords,
        "response_text": response_text.strip()
    }

def parse_natural_language_query(query: str) -> dict:
    """Analyze natural language search and extract filter parameters (district, era, keywords)."""
    if not config.USE_GEMINI:
        return fallback_parse_query(query)
        
    url = f"https://generativelang.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={config.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""
    You are an expert search assistant for Sejong City's Cultural Heritage database.
    Your task is to analyze the user's natural language query and extract search parameters in JSON format.
    
    Available districts: {json.dumps(DISTRICTS)}
    Available eras: {json.dumps(ERAS)}
    
    User query: "{query}"
    
    Return a JSON object with the following fields:
    - district: The exact matched district string from the list above, or null if none is requested.
    - era: The exact matched era string from the list above, or null if none is requested.
    - keywords: A list of 1-3 clean Korean keywords extracted from the user query (e.g. name of the heritage, type like "탑", "사찰", "비석" etc.). Keep them short.
    - response_text: A natural, polite Korean summary of what you are searching for (e.g. "전의면에 있는 조선시대 문화유산들을 찾아드릴게요!").
    
    JSON format output only. Do not wrap in backticks or markdown formats. Just the raw JSON.
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    try:
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=payload, timeout=12.0)
            if resp.status_code == 200:
                raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean markdown code block wraps if LLM ignores instructions
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.MULTILINE).strip()
                return json.loads(raw_text)
            else:
                print(f"Gemini API returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Error calling Gemini parsing: {e}")
        
    return fallback_parse_query(query)

def generate_curation_content(heritages_info: list, theme: str = "magazine") -> str:
    """Generate styled custom story or magazine content based on a list of selected heritages."""
    if not heritages_info:
        return "코스에 추가된 문화유산이 없습니다."
        
    heritage_names = [h["name"] for h in heritages_info]
    
    if not config.USE_GEMINI:
        # Fallback offline article generation
        title_theme = "역사 잡지 세종 특별호" if theme == "magazine" else "세종 문화유산 동화 나라"
        summary = f"이번 답사는 {' -> '.join(heritage_names)} 코스로 세종시의 깊은 역사를 체험할 수 있습니다.\n\n"
        
        for h in heritages_info:
            summary += f"■ {h['name']} ({h['era']} | {h['district']})\n"
            desc_snippet = h['description'][:100] + "..." if len(h['description']) > 100 else h['description']
            summary += f"소재지: {h['location']}\n"
            summary += f"설명: {desc_snippet}\n"
            if h.get('reflection'):
                summary += f"생각해 볼 거리: {h['reflection']}\n"
            summary += "\n"
            
        summary += "AI 가이드의 동반 이야기: 세종특별자치시의 바람을 타고 만나는 역사의 발자취를 소중히 간직하세요."
        return summary
        
    url = f"https://generativelang.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={config.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    
    # Structure heritages list as prompt context
    context = ""
    for i, h in enumerate(heritages_info, 1):
        context += f"장소 {i}: {h['name']} ({h['era']}, {h['district']} 소재)\n"
        context += f"소개: {h['description']}\n"
        if h.get("reflection"):
            context += f"생각할 거리: {h['reflection']}\n"
        context += "\n"
        
    prompt = f"""
    너는 세종시의 친절한 문화유산 AI 도슨트(큐레이터)이다.
    사용자가 직접 선택한 아래 문화유산 답사 코스 정보를 기반으로 여행 큐레이션 콘텐츠를 생성하라.
    
    [답사 대상 문화유산 목록]
    {context}
    
    [출력 스타일 테마]
    {theme} (magazine: 흥미진진한 고품격 역사 문화 잡지 기사 형식 / fairy: 어린이를 위한 따뜻하고 교육적인 구전 동화 이야기 형식)
    
    [작성 가이드라인]
    1. 제목을 독창적으로 지어라.
    2. 문화유산들이 서로 이어지는 흐름(역사적 연결고리 혹은 시간의 흐름)을 자연스럽게 설명하라.
    3. 각 장소마다 제공된 '생각할 거리'를 텍스트에 자연스럽게 녹여내어 독자가 성찰할 수 있도록 하라.
    4. 친근하면서도 감성적인 톤앤매너를 유지하라 (한국어로 작성).
    5. HTML이나 마크다운 태그를 포함하지 말고 줄바꿈(\n)을 활용한 깨끗한 가독성 좋은 텍스트 카드로 작성하라.
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    try:
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=payload, timeout=20.0)
            if resp.status_code == 200:
                return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            else:
                print(f"Gemini Curation API returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Error calling Gemini Curation: {e}")
        
    # Final fallback on HTTP error
    return f"[연결 오류로 오프라인 생성된 리포트]\n\n코스: {' -> '.join(heritage_names)}\n시대와 장소를 넘나드는 멋진 답사 코스입니다. 현장에서 문화유산들의 숨결을 직접 느껴보세요."
