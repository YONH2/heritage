import os
from dotenv import load_dotenv

# Load env variables from root folder
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(root_dir, ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")

# Neo4j Graph Database configuration (e.g. AuraDB on GCP or Google Compute Engine instance)
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "")

# Public Open Data Portal (data.go.kr) API configuration
PUBLIC_DATA_API_KEY = os.environ.get("PUBLIC_DATA_API_KEY", "")
SEJONG_HERITAGE_API_URL = os.environ.get(
    "SEJONG_HERITAGE_API_URL",
    "http://apis.data.go.kr/5690000/sjCulturalHeritage/sjCulturalHeritage"
)
NATIONAL_HERITAGE_API_URL = os.environ.get(
    "NATIONAL_HERITAGE_API_URL",
    "http://apis.data.go.kr/1640000/crltsInfoService"
)
KOREA_TOURISM_API_URL = os.environ.get(
    "KOREA_TOURISM_API_URL",
    "http://apis.data.go.kr/B551011/KorService1"
)

# Port and host
PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")

# Flags
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)
USE_GEMINI = bool(GEMINI_API_KEY)
USE_NEO4J = bool(NEO4J_URI and NEO4J_PASSWORD)
USE_PUBLIC_DATA = bool(PUBLIC_DATA_API_KEY)

print("--- System Config ---")
print(f"USE_SUPABASE: {USE_SUPABASE}")
print(f"USE_GEMINI: {USE_GEMINI}")
print(f"USE_NEO4J: {USE_NEO4J}")
print(f"USE_PUBLIC_DATA: {USE_PUBLIC_DATA}")
print(f"PORT: {PORT}, HOST: {HOST}")


