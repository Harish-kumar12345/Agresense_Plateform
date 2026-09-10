import urllib.request
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'datasets')
os.makedirs(DATASETS_DIR, exist_ok=True)

urls = [
    (
        "crop_recommendation.csv",
        "https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/crop_recommendation.csv"
    ),
    (
        "crop_production_india.csv",
        "https://raw.githubusercontent.com/Premkumar282/india-crop-production-analysis-ml-python/main/India%20Agriculture%20Crop%20Production.csv"
    ),
    (
        "fertilizer_data.csv",
        "https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/fertilizer.csv"
    )
]

print(f"Downloading core datasets to: {DATASETS_DIR}")
headers = {'User-Agent': 'Mozilla/5.0'}

for filename, url in urls:
    dest = os.path.join(DATASETS_DIR, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"[EXISTS] {filename} ({os.path.getsize(dest)} bytes)", flush=True)
        continue
    print(f"[DOWNLOADING] {filename} from {url}...", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp, open(dest, 'wb') as out:
            while True:
                chunk = resp.read(1024 * 64)
                if not chunk:
                    break
                out.write(chunk)
        print(f"[DONE] {filename} ({os.path.getsize(dest)} bytes)", flush=True)
    except Exception as e:
        print(f"[FAIL] {filename}: {e}", flush=True)

print("Dataset download check completed.")
