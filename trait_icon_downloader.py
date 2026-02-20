import os
import requests

# Konfiguration
TRAIT_DIR = "static/img/traits"
BASE_URL = "https://raw.communitydragon.org/latest/game/assets/ux/traiticons/"
PREFIX = "trait_icon_16_"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# Deine Liste (Leerzeichen werden für die URL entfernt)
raw_traits = [
    "noxus", "demacia", "ionia", "freljord", "zaun", "void", "yordle", "arcanist", 
    "bruiser", "bilgewater", "darkin", "ixtal", "shadow isles", "shurima", "targon", 
    "piltover", "disruptor", "gunslinger", "invoker", "juggernaut", "longshot", 
    "vanquisher", "warden", "world ender", "the boss", "star forger", "quickstriker", 
    "immortal", "huntress", "heroic", "glutton", "emperor", "ascendant", "soulbound", 
    "rune mage", "hex mech", "harvester", "eternal", "dragonborn", "dark child", 
    "chronokeeper", "chainbreaker", "caretaker", "blacksmith", "assimilator"
]

traits = sorted(list(set(t.lower() for t in raw_traits)))

def download():
    if not os.path.exists(TRAIT_DIR):
        os.makedirs(TRAIT_DIR)

    print(f"Starte Download für {len(traits)} Traits...")

    for trait in traits:
        # shadow isles -> shadowisles
        clean_name = trait.replace(" ", "")
        local_file = f"{TRAIT_DIR}/{clean_name}.png"
        
        # Die zwei Varianten basierend auf deinen Beispielen
        urls = [
            f"{BASE_URL}{PREFIX}{clean_name}.tft_set16.png",
            f"{BASE_URL}{PREFIX}{clean_name}.png"
        ]
        
        success = False
        for url in urls:
            try:
                # Timeout von 5 Sekunden verhindert das Hängenbleiben
                r = requests.get(url, headers=HEADERS, timeout=5)
                if r.status_code == 200:
                    with open(local_file, "wb") as f:
                        f.write(r.content)
                    print(f"✅ {clean_name}.png geladen")
                    success = True
                    break
            except Exception:
                continue
        
        if not success:
            print(f"❌ {clean_name} konnte nicht gefunden werden.")

if __name__ == "__main__":
    download()