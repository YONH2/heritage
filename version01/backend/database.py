import os
import json
import sqlite3
from datetime import datetime
from . import config

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "heritage.db")

def get_db_connection():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# Helper to calculate cosine similarity between two lists of floats
def cosine_similarity(v1, v2):
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    sum_a2 = sum(a * a for a in v1)
    sum_b2 = sum(b * b for b in v2)
    if sum_a2 == 0 or sum_b2 == 0:
        return 0.0
    return dot_product / ((sum_a2 ** 0.5) * (sum_b2 ** 0.5))

def get_all_heritages(district=None, era=None, query=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "SELECT h_id, name, location, district, description, era, reflection, gps_lat, gps_lng FROM heritage_master WHERE 1=1"
    params = []
    
    if district:
        sql += " AND district = ?"
        params.append(district)
    if era:
        sql += " AND era = ?"
        params.append(era)
    if query:
        sql += " AND (name LIKE ? OR description LIKE ?)"
        params.append(f"%{query}%")
        params.append(f"%{query}%")
        
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_heritage_by_id(h_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT h_id, name, location, district, description, era, reflection, gps_lat, gps_lng FROM heritage_master WHERE h_id = ?", (h_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_statistics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Total counts
    cursor.execute("SELECT COUNT(*) FROM heritage_master")
    total_count = cursor.fetchone()[0]
    
    # 2. District distributions
    cursor.execute("SELECT district, COUNT(*) as count FROM heritage_master GROUP BY district ORDER BY count DESC")
    district_rows = cursor.fetchall()
    
    # 3. Era distributions
    cursor.execute("SELECT era, COUNT(*) as count FROM heritage_master GROUP BY era ORDER BY count DESC")
    era_rows = cursor.fetchall()
    
    conn.close()
    
    return {
        "total_count": total_count,
        "district_stats": [{"district": r["district"], "count": r["count"]} for r in district_rows],
        "era_stats": [{"era": r["era"], "count": r["count"]} for r in era_rows]
    }

def add_candidate(name, photo_url, gps_lat, gps_lng, reason, submitted_by):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO citizen_heritage_candidate (name, photo_url, gps_lat, gps_lng, reason, submitted_by, recommend_count, status)
    VALUES (?, ?, ?, ?, ?, ?, 0, '신청중')
    """, (name, photo_url, gps_lat, gps_lng, reason, submitted_by))
    candidate_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return candidate_id

def get_candidates():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, photo_url, gps_lat, gps_lng, reason, submitted_by, recommend_count, status, reviewed_by, reviewed_at FROM citizen_heritage_candidate ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def increment_candidate_recommend(candidate_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE citizen_heritage_candidate SET recommend_count = recommend_count + 1 WHERE id = ?", (candidate_id,))
    conn.commit()
    conn.close()
    return True

def approve_candidate(candidate_id, status, reviewed_by):
    conn = get_db_connection()
    cursor = conn.cursor()
    reviewed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    UPDATE citizen_heritage_candidate 
    SET status = ?, reviewed_by = ?, reviewed_at = ?
    WHERE id = ?
    """, (status, reviewed_by, reviewed_at, candidate_id))
    conn.commit()
    conn.close()
    return True

def add_course(user_id, title, heritage_ids, transport_mode, estimated_time, created_content):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO user_course (user_id, title, heritage_ids, transport_mode, estimated_time, created_content)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, title, json.dumps(heritage_ids), transport_mode, estimated_time, created_content))
    course_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return course_id

def get_courses(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, title, heritage_ids, transport_mode, estimated_time, created_content FROM user_course WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    courses = []
    for r in rows:
        d = dict(r)
        d["heritage_ids"] = json.loads(d["heritage_ids"])
        courses.append(d)
    return courses

def add_review(heritage_id, user_id, photo_url, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO user_review (heritage_id, user_id, photo_url, content, created_at)
    VALUES (?, ?, ?, ?, ?)
    """, (heritage_id, user_id, photo_url, content, created_at))
    review_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return review_id

def get_reviews(heritage_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, heritage_id, user_id, photo_url, content, created_at FROM user_review WHERE heritage_id = ? ORDER BY id DESC", (heritage_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_vector_search(query_vector, limit=5):
    # Perform vector similarity calculation locally on SQLite records
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT h_id, name, location, district, description, era, reflection, gps_lat, gps_lng, embedding FROM heritage_master")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        h_data = dict(r)
        emb_str = h_data.pop("embedding")
        if emb_str:
            try:
                emb = json.loads(emb_str)
                score = cosine_similarity(query_vector, emb)
                h_data["similarity"] = score
                results.append(h_data)
            except Exception:
                continue
                
    # Sort by similarity descending
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:limit]
