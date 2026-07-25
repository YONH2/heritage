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

# Port and host
PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")

# Flags
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)
USE_GEMINI = bool(GEMINI_API_KEY)
USE_NEO4J = bool(NEO4J_URI and NEO4J_PASSWORD)

print("--- System Config ---")
print(f"USE_SUPABASE: {USE_SUPABASE}")
print(f"USE_GEMINI: {USE_GEMINI}")
print(f"USE_NEO4J: {USE_NEO4J}")
print(f"PORT: {PORT}, HOST: {HOST}")

