import os
from dotenv import load_dotenv

# Load env variables from root folder
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(root_dir, ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")

# Port and host
PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")

# Flags
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)
USE_GEMINI = bool(GEMINI_API_KEY)

print("--- System Config ---")
print(f"USE_SUPABASE: {USE_SUPABASE}")
print(f"USE_GEMINI: {USE_GEMINI}")
print(f"PORT: {PORT}, HOST: {HOST}")
