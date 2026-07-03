import os
import json
import time
import re
from gradio_client import Client
from indic_transliteration import sanscript

def clean_verse_for_tts(text):
    text = re.sub(r'\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$', '', text)
    text = text.replace('⋆', '').replace('‡', '')
    return text.strip()

def download_all_chants():
    audio_dir = "audio"
    os.makedirs(audio_dir, exist_ok=True)
    
    # Load all verses from our databases
    hymns = []
    db_files = ["divya_prabandham.json", "desika_prabandham.json", "vaishnava_stotrams.json"]
    
    for db_file in db_files:
        path = os.path.join("data", db_file)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                hymns.extend(json.load(f))
                
    print(f"Loaded {len(hymns)} verses in total.")
    
    client = None
    
    for idx, verse in enumerate(hymns):
        hymn_id = verse.get("hymn_id")
        verse_num = verse.get("verse_number")
        
        if not hymn_id or not verse_num:
            continue
            
        file_name = f"{hymn_id}_{verse_num}.wav"
        dest_path = os.path.join(audio_dir, file_name)
        
        # Skip if already downloaded
        if os.path.exists(dest_path):
            print(f"[{idx+1}/{len(hymns)}] Skipping {file_name} (already exists).")
            continue
            
        print(f"[{idx+1}/{len(hymns)}] Synthesizing {file_name}...")
        
        # Prepare text
        raw_text = verse.get("original", "")
        cleaned = clean_verse_for_tts(raw_text)
        normalized = cleaned.replace('ō', 'o').replace('ē', 'e').replace('ṃ', 'ṁ')
        devanagari = sanscript.transliterate(normalized, sanscript.IAST, sanscript.DEVANAGARI)
        
        max_retries = 3
        success = False
        
        for attempt in range(max_retries):
            try:
                if client is None:
                    client = Client("prathoshap/vagdhenu-demo")
                
                result = client.predict(
                    devanagari,
                    "__auto__", # meter_choice
                    60,         # seed
                    api_name="/synthesize"
                )
                
                temp_wav_path = result[0]
                
                # Copy temp_wav_path to dest_path
                import shutil
                shutil.copy(temp_wav_path, dest_path)
                try:
                    os.remove(temp_wav_path)
                except:
                    pass
                    
                print(f"    Saved to {dest_path}. Status: {result[1]}")
                success = True
                break
            except Exception as e:
                print(f"    Attempt {attempt+1} failed: {e}")
                # Re-initialize client just in case
                client = None
                time.sleep(5)
                
        if not success:
            print(f"    Failed to download {file_name} after {max_retries} attempts. Skipping...")
            time.sleep(10)
            
        # Polite delay to prevent rate limit issues
        time.sleep(2)

if __name__ == "__main__":
    download_all_chants()
