from http.server import BaseHTTPRequestHandler
import json
import os
import re

def normalize_text(text):
    if not text:
        return ''
    norm = text.lower()
    
    # Strip retroflex macrons and subdots
    norm = norm.replace('ā', 'a').replace('ī', 'i').replace('ū', 'u')
    norm = norm.replace('ē', 'e').replace('ō', 'o').replace('ṇ', 'n')
    norm = norm.replace('ḷ', 'l').replace('ṟ', 'r').replace('ṅ', 'g')
    norm = norm.replace('ñ', 'n').replace('ś', 's').replace('ṣ', 's')
    norm = norm.replace('ḻ', 'l').replace('ḍ', 'd').replace('ṭ', 't')
    norm = norm.replace('ṛ', 'r')
    
    # Simplify common phonetics
    norm = norm.replace('aa', 'a').replace('ee', 'i').replace('oo', 'u')
    norm = norm.replace('zh', 'z').replace('sh', 's').replace('th', 't')
    norm = norm.replace('bh', 'b').replace('dh', 'd').replace('gh', 'g')
    norm = norm.replace('ph', 'p')
    
    # De-duplicate double letters
    dedup = []
    for i in range(len(norm)):
        if i == 0 or norm[i] != norm[i-1]:
            dedup.append(norm[i])
            
    return "".join(dedup).replace(' ', '')

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            req = json.loads(post_data.decode('utf-8'))
            user_message = req.get('message', '').strip()
        except Exception:
            self.send_response(400)
            self.end_headers()
            return
            
        # Load all verses from compiled JSON files
        all_verses = []
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, '..', 'data')
        
        for db_file in ["divya_prabandham.json", "desika_prabandham.json", "vaishnava_stotrams.json"]:
            file_path = os.path.join(data_dir, db_file)
            if os.path.exists(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        all_verses.extend(json.load(f))
                except Exception:
                    pass
                    
        # 1. Search for specific hymn matches
        matched_verses = []
        hymn_title_match = None
        composer_match = None
        
        normalized_msg = normalize_text(user_message)
        
        hymn_mappings = {
            "tiruppallandu": "tiruppallaandu",
            "pallandu": "tiruppallaandu",
            "tiruppavai": "tiruppaavai",
            "pavai": "tiruppaavai",
            "dashaavatara": "dashaavataarastotram",
            "dashavatara": "dashaavataarastotram",
            "hanuman": "hanumaanachaaliisaa",
            "chalisa": "hanumaanachaaliisaa",
            "narasimha": "narasimhakavacham",
            "kavacham": "narasimhakavacham",
            "mantraraajapada": "mantraraajapadastotram"
        }
        
        target_hymn_id = None
        for key, hid in hymn_mappings.items():
            if key in normalized_msg:
                target_hymn_id = hid
                break
                
        if target_hymn_id:
            matched_verses = [v for v in all_verses if v.get("hymn_id") == target_hymn_id]
            if matched_verses:
                hymn_title_match = matched_verses[0].get("hymn_name", target_hymn_id.capitalize())
                composer_match = matched_verses[0].get("composer", "Alvar")
                
        # 2. General keyword search
        if not matched_verses:
            search_terms = [normalize_text(term) for term in user_message.split() if len(term) > 2]
            if search_terms:
                for v in all_verses:
                    text_to_search = normalize_text(
                        v.get("original", "") + " " + 
                        " ".join(v.get("split_lines", [])) + " " + 
                        v.get("hymn_name", "") + " " + 
                        v.get("composer", "") + " " + 
                        v.get("category", "")
                    )
                    if any(term in text_to_search for term in search_terms):
                        matched_verses.append(v)
                        
        # 3. Formulate response payload
        if target_hymn_id and matched_verses:
            response_payload = {
                "reply": f"Here is the complete {hymn_title_match} composed by {composer_match}. Scroll to start chanting.",
                "verses": matched_verses[:50]
            }
        elif matched_verses:
            response_payload = {
                "reply": f"Found {len(matched_verses)} matching verses for your query. Tapping any item will launch it in the reader.",
                "verses": matched_verses[:30]
            }
        else:
            response_payload = {
                "reply": "No matching scriptures or keywords found in the offline database. Try searching for 'tiruppavai', 'narasimha', or 'hanuman'.",
                "verses": []
            }
            
        # Send headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Write response body
        self.wfile.write(json.dumps(response_payload).encode('utf-8'))
