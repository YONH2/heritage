import os
import zipfile
import io
from PIL import Image

zip_path = r"c:\Users\user\Desktop\ICT이노베이션과정\헤리티지\Image.zip"
backend_static_dir = r"c:\Users\user\Desktop\ICT이노베이션과정\헤리티지\heritage project\backend\static\images"
frontend_public_dir = r"c:\Users\user\Desktop\ICT이노베이션과정\헤리티지\heritage project\frontend\public\images"

# Ensure directories exist
os.makedirs(backend_static_dir, exist_ok=True)
os.makedirs(frontend_public_dir, exist_ok=True)

print("Starting image optimization pipeline...")
print("Source ZIP:", zip_path)

if not os.path.exists(zip_path):
    print(f"Error: ZIP file not found at {zip_path}!")
    exit(1)

try:
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        # Find all jpg images inside the zip file (H1.jpg to H119.jpg, etc.)
        image_files = [f for f in file_list if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        print(f"Found {len(image_files)} image files in ZIP.")
        
        count = 0
        for img_name in image_files:
            # We want the base filename (e.g. H1.jpg)
            base_name = os.path.basename(img_name)
            if not base_name:
                continue
            
            # Form output filename
            name_without_ext = os.path.splitext(base_name)[0]
            webp_name = f"{name_without_ext}.webp"
            
            backend_dest = os.path.join(backend_static_dir, webp_name)
            frontend_dest = os.path.join(frontend_public_dir, webp_name)
            
            # Optimize image
            try:
                # Read file data from zip
                data = zip_ref.read(img_name)
                img = Image.open(io.BytesIO(data))
                
                # Resize if larger than 1024px in either dimension
                max_size = 1024
                if img.width > max_size or img.height > max_size:
                    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                
                # Convert RGBA to RGB if saving as JPEG, but WebP supports alpha. Let's keep RGB for compatibility if needed.
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3]) # 3 is the alpha channel
                    img = background
                
                # Save as WebP
                img.save(backend_dest, 'WEBP', quality=85)
                img.save(frontend_dest, 'WEBP', quality=85)
                
                count += 1
                if count % 20 == 0 or count == len(image_files):
                    print(f"Processed {count}/{len(image_files)} images...")
            except Exception as img_err:
                print(f"Error processing image {img_name}: {img_err}")
                
    print(f"Successfully processed and optimized {count} images to WebP.")
except Exception as e:
    print(f"Error extracting ZIP: {e}")
