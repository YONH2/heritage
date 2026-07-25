import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
gas_dir = os.path.join(root_dir, "gas")

index_path = os.path.join(gas_dir, "index.html")
style_path = os.path.join(gas_dir, "style.html")
script_path = os.path.join(gas_dir, "script.html")
test_path = os.path.join(gas_dir, "local_test.html")

print("Merging index, style, and script files into local_test.html...")

try:
    with open(index_path, "r", encoding="utf-8") as f:
        index_content = f.read()

    with open(style_path, "r", encoding="utf-8") as f:
        style_content = f.read()

    with open(script_path, "r", encoding="utf-8") as f:
        script_content = f.read()

    # Perform merges
    merged = index_content.replace("<?!= include('style'); ?>", style_content)
    merged = merged.replace("<?!= include('script'); ?>", script_content)

    with open(test_path, "w", encoding="utf-8") as f:
        f.write(merged)

    print("GAS local_test.html successfully compiled.")
except Exception as e:
    print("Compilation error:", e)
