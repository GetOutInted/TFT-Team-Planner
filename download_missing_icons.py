import os
import requests

# Konfiguration
TRAIT_DIR = "static/img/traits"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# Mapping von URL zu gewünschtem lokalem Dateinamen
missing_icons = {
    "https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_16_slayer.png": "slayer.png"
}

def download_missing():
    if not os.path.exists(TRAIT_DIR):
        os.makedirs(TRAIT_DIR)

    print("Lade spezifische fehlende Icons herunter...")

    for url, local_name in missing_icons.items():
        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            if r.status_code == 200:
                file_path = os.path.join(TRAIT_DIR, local_name)
                with open(file_path, "wb") as f:
                    f.write(r.content)
                print(f"✅ Erledigt: {local_name}")
            else:
                print(f"❌ Fehler {r.status_code} bei: {local_name}")
        except Exception as e:
            print(f"⚠️ Verbindungsproblem bei {local_name}: {e}")

if __name__ == "__main__":
    download_missing()