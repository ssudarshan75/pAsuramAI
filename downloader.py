import os
import re
import json
import urllib.request
import pypdf

# Directory setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# List of key Sunder Kidambi PDFs on Prapatti Online (under /slokas/english/)
STOTRA_SOURCES = {
    "divya_prabandham": [
        {
            "filename": "tiruppallaandu.pdf",
            "hymn_id": "tiruppallaandu",
            "hymn_name": "Tiruppallāṇḍu",
            "composer": "Periyāzvār",
            "category": "Divya Prabandham"
        },
        {
            "filename": "tiruppaavai.pdf",
            "hymn_id": "tiruppaavai",
            "hymn_name": "Tiruppāvai",
            "composer": "Āṇḍāḷ",
            "category": "Divya Prabandham"
        },
        {
            "filename": "tiruppalliyezuchchi.pdf",
            "hymn_id": "tiruppalliyezuchchi",
            "hymn_name": "Tiruppalliyezhuchchi",
            "composer": "Toṇḍaraḍippoḍiāzvār",
            "category": "Divya Prabandham"
        },
        {
            "filename": "amalaanadipiraan.pdf",
            "hymn_id": "amalaanadipiraan",
            "hymn_name": "Amalanādhipirān",
            "composer": "Tiruppāṇāzvār",
            "category": "Divya Prabandham"
        },
        {
            "filename": "kanninunshiruttaambu.pdf",
            "hymn_id": "kanninunshiruttaambu",
            "hymn_name": "Kaṇṇinuṇśiruttāmbu",
            "composer": "Madurakaviazvār",
            "category": "Divya Prabandham"
        }
    ],
    "desika_prabandham": [
        {
            "filename": "navamanimaalai.pdf",
            "hymn_id": "navamanimaalai",
            "hymn_name": "Navamaṇimālai",
            "composer": "Swāmi Vedānta Deśika",
            "category": "Desika Prabandham"
        },
        {
            "filename": "adhikaarasangraham.pdf",
            "hymn_id": "adhikaarasangraham",
            "hymn_name": "Adhikāra Saṅgraham",
            "composer": "Swāmi Vedānta Deśika",
            "category": "Desika Prabandham"
        }
    ],
    "vaishnava_stotrams": [
        {
            "filename": "dashaavataarastotram.pdf",
            "hymn_id": "dashaavataarastotram",
            "hymn_name": "Daśāvatāra Stotram",
            "composer": "Swāmi Vedānta Deśika",
            "category": "Vaishnava Stotrams"
        },
        {
            "filename": "hanumaanachaaliisaa.pdf",
            "hymn_id": "hanumaanachaaliisaa",
            "hymn_name": "Hanumān Chālīsā",
            "composer": "Goswāmi Tulsidās",
            "category": "Vaishnava Stotrams"
        },
        {
            "filename": "narasimhakavacham.pdf",
            "hymn_id": "narasimhakavacham",
            "hymn_name": "Nṛsiṁha Kavacha Stotram",
            "composer": "Prahlāda Mahārāj",
            "category": "Vaishnava Stotrams"
        },
        {
            "filename": "mantraraajapadastotram.pdf",
            "hymn_id": "mantraraajapadastotram",
            "hymn_name": "Mantrarājapada Stotram",
            "composer": "Lord Śiva",
            "category": "Vaishnava Stotrams"
        },
        {
            "filename": "shriistuti.pdf",
            "hymn_id": "shriistuti",
            "hymn_name": "Śrī Stuti",
            "composer": "Swāmi Vedānta Deśika",
            "category": "Vaishnava Stotrams"
        },
        {
            "filename": "haitaashrayagadyam.pdf",
            "hymn_id": "shriirangagadyam",
            "hymn_name": "Śrīraṅga Gadyam",
            "composer": "Swāmi Rāmānujāchārya",
            "category": "Vaishnava Stotrams"
        }
    ]
}

def download_file(filename):
    # Try downloading from standard paths
    urls_to_try = [
        f"https://www.prapatti.com/slokas/english/{filename}",
        f"https://www.prapatti.com/slokas/english/desika-stotramaala/{filename}",
        f"https://www.prapatti.com/slokas/english/naalaayiram/periyaazvaar/{filename}",
        f"https://www.prapatti.com/slokas/english/naalaayiram/aandaal/{filename}",
        f"https://www.prapatti.com/slokas/english/desika/{filename}"
    ]
    
    local_path = os.path.join(BASE_DIR, "downloads", filename)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    if os.path.exists(local_path):
        return local_path
        
    for url in urls_to_try:
        try:
            print(f"Trying: {url}...")
            urllib.request.urlretrieve(url, local_path)
            print(f"Downloaded: {filename}")
            return local_path
        except Exception:
            continue
            
    print(f"Failed to download {filename} from all known paths.")
    return None

def split_sandhi_heuristic(line):
    # Helper to generate split words based on common Tamil transliteration patterns
    # (e.g. separating conjoined words using dash or spaces)
    words = line.split()
    split_words = []
    for w in words:
        # Separate compound word connectors if any (like tiṇdōḻ -> tiṇd-ōḻ, maṇivaṇṇā -> maṇi-vaṇṇā)
        if "-" in w:
            split_words.extend(w.split("-"))
        else:
            split_words.append(w)
    return " | ".join(split_words)

def parse_pdf(pdf_path, config):
    if not pdf_path or not os.path.exists(pdf_path):
        return []
        
    reader = pypdf.PdfReader(pdf_path)
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"
        
    hymn_id = config.get("hymn_id", "")
    
    # Custom parser branch for Hanuman Chalisa
    if hymn_id == "hanumaanchalisaa_old":
        blocks = re.split(r'/FD\s*/FD', full_text)
        verses = []
        verse_number = 1
        for block in blocks:
            # Clean and split lines
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            cleaned_lines = []
            for line in lines:
                # Remove /FD and trim
                line_clean = line.replace('/FD', '').replace('˜u', '').replace('a˜n', 'añ').strip()
                line_lower = line_clean.lower()
                if (
                    not line_clean or
                    "www.prapatti.com" in line_lower or
                    "sunder" in line_lower or
                    "kidāmbi" in line_lower or
                    "śrīḥ" in line_lower or
                    "hanumanacali" in line_lower or
                    "hanum¯anac¯al" in line_lower or
                    "prepared by" in line_lower or
                    "this document" in line_lower or
                    "typeset using" in line_lower or
                    line_clean.isdigit()
                ):
                    continue
                cleaned_lines.append(line_clean)
            
            if not cleaned_lines:
                continue
                
            original_text = "\n".join(cleaned_lines)
            split_lines = [split_sandhi_heuristic(line) for line in cleaned_lines]
            
            # Label Dohas and Chaupais
            if verse_number == 1 or verse_number == 2:
                title = f"Dohā {verse_number}"
            elif verse_number == 43:
                title = f"Dohā 3"
            else:
                title = f"Chaupāī {verse_number - 2}"
                
            verses.append({
                "verse_number": verse_number,
                "title": title,
                "original": original_text,
                "split_lines": split_lines,
                "hymn_id": hymn_id,
                "hymn_name": config.get("hymn_name"),
                "composer": config.get("composer"),
                "category": config.get("category")
            })
            verse_number += 1
        return verses
        
    # Regular expression matching the standard verse markers e.g., "Á Á 1.1.1 Á Á" or "Á Á 1.10 Á Á"
    # Sunder Kidambi's PDF font maps || to Á Á or similar characters.
    verse_pattern = re.compile(r'(.*?)(?:Á\s*Á\s*\d+(?:\.\d+)*\s*Á\s*Á|\|\| \d+(?:\.\d+)* \|\|)', re.DOTALL)
    
    matches = verse_pattern.findall(full_text)
    
    verses = []
    verse_number = 1
    
    for match in matches:
        text_block = match.strip()
        
        # Clean header junk
        lines = [l.strip() for l in text_block.split('\n') if l.strip()]
        cleaned_lines = []
        for line in lines:
            # Clean and strip any Á symbol or leading/trailing pipes
            line_clean = line.replace('Á', '').replace('||', '').strip()
            line_lower = line_clean.lower()
            
            # Skip copyright notices, page headers or title/blessing lines
            # Skip exact matches of titles and headers to prevent stripping scripture text
            headers_to_skip = {
                "śrīḥ", "śrīnṛsiṃhakavacam", "śrī prahlādēna kṛtaṃ", "śrī prahlādēnakṛtaṃ",
                "dōhā", "doha", "caupāī", "caupai", "stōtram", "stotram", "śrī hanumāna cālīsā",
                "śrīhanumānacālīsā", "śrī hanumānacālīsā", "gōsvāmī śrī tulasīdāsa jī dvārā racita",
                "śrīmatē rāmānujāya namaḥ", "śrīmatē nigamāntamahādēśikāya namaḥ", "nṛsiṃhakavacaṃ",
                "nṛsiṃhakavacam", "śrīnṛsiṃhakavacam", "śrī nṛsiṃhakavacam", "dashaavataarastotram",
                "dashavatarastotram", "śrīraṅgam"
            }
            
            if (
                not line_clean or
                line_clean in headers_to_skip or
                line_lower in headers_to_skip or
                "www.prapatti.com" in line_lower or 
                "sunder" in line_lower or 
                "kidāmbi" in line_lower or 
                "prepared by" in line_lower or 
                "blessings of" in line_lower or 
                "mahādēśikan" in line_lower or 
                "mahadeśikan" in line_lower or 
                "āṇḍavan" in line_lower or 
                "his holiness" in line_lower or
                "raṅgarāmānuja" in line_lower or
                re.match(r'^\d+(\.\d+)*\s*–\s*', line_clean) or # e.g. "1.1 – tiruppallāṇḍu"
                line_clean.strip().isdigit()
            ):
                continue
            cleaned_lines.append(line_clean)
            
        if not cleaned_lines:
            continue
            
        original_text = "\n".join(cleaned_lines)
        
        # Build split lines
        split_lines = []
        for line in cleaned_lines:
            # Handle starting and ending notations
            prefix = ""
            suffix = ""
            core = line
            if core.startswith("‡"):
                prefix = "‡ "
                core = core[1:].strip()
            if core.endswith("⋆"):
                suffix = " | ⋆"
                core = core[:-1].strip()
                
            split_core = split_sandhi_heuristic(core)
            split_lines.append(f"{prefix}{split_core}{suffix}")
            
        verses.append({
            "id": f"{config['hymn_id']}_{verse_number}",
            "hymn_id": config['hymn_id'],
            "hymn_name": config['hymn_name'],
            "category": config['category'],
            "composer": config['composer'],
            "verse_number": verse_number,
            "original": original_text,
            "split_lines": split_lines
        })
        verse_number += 1
        
    return verses

def compile_all():
    all_compiled = {}
    
    for category, stotras in STOTRA_SOURCES.items():
        category_verses = []
        for config in stotras:
            print(f"\nProcessing {config['hymn_name']} ({category})...")
            local_path = download_file(config['filename'])
            if local_path:
                parsed_verses = parse_pdf(local_path, config)
                print(f"Parsed {len(parsed_verses)} verses.")
                category_verses.extend(parsed_verses)
                
        # Save individual categories
        output_file = os.path.join(DATA_DIR, f"{category}.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(category_verses, f, ensure_ascii=False, indent=2)
        print(f"Saved {category} to {output_file}")
        all_compiled[category] = category_verses
        
    return all_compiled

if __name__ == "__main__":
    compile_all()
