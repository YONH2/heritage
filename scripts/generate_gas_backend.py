import os
import json
import sqlite3

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(root_dir, "backend", "heritage.db")
gas_code_path = os.path.join(root_dir, "gas", "Code.gs")

print("Reading database from:", db_path)
print("Target GAS Code.gs path:", gas_code_path)

# Ensure gas directory exists
os.makedirs(os.path.dirname(gas_code_path), exist_ok=True)

if not os.path.exists(db_path):
    print("Error: Database not found!")
    exit(1)

# Fetch heritages from SQLite
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT h_id, name, location, district, description, era, reflection, gps_lat, gps_lng FROM heritage_master")
rows = cursor.fetchall()
conn.close()

heritages_list = []
for r in rows:
    heritages_list.append({
        "h_id": r["h_id"],
        "name": r["name"],
        "location": r["location"],
        "district": r["district"],
        "description": r["description"],
        "era": r["era"],
        "reflection": r["reflection"],
        "gps_lat": r["gps_lat"],
        "gps_lng": r["gps_lng"]
    })

print(f"Loaded {len(heritages_list)} heritages for GAS compiler.")

# Generate Apps Script code
gas_code = f"""// Sejong City Cultural Heritage AI Curation Service - GAS Backend Code.gs
// Automatically compiled database size: {len(heritages_list)} heritages.

const HERITAGE_MASTER = {json.dumps(heritages_list, ensure_ascii=False, indent=2)};

// Standard Apps Script HTTP GET Entry point
function doGet(e) {{
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
      .setTitle('세종특별자치시 문화유산 AI 큐레이션')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}}

// Helper to include HTML subfiles (CSS/JS modules)
function include(filename) {{
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}}

// --- Database Storage Helpers using Script Properties ---
function getStoredData(key) {{
  try {{
    const prop = PropertiesService.getScriptProperties().getProperty(key);
    return prop ? JSON.parse(prop) : [];
  }} catch (e) {{
    console.error("Error reading property: " + key, e);
    return [];
  }}
}}

function saveStoredData(key, data) {{
  try {{
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(data));
  }} catch (e) {{
    console.error("Error saving property: " + key, e);
  }}
}}

// --- Master Heritages Operations ---
function getHeritageList(district, era, query) {{
  let list = HERITAGE_MASTER;
  if (district) {{
    list = list.filter(h => h.district === district);
  }}
  if (era) {{
    list = list.filter(h => h.era === era);
  }}
  if (query) {{
    const q = query.toLowerCase();
    list = list.filter(h => h.name.toLowerCase().includes(q) || h.description.toLowerCase().includes(q));
  }}
  return list;
}}

function getHeritageDetail(hId) {{
  const h = HERITAGE_MASTER.find(item => item.h_id === hId);
  if (!h) return null;
  
  // Clone and attach reviews
  const detailed = Object.assign({{}}, h);
  detailed.reviews = getReviews(hId);
  return detailed;
}}

function getStats() {{
  const total = HERITAGE_MASTER.length;
  
  // Group by district
  const districtsMap = {{}};
  // Group by era
  const erasMap = {{}};
  
  HERITAGE_MASTER.forEach(h => {{
    districtsMap[h.district] = (districtsMap[h.district] || 0) + 1;
    erasMap[h.era] = (erasMap[h.era] || 0) + 1;
  }});
  
  const districtStats = Object.keys(districtsMap).map(k => ({{ district: k, count: districtsMap[k] }})).sort((a,b) => b.count - a.count);
  const eraStats = Object.keys(erasMap).map(k => ({{ era: k, count: erasMap[k] }})).sort((a,b) => b.count - a.count);
  
  return {{
    total_count: total,
    district_stats: districtStats,
    era_stats: eraStats
  }};
}}

// --- AI Orchestration using Google UrlFetchApp & Gemini API ---
function getGeminiApiKey() {{
  // Retrieve key from Apps Script environment property first
  return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
}}

function callGeminiAPI(prompt) {{
  const key = getGeminiApiKey();
  if (!key) {{
    throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  }}
  
  const url = "https://generativelang.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key;
  const payload = {{
    contents: [{{ parts: [{{ text: prompt }}] }}]
  }};
  const options = {{
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  }};
  
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code === 200) {{
    const json = JSON.parse(response.getContentText());
    return json.candidates[0].content.parts[0].text.trim();
  }} else {{
    throw new Error("Gemini API Error (" + code + "): " + response.getContentText());
  }}
}}

// Fallback search parsing offline
function fallbackParseQuery(query) {{
  const districts = ["조치원읍", "연서면", "전의면", "전동면", "금남면", "부강면", "소정면", "장군면", "연기면", "연동면", "한솔동", "도담동", "아름동", "종촌동", "고운동", "보람동", "소담동", "대평동", "새롬동", "다정동", "해밀동", "반곡동", "나성동", "어진동", "세종동"];
  const eras = ["청동기", "삼국", "통일신라", "고려", "조선 전기", "조선 중기", "조선 후기", "조선", "근대", "현대"];
  
  let detectedDistrict = null;
  let detectedEra = null;
  
  for (let i = 0; i < districts.length; i++) {{
    if (query.indexOf(districts[i]) !== -1 || query.indexOf(districts[i].slice(0, -1)) !== -1) {{
      detectedDistrict = districts[i];
      break;
    }}
  }}
  
  for (let i = 0; i < eras.length; i++) {{
    if (query.indexOf(eras[i]) !== -1) {{
      detectedEra = eras[i];
      break;
    }}
  }}
  
  let cleaned = query;
  const stopwords = districts.concat(eras).concat(["보여줘", "찾아줘", "알려줘", "검색", "문화유산", "어디", "추천"]);
  stopwords.forEach(word => {{
    cleaned = cleaned.replace(word, "");
  }});
  
  const keywords = cleaned.split(/[\s,]+/).filter(k => k.trim().length > 1);
  
  let responseText = "자연어 분석 필터를 적용해 검색했습니다. ";
  if (detectedDistrict) responseText += "지역: '" + detectedDistrict + "' ";
  if (detectedEra) responseText += "시대: '" + detectedEra + "' ";
  if (keywords.length > 0) responseText += "키워드: '" + keywords.join(", ") + "'";
  
  return {{
    district: detectedDistrict,
    era: detectedEra,
    keywords: keywords,
    response_text: responseText
  }};
}}

function aiSearch(query) {{
  try {{
    const key = getGeminiApiKey();
    if (!key) throw new Error("Offline Mode");
    
    const prompt = `
    You are an expert search assistant for Sejong City's Cultural Heritage database.
    Analyze the user query: "${{query}}"
    
    Extract search parameters in JSON:
    - district: Matched Sejong district string or null.
    - era: Matched era string or null.
    - keywords: Array of 1-3 clean Korean keywords.
    - response_text: Natural polite Korean summary.
    
    JSON format output only. No code block wraps.
    `;
    
    const responseText = callGeminiAPI(prompt);
    // Parse json safely
    let parsed = JSON.parse(responseText.replace(/```json|```/g, "").trim());
    
    // Execute filter search
    let results = getHeritageList(parsed.district, parsed.era, parsed.keywords ? parsed.keywords.join(" ") : "");
    return {{
      response_text: parsed.response_text,
      results: results.slice(0, 6)
    }};
  }} catch(e) {{
    // Fallback to offline search
    const parsed = fallbackParseQuery(query);
    let results = getHeritageList(parsed.district, parsed.era, parsed.keywords ? parsed.keywords.join(" ") : "");
    return {{
      response_text: parsed.response_text,
      results: results.slice(0, 6)
    }};
  }}
}}

// AI Curation content storyteller
function generateCuration(heritageIds, theme) {{
  const selected = heritageIds
    .map(id => HERITAGE_MASTER.find(h => h.h_id === id))
    .filter(Boolean);
    
  if (selected.length === 0) return "코스에 유산이 지정되지 않았습니다.";
  
  const names = selected.map(h => h.name).join(" -> ");
  
  try {{
    const key = getGeminiApiKey();
    if (!key) throw new Error("Offline Mode");
    
    let context = "";
    selected.forEach((h, idx) => {{
      context += `장소 ${{idx+1}}: ${{h.name}} (${{h.era}}, ${{h.district}})\n설명: ${{h.description}}\n성찰질문: ${{h.reflection}}\n\n`;
    }});
    
    const prompt = `
    세종시 문화유산 AI 큐레이터로서 다음 답사 경로에 대한 여행 스토리 가이드를 작성하세요.
    
    [경로]
    ${{context}}
    
    [스타일 테마]
    ${{theme}} (magazine: 격조 높은 문화 잡지 기사 형식 / fairy: 어린이를 위한 구전 전래 동화 이야기 형식)
    
    독자의 성찰 질문을 자연스럽게 녹여 줄바꿈(\\n)으로 보기 편하게 한국어 텍스트로만 작성해 주세요. 마크다운이나 HTML 태그는 작성하지 마세요.
    `;
    
    return callGeminiAPI(prompt);
  }} catch(e) {{
    // Offline Curation content fallback
    let summary = `[오프라인 자동 생성 답사 리포트]
    
    코스 경로: ${{names}}
    소요시간 동안 세종의 역사를 깊이 체험할 수 있는 알찬 일정입니다.
    
    `;
    selected.forEach(h => {{
      summary += `■ ${{h.name}} (${{h.era}} | ${{h.district}})\n`;
      summary += `주소: ${{h.location}}\n`;
      summary += `설명: ${{h.description.slice(0, 80)}}...\n`;
      if (h.reflection) summary += `성찰: ${{h.reflection}}\n`;
      summary += `\n`;
    }});
    summary += "현장에서 역사 속 조상들의 발자취와 의미를 성찰해 보세요.";
    return summary;
  }}
}}

// --- Custom Course Curation Storage ---
function saveCourse(user_id, title, heritage_ids, transport_mode, estimated_time, theme) {{
  const courses = getStoredData("user_courses");
  
  // Call AI Curation content generator
  const content = generateCuration(heritage_ids, theme);
  
  const newCourse = {{
    id: "C" + Date.now() + Math.floor(Math.random() * 1000),
    user_id: user_id,
    title: title,
    heritage_ids: heritage_ids,
    transport_mode: transport_mode,
    estimated_time: estimated_time,
    created_content: content
  }};
  
  courses.unshift(newCourse);
  saveStoredData("user_courses", courses);
  return newCourse;
}}

function getCourses(userId) {{
  const courses = getStoredData("user_courses");
  const userCourses = courses.filter(c => c.user_id === userId);
  
  // Hydrate heritage details
  userCourses.forEach(c => {{
    c.heritages = c.heritage_ids
      .map(id => HERITAGE_MASTER.find(h => h.h_id === id))
      .filter(Boolean);
  }});
  
  return userCourses;
}}

// --- Citizen Candidate Proposals ---
function getCandidates() {{
  return getStoredData("candidates");
}}

function submitCandidate(name, photo_url, gps_lat, gps_lng, reason, submitted_by) {{
  const list = getStoredData("candidates");
  const newCand = {{
    id: "CAN" + Date.now() + Math.floor(Math.random() * 1000),
    name: name,
    photo_url: photo_url,
    gps_lat: parseFloat(gps_lat),
    gps_lng: parseFloat(gps_lng),
    reason: reason,
    submitted_by: submitted_by,
    recommend_count: 0,
    status: "신청중",
    reviewed_by: "",
    reviewed_at: ""
  }};
  
  list.unshift(newCand);
  saveStoredData("candidates", list);
  return newCand;
}}

function recommendCandidate(id) {{
  const list = getStoredData("candidates");
  const cand = list.find(item => item.id === id);
  if (cand) {{
    cand.recommend_count += 1;
    saveStoredData("candidates", list);
    return true;
  }}
  return false;
}}

function approveCandidate(id, status, reviewed_by) {{
  const list = getStoredData("candidates");
  const cand = list.find(item => item.id === id);
  if (cand) {{
    cand.status = status;
    cand.reviewed_by = reviewed_by;
    cand.reviewed_at = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
    saveStoredData("candidates", list);
    return true;
  }}
  return false;
}}

// --- Citizen Reviews ---
function getReviews(hId) {{
  const allReviews = getStoredData("reviews");
  return allReviews.filter(r => r.heritage_id === hId);
}}

function addReview(heritage_id, user_id, content) {{
  const allReviews = getStoredData("reviews");
  const newReview = {{
    id: "R" + Date.now() + Math.floor(Math.random() * 1000),
    heritage_id: heritage_id,
    user_id: user_id,
    content: content,
    created_at: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
  }};
  
  allReviews.unshift(newReview);
  saveStoredData("reviews", allReviews);
  return newReview;
}}
"""

with open(gas_code_path, "w", encoding="utf-8") as f:
    f.write(gas_code)

print("GAS Backend Code.gs successfully updated.")
conn.close()
