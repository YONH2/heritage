import os
import re
import json
import random
import sqlite3
import pandas as pd
import httpx
from dotenv import load_dotenv

# Load environment variables from .env in the root project folder
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(root_dir, ".env"))

excel_path = r"c:\Users\user\Desktop\ICT이노베이션과정\헤리티지\세종시 문화유산_DB_20260719.xlsx"
db_dir = os.path.join(root_dir, "backend")
os.makedirs(db_dir, exist_ok=True)
db_path = os.path.join(db_dir, "heritage.db")

print("Excel Path:", excel_path)
print("Local Database Path:", db_path)

# District centroids in Sejong for geocoding fallback
DISTRICT_CENTROIDS = {
    "조치원읍": (36.602, 127.297),
    "연서면": (36.568, 127.279),
    "전의면": (36.680, 127.202),
    "전동면": (36.650, 127.265),
    "금남면": (36.463, 127.283),
    "부강면": (36.483, 127.367),
    "소정면": (36.720, 127.195),
    "장군면": (36.495, 127.207),
    "연기면": (36.533, 127.276),
    "연동면": (36.539, 127.327),
    "한솔동": (36.479, 127.256),
    "도담동": (36.516, 127.262),
    "아름동": (36.512, 127.246),
    "종촌동": (36.505, 127.245),
    "고운동": (36.520, 127.236),
    "보람동": (36.486, 127.295),
    "소담동": (36.485, 127.306),
    "대평동": (36.478, 127.282),
    "새롬동": (36.485, 127.245),
    "다정동": (36.494, 127.244),
    "해밀동": (36.536, 127.266),
    "반곡동": (36.498, 127.311),
    "나성동": (36.488, 127.259),
    "어진동": (36.507, 127.260),
    "세종동": (36.495, 127.280),
}
DEFAULT_CENTROID = (36.480, 127.289) # Sejong City Hall area

def normalize_era(era_val):
    if pd.isna(era_val) or not isinstance(era_val, str):
        return "미상"
    v = era_val.strip().replace(" ", "")
    if "청동기" in v:
        return "청동기"
    elif "삼국" in v:
        return "삼국"
    elif "통일신라" in v:
        return "통일신라"
    elif "고려" in v:
        return "고려"
    elif "조선초기" in v or "조선전기" in v:
        return "조선 전기"
    elif "조선중기" in v:
        return "조선 중기"
    elif "조선후기" in v:
        return "조선 후기"
    elif "조선" in v:
        return "조선"
    elif "근대" in v:
        return "근대"
    elif "현대" in v:
        return "현대"
    elif v == "-" or not v:
        return "미상"
    return v

def extract_district(loc_val):
    if pd.isna(loc_val) or not isinstance(loc_val, str):
        return "기타"
    match = re.search(r'\b\w+(읍|면|동)\b', loc_val)
    if match:
        return match.group(0)
    return "기타"

def geocode_address(address, district, api_key=None):
    if api_key:
        try:
            url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={api_key}"
            resp = httpx.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "OK" and data.get("results"):
                    loc = data["results"][0]["geometry"]["location"]
                    return loc["lat"], loc["lng"]
        except Exception as e:
            print(f"Geocoding API error for {address}: {e}")
            
    # Fallback centroid geocoding
    centroid = DISTRICT_CENTROIDS.get(district, DEFAULT_CENTROID)
    # Add tiny random offsets to prevent overlapping points
    offset_lat = random.uniform(-0.005, 0.005)
    offset_lng = random.uniform(-0.005, 0.005)
    return centroid[0] + offset_lat, centroid[1] + offset_lng

def generate_embedding(text, api_key=None):
    if api_key:
        try:
            url = f"https://generativelang.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]}
            }
            resp = httpx.post(url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                return resp.json()["embedding"]["values"]
        except Exception as e:
            print(f"Gemini embedding API error: {e}")
            
    # Fallback mock embedding (size 768)
    return [random.uniform(-0.1, 0.1) for _ in range(768)]

def setup_sqlite():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. heritage_master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS heritage_master (
        h_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        district TEXT,
        description TEXT,
        era TEXT,
        reflection TEXT,
        gps_lat REAL,
        gps_lng REAL,
        embedding TEXT
    )
    """)
    
    # 2. citizen_heritage_candidate
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS citizen_heritage_candidate (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        photo_url TEXT,
        gps_lat REAL,
        gps_lng REAL,
        reason TEXT,
        submitted_by TEXT,
        recommend_count INTEGER DEFAULT 0,
        status TEXT DEFAULT '신청중',
        reviewed_by TEXT,
        reviewed_at TEXT
    )
    """)
    
    # 3. user_course
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_course (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        title TEXT NOT NULL,
        heritage_ids TEXT,
        transport_mode TEXT,
        estimated_time TEXT,
        created_content TEXT
    )
    """)
    
    # 4. user_review
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_review (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        heritage_id TEXT,
        user_id TEXT,
        photo_url TEXT,
        content TEXT,
        created_at TEXT
    )
    """)
    
    # 5. user_recommendation_log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_recommendation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        candidate_id INTEGER,
        status_snapshot TEXT,
        created_at TEXT
    )
    """)
    
    conn.commit()
    conn.close()
    print("Local SQLite schemas initialized successfully.")

def main():
    setup_sqlite()
    
    if not os.path.exists(excel_path):
        print("Excel file not found!")
        return

    df = pd.read_excel(excel_path)
    print(f"Loaded Excel. Count of rows: {len(df)}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    google_maps_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    
    # Clear existing data in heritage_master to avoid conflicts
    cursor.execute("DELETE FROM heritage_master")
    
    count = 0
    for idx, row in df.iterrows():
        h_id = str(row['H_ID']).strip()
        name = str(row['명칭']).strip()
        location = str(row['소재지']).strip() if not pd.isna(row['소재지']) else ""
        description = str(row['소개']).strip() if not pd.isna(row['소개']) else ""
        era = str(row['시대']).strip() if not pd.isna(row['시대']) else ""
        reflection = str(row['생각할 거리']).strip() if not pd.isna(row['생각할 거리']) else ""
        
        # 1. Normalize Era
        norm_era = normalize_era(era)
        
        # 2. Extract District
        district = extract_district(location)
        
        # 3. Geocode
        lat, lng = geocode_address(location, district, google_maps_key)
        
        # 4. Embedding
        embedding_vector = generate_embedding(description, gemini_key)
        embedding_str = json.dumps(embedding_vector)
        
        # Insert
        cursor.execute("""
        INSERT INTO heritage_master (h_id, name, location, district, description, era, reflection, gps_lat, gps_lng, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (h_id, name, location, district, description, norm_era, reflection, lat, lng, embedding_str))
        
        count += 1
        if count % 20 == 0 or count == len(df):
            print(f"Seeded {count}/{len(df)} records in local DB...")
            
    conn.commit()
    
    # Double check count
    cursor.execute("SELECT COUNT(*) FROM heritage_master")
    db_count = cursor.fetchone()[0]
    conn.close()
    
    print(f"Database seeding completed. Seeded count: {db_count}")
    
    # Check if Supabase keys exist to attempt hosted seeding
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if supabase_url and supabase_key:
        print("Supabase credentials detected. Attempting to seed Supabase...")
        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            # Fetch data from local SQLite to push to Supabase
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM heritage_master").fetchall()
            conn.close()
            
            data_to_insert = []
            for r in rows:
                data_to_insert.append({
                    "h_id": r["h_id"],
                    "name": r["name"],
                    "location": r["location"],
                    "district": r["district"],
                    "description": r["description"],
                    "era": r["era"],
                    "reflection": r["reflection"],
                    "gps_lat": r["gps_lat"],
                    "gps_lng": r["gps_lng"],
                    "embedding": json.loads(r["embedding"]) # supabase pgvector supports list of floats directly
                })
                
            # Upsert into supabase table
            # Note: The table 'heritage_master' must exist in Supabase.
            # Below is a quick trigger. You should create tables in Supabase first using SQL editor.
            res = supabase.table("heritage_master").upsert(data_to_insert).execute()
            print("Successfully seeded Supabase heritage_master table!")
        except Exception as se:
            print("Supabase seeding failed (You may need to create the table structure in the Supabase dashboard first):", se)

if __name__ == "__main__":
    main()
