import os
import re
import subprocess
import glob
import sys

# Reconfigure stdout to prevent encoding issues with special characters (e.g. ✓) on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def build_gas_frontend():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(root_dir, "frontend")
    gas_dir = os.path.join(root_dir, "gas")

    print(f"Root directory: {root_dir}")
    print(f"Frontend directory: {frontend_dir}")
    print(f"Target GAS directory: {gas_dir}")

    # Ensure gas directory exists
    os.makedirs(gas_dir, exist_ok=True)

    # 1. Run npm build in frontend directory
    print("Running 'npm run build' in the frontend folder...")
    
    # We use shell=True because we are on Windows and npm is a cmd wrapper
    try:
        result = subprocess.run(
            [r"C:\Users\user\miniconda3\npm.cmd", "run", "build"], 
            cwd=frontend_dir, 
            shell=True, 
            capture_output=True, 
            text=True, 
            encoding="utf-8",
            errors="ignore"
        )
        if result.returncode != 0:
            print("Vite build failed! Attempting npm install first...")
            # If build failed (perhaps node_modules missing), run npm install
            install_result = subprocess.run(
                [r"C:\Users\user\miniconda3\npm.cmd", "install"], 
                cwd=frontend_dir, 
                shell=True, 
                capture_output=True, 
                text=True, 
                encoding="utf-8",
                errors="ignore"
            )
            if install_result.returncode != 0:
                print("npm install failed!")
                print(install_result.stderr)
                return False
            
            # Try building again
            result = subprocess.run(
                [r"C:\Users\user\miniconda3\npm.cmd", "run", "build"], 
                cwd=frontend_dir, 
                shell=True, 
                capture_output=True, 
                text=True, 
                encoding="utf-8",
                errors="ignore"
            )
            if result.returncode != 0:
                print("Vite build failed again!")
                print(result.stderr)
                return False
        
        print("Vite build completed successfully.")
        print(result.stdout)
    except Exception as e:
        print(f"Error executing npm build: {e}")
        return False

    # 2. Locate built assets in frontend/dist/assets
    dist_dir = os.path.join(frontend_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")

    if not os.path.exists(assets_dir):
        print(f"Error: assets directory not found at {assets_dir}")
        return False

    js_files = glob.glob(os.path.join(assets_dir, "*.js"))
    css_files = glob.glob(os.path.join(assets_dir, "*.css"))

    if not js_files:
        print("Error: No bundled Javascript file found!")
        return False
    if not css_files:
        print("Error: No bundled CSS file found!")
        return False

    # Take the main/first matching files
    js_path = js_files[0]
    css_path = css_files[0]

    print(f"Found bundled JS: {os.path.basename(js_path)}")
    print(f"Found bundled CSS: {os.path.basename(css_path)}")

    # 3. Read JS content and generate gas/script.html
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            js_content = f.read()
        
        script_html_path = os.path.join(gas_dir, "script.html")
        with open(script_html_path, "w", encoding="utf-8") as f:
            f.write("<script>\n")
            f.write(js_content)
            f.write("\n</script>\n")
        print(f"Successfully generated: {script_html_path}")
    except Exception as e:
        print(f"Error generating script.html: {e}")
        return False

    # 4. Read CSS content and generate gas/style.html
    try:
        with open(css_path, "r", encoding="utf-8") as f:
            css_content = f.read()
        
        style_html_path = os.path.join(gas_dir, "style.html")
        with open(style_html_path, "w", encoding="utf-8") as f:
            f.write("<style>\n")
            f.write(css_content)
            f.write("\n</style>\n")
        print(f"Successfully generated: {style_html_path}")
    except Exception as e:
        print(f"Error generating style.html: {e}")
        return False

    # 5. Read frontend/dist/index.html and generate gas/index.html
    try:
        dist_index_path = os.path.join(dist_dir, "index.html")
        with open(dist_index_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # Replace JS script tag with GAS template include
        # Regex matches <script type="module" crossorigin src="/assets/index-*.js"></script>
        html_content = re.sub(
            r'<script\s+[^>]*src=["\'][^"\']*?\.js["\'][^>]*>\s*</script>',
            "<?!= include('script'); ?>",
            html_content
        )

        # Replace CSS link tag with GAS template include
        # Regex matches <link rel="stylesheet" crossorigin href="/assets/index-*.css">
        html_content = re.sub(
            r'<link\s+[^>]*href=["\'][^"\']*?\.css["\'][^>]*>',
            "<?!= include('style'); ?>",
            html_content
        )

        gas_index_path = os.path.join(gas_dir, "index.html")
        with open(gas_index_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Successfully generated: {gas_index_path}")
    except Exception as e:
        print(f"Error generating index.html: {e}")
        return False

    print("\nGAS Frontend build complete! All files generated in the 'gas' directory.")
    return True

if __name__ == "__main__":
    success = build_gas_frontend()
    if not success:
        exit(1)
