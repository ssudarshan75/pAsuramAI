import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import os
import re
import socket

PORT = 8080

def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    replacements = {
        "ā": "a", "ī": "i", "ū": "u", "ē": "e", "ō": "o",
        "ṇ": "n", "ḷ": "l", "ṟ": "r", "ṅ": "g", "ñ": "n",
        "ś": "s", "ṣ": "s", "ḻ": "l", "ḍ": "d", "ṭ": "t", "ṛ": "r"
    }
    for char, repl in replacements.items():
        text = text.replace(char, repl)
    text = text.replace("aa", "a").replace("ee", "i").replace("oo", "u")
    text = text.replace("zh", "z").replace("sh", "s").replace("th", "t")
    text = text.replace("bh", "b").replace("dh", "d").replace("gh", "g").replace("ph", "p")
    
    dedup = []
    for i, char in enumerate(text):
        if i == 0 or char != text[i-1]:
            dedup.append(char)
    cleaned = "".join(dedup)
    return re.sub(r'[^a-z0-9]', '', cleaned)

# Sample offline data (used as a fallback or preloaded database)
OFFLINE_PALLANDU = [
  {
    "id": 1,
    "title": "Thirupallāṇḍu - Verse 1",
    "alvar": "Periyāzhvār",
    "original": "Pallāṇḍu pallāṇḍu pallāyirattāṇḍu pala kōḍi nūrāyiram\nMallāṇḍa tiṇdōl maṇivaṇṇā! un śēvaḍi śevvi tirukkāppu",
    "split_lines": [
      "Pallāṇḍu | pallāṇḍu | pallāyirattāṇḍu | pala | kōḍi | nūrāyiram",
      "Mallāṇḍa | tiṇdōl | maṇivaṇṇā | un | śēvaḍi | śevvi | tirukkāppu"
    ]
  },
  {
    "id": 2,
    "title": "Thirupallāṇḍu - Verse 2",
    "alvar": "Periyāzhvār",
    "original": "Aḍiyōmōḍum ninnōḍum pirivinṛi āyiram pallāṇḍu\nVaḍivay nin vala mārbinil vāzginra maṅgaiyum pallāṇḍu\nVaḍivār śōdi valatturaiyum śuḍarāziyum pallāṇḍu\nPaḍai pōr pukku muzaṅgum appāñcaśanniyamum pallāṇḍē",
    "split_lines": [
      "Aḍiyōmōḍum | ninnōḍum | pirivinṛi | āyiram | pallāṇḍu",
      "Vaḍivay | nin | vala | mārbinil | vāzginra | maṅgaiyum | pallāṇḍu",
      "Vaḍivār | śōdi | valatturaiyum | śuḍarāziyum | pallāṇḍu",
      "Paḍai | pōr | pukku | muzaṅgum | appāñcaśanniyamum | pallāṇḍē"
    ]
  },
  {
    "id": 3,
    "title": "Thirupallāṇḍu - Verse 3",
    "alvar": "Periyāzhvār",
    "original": "Vāzāṭ paṭṭu ninṛīr ullīrēl vandu maṇṇum maṇamum koṇmin\nKūzāṭ paṭṭu ninrīrgalai engaḷ kuzuvinil pugudaloṭṭōm\nĒzāṭ kālum pazippilōm nāṅgal irākkadar vāz ilaṅgai\nPāzāḷāga ppaḍai porudānukku pallāṇḍu kūrudumē",
    "split_lines": [
      "Vāzāṭ | paṭṭu | ninṛīr | ullīrēl | vandu | maṇṇum | maṇamum | koṇmin",
      "Kūzāṭ | paṭṭu | ninrīrgalai | engaḷ | kuzuvinil | pugudal | oṭṭōm",
      "Ēzāṭ | kālum | pazippilōm | nāṅgal | irākkadar | vāz | ilaṅgai",
      "Pāzāḷāga | paḍai | porudānukku | pallāṇḍu | kūrudumē"
    ]
  },
  {
    "id": 4,
    "title": "Thirupallāṇḍu - Verse 4",
    "alvar": "Periyāzhvār",
    "original": "Ēḍu nilattil iḍuvadan munnam vandu engaḷ kuzām pugundu\nKūḍu manam uḍaiyīrgal varambozi vandollai kkūḍuminō\nNāḍu nagaramum naṅgariya namō nārāyaṇāyavenṟu\nPāḍu manam uḍai ppattar ullīr! vandu pallāṇḍu kūruminē",
    "split_lines": [
      "Ēḍu | nilattil | iḍuvadan | munnam | vandu | engaḷ | kuzām | pugundu",
      "Kūḍu | manam | uḍaiyīrgal | varambozi | vandu | ollai | kūḍuminō",
      "Nāḍu | nagaramum | naṅgu | ariya | namō | nārāyaṇāya | venṟu",
      "Pāḍu | manam | uḍai | ppattar | ullīr | vandu | pallāṇḍu | kūruminē"
    ]
  },
  {
    "id": 5,
    "title": "Thirupallāṇḍu - Verse 5",
    "alvar": "Periyāzhvār",
    "original": "Aṇḍakkulattukkadibadi āgi aśurar irākkadarai\nIṇḍai kkulattai eḍuttu kkalainda iruḍīgēśan tanakku\nToṇḍa kkulattil ullīr! vandaḍi tozudu āyira nāmam solli\nPaṇḍai kkulattai ttavirndu pallāṇḍu pallāyirattāṇḍenminē",
    "split_lines": [
      "Aṇḍa-k-kulattukku | adibadi | āgi | aśurar | irākkadarai",
      "Iṇḍai | kkulattai | eḍuttu | kalainda | iruḍīgēśan | tanakku",
      "Toṇḍa | kkulattil | ullīr | vandu | aḍi | tozudu | āyira | nāmam | solli",
      "Paṇḍai | kkulattai | tavirndu | pallāṇḍu | pallā-yirattāṇḍenminē"
    ]
  },
  {
    "id": 6,
    "title": "Thirupallāṇḍu - Verse 6",
    "alvar": "Periyāzhvār",
    "original": "Endai tandai tandai tandai tam moodappan ēḻpadikāl thoḍaṅgip\nVandu vazhi vazhi āṭcheygindrōm thiruvōṇath thiruvizhāvil\nAndhiyam pōdhil ariyuruvāgi ariyai azhiththavanai\nPandhanai dheera pallāṇḍu pallāyirath thāṇḍendrumine",
    "split_lines": [
      "Endai | tandai | tandai | tandai | tam | moodappan | ēḻpadikāl | thoḍaṅgip",
      "Vandu | vazhi | vazhi | āṭcheygindrōm | thiruvōṇath | thiruvizhāvil",
      "Andhiyam | pōdhil | ariyuruvāgi | ariyai | azhiththavanai",
      "Pandhanai | dheera | pallāṇḍu | pallāyirath | thāṇḍendrumine"
    ]
  },
  {
    "id": 7,
    "title": "Thirupallāṇḍu - Verse 7",
    "alvar": "Periyāzhvār",
    "original": "Theeyir poligindra senjuḍar āzhi thigazh thirucchakkaraththin\nKōyirporiyālē oṭṭuṇḍu nindru kudikudi āṭcheygindrōm\nMāyapporupadaivāṇanai āyirath thōlum pozhindha padhaic\nChāyap pavala vazhiyavanukku pallāṇḍu kūrudumē",
    "split_lines": [
      "Theeyir | poligindra | senjuḍar | āzhi | thigazh | thirucchakkaraththin",
      "Kōyirporiyālē | oṭṭuṇḍu | nindru | kudikudi | āṭcheygindrōm",
      "Māyapporupadaivāṇanai | āyirath | thōlum | pozhindha | padhaic",
      "Chāyap | pavala | vazhiyavanukku | pallāṇḍu | kūrudumē"
    ]
  },
  {
    "id": 8,
    "title": "Thirupallāṇḍu - Verse 8",
    "alvar": "Periyāzhvār",
    "original": "Neyyidai nalladhōr sōrum niyadhamum aththāṇich chēvakamum\nKaiadaikkāyum kazhuththukkup pūṇodu kādhukkuk kuṇḍalamum\nMeyyida nalladhōr sāndhamum thandhu ennai veḷḷuyirākka valla\nPaiyuda nāgap pagaik koḍiyānukkup pallāṇḍu kūruvanē",
    "split_lines": [
      "Neyyidai | nalladhōr | sōrum | niyadhamum | aththāṇich | chēvakamum",
      "Kai-adaikkāyum | kazhuththukkup | pūṇodu | kādhukkuk | kuṇḍalamum",
      "Meyyida | nalladhōr | sāndhamum | thandhu | ennai | veḷḷuyirākka | valla",
      "Paiyuda | nāgap | pagaik | koḍiyānukkup | pallāṇḍu | kūruvanē"
    ]
  },
  {
    "id": 9,
    "title": "Thirupallāṇḍu - Verse 9",
    "alvar": "Periyāzhvār",
    "original": "Udukka dhugilgaḷ uduppana uṇbana uṇṇum vetriyalai\nThoduppana thozhaigaḷukkāram thandhu ennait thuyar thudaiththavanukku\nMadukkoḷ thuzhāymudi māyanukkum en manaththukkiniyavanukkum\nAdhirkkoḷ karuṅgaḍalōlaic chūzhndha pallāṇḍu kūrudumē",
    "split_lines": [
      "Udukka | dhugilgaḷ | uduppana | uṇbana | uṇṇum | vetriyalai",
      "Thoduppana | thozhaigaḷukkāram | thandhu | ennait | thuyar | thudaiththavanukku",
      "Madukkoḷ | thuzhāymudi | māyanukkum | en | manaththukkiniyavanukkum",
      "Adhirkkoḷ | karuṅgaḍalōlaic | chūzhndha | pallāṇḍu | kūrudumē"
    ]
  },
  {
    "id": 10,
    "title": "Thirupallāṇḍu - Verse 10",
    "alvar": "Periyāzhvār",
    "original": "Ennāḷum embirān unradhiyōm endru eḻudhina ōlaip paḍiyē\nEnnāḷum aḍiyarai āṭcheyvadhu ezhudhiya paththiramē\nEnnāḷum emmaip parigaḷaich cheydhu iraṅgigaḷ thavirndha thirumāl\nEnnāḷum embirānāgiya mādhavanukku pallāṇḍu kūruvanē",
    "split_lines": [
      "Ennāḷum | embirān | unradhiyōm | endru | eḻudhina | ōlaip | paḍiyē",
      "Ennāḷum | aḍiyarai | āṭcheyvadhu | ezhudhiya | paththiramē",
      "Ennāḷum | emmaip | parigaḷaich | cheydhu | iraṅgigaḷ | thavirndha | thirumāl",
      "Ennāḷum | embirānāgiya | mādhavanukku | pallāṇḍu | kūruvanē"
    ]
  },
  {
    "id": 11,
    "title": "Thirupallāṇḍu - Verse 11",
    "alvar": "Periyāzhvār",
    "original": "Alvazhakkondrumillā anandhath thirumālukkup pallāṇendru\nSolvazhakkāl solla vallavar thammaic cholluvārgaḷ sollavillai\nKelvazhakkillai kidandhavāṟē kidandhu kēḷvirōṟum\nSelvazhakkillaich chenru pukuvārgaḷ selvath thirumālukkē",
    "split_lines": [
      "Alvazhakkondrumillā | anandhath | thirumālukkup | pallāṇḍendru",
      "Solvazhakkāl | solla | vallavar | thammaic | cholluvārgaḷ | sollavillai",
      "Kelvazhakkillai | kidandhavāṟē | kidandhu | kēḷvirōṟum",
      "Selvazhakkillaich | chenru | pukuvārgaḷ | selvath | thirumālukkē"
    ]
  },
  {
    "id": 12,
    "title": "Thirupallāṇḍu - Verse 12",
    "alvar": "Periyāzhvār",
    "original": "Pallāṇḍendru pavithranai pparamēṭṭiyai ccārṅgamennum\nVillāṇḍān tannai villiputhūr viṭṭuchiththan virumbiyasol\nNallāṇḍendru navindruraippārgaḷ namō nārāyaṇāyavenru\nPallāṇdum paramanai ccūzhndhirundhu pallāṇdu kūruvarē",
    "split_lines": [
      "Pallāṇḍendru | pavithranai | paramēṭṭiyai | ccārṅgamennum",
      "Villāṇḍān | tannai | villiputhūr | viṭṭuchiththan | virumbiyasol",
      "Nallāṇḍendru | navindruraippārgaḷ | namō | nārāyaṇāyavenru",
      "Pallāṇdum | paramanai | ccūzhndhirundhu | pallāṇdu | kūruvarē"
    ]
  }
]

OFFLINE_THIRUPPAVAI = [
  {
    "id": 101,
    "title": "Thiruppāvai - Verse 1",
    "alvar": "Āṇḍāḷ",
    "original": "Mārgazhittiṅgaḷ madhiniṛainda nannāḷāl\nNīrāḍappōvār pōdhuminō nērizhaiyīr\nSīrmalgumāypāḍi celvacciṛumīrgāḷ\nKūrvēlkoḍuntozhilan nandagōpan kumaran\nĒrāraṅgaṇṇi yaśōdhaiyaḷañciṅgam\nKārmēniccheṅgaṇ kadirmadhiyampōlmugaththān\nNārāyaṇanē namakkēpaṛaitaruvan\nPārōrpugazhappaḍindēlōrembāvāy",
    "split_lines": [
      "Mārgazhi | tiṅgaḷ | madhi | niṛainda | nal | nāḷāl",
      "Nīr | āḍa | pōvār | pōdhuminō | nēr | izhaiyīr",
      "Sīr | malgum | āypāḍi | celva | ciṛu | mīrgāḷ",
      "Kūr | vēl | koḍum | tozhilan | nandagōpan | kumaran",
      "Ēr | araṅgaṇ | yaśōdhai | iḷam | ciṅgam",
      "Kār | mēni | cem | kaṇ | kadir | madhiyam | pōl | mugaththān",
      "Nārāyaṇanē | namakkē | paṛai | taruvan",
      "Pārōr | pugazha | paḍindu | ēlōr | embāvāy"
    ]
  },
  {
    "id": 102,
    "title": "Thiruppāvai - Verse 2",
    "alvar": "Āṇḍāḷ",
    "original": "Vaiyaththuvāzhvīrgāḷ nāmum nampāvaikku\nCeyyumkiriśaigaḷ kēḷīrō pāṛkaḍaluḷ\nPaiyaththuyindra paramanaḍipāḍi\nNeyyuṇṇōmpāluṇṇōm nāṭkālē nīrāḍi\nMaiyezhudhōmmalarcūḍōm ceyyādhanaceyōm\nIyyamuṅgiciṛiyōm iyalvuzhumaṅgaikoṇḍu\nIyyamuṅgiccaṅgamāyan paramanaḍipāḍi\nAiyamumpiccaiyumāṅgaiyālandilaṅgi",
    "split_lines": [
      "Vaiyaththu | vāzhvīrgāḷ | nāmum | nam | pāvaikku",
      "Ceyyum | kiriśaigaḷ | kēḷīrō | pāṛkaḍaluḷ",
      "Paiyaththu | uyindra | paraman | aḍi | pāḍi",
      "Ney | uṇṇōm | pāl | uṇṇōm | nāṭkālē | nīr | āḍi",
      "Mai | ezhudhōm | malar | cūḍōm | ceyyādhana | ceyōm",
      "Iyyamum | piccaiyum | āṅgaiyāl | thandhu | uyarndhu",
      "Iyyamum | caṅgamāyan | paraman | aḍi | pāḍi",
      "Aiyamum | piccaiyum | āṅgaiyāl | thandilaṅgi"
    ]
  }
]

def query_gemini_api(user_message, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {
        "Content-Type": "application/json"
    }
    
    system_instruction = (
        "You are 'Paasuram AI', a Srivaishnava scholar helping the user learn and search the "
        "4,000 Naalayira Divya Prabandham. The user is browsing, reading, or searching verses in English transliteration. "
        "You must respond in structured JSON format with two keys:\n"
        "1. 'reply': A conversational, helpful, and concise scholarly response (1-3 sentences) in English, "
        "introducing the verses or answering their query.\n"
        "2. 'verses': An array of verse objects relevant to the user's request. If the user asks for a specific "
        "hymn (like Thiruppavai, Thirupallandu, Nachiyar Thirumozhi, etc.) or searches for a concept/word "
        "(e.g., 'Kannan', 'Andal', 'sharanagati'), compile/find the relevant transliterated verses (limit 10-12 at a time). "
        "Each verse in the array must look exactly like this:\n"
        "{\n"
        "  'id': integer (sequential),\n"
        "  'title': 'string (e.g. Thirupallandu - Verse 1)',\n"
        "  'alvar': 'string (e.g. Periyalvar)',\n"
        "  'original': 'string (conjoined English transliteration with standard spacing)',\n"
        "  'split_lines': [\n"
        "     'string (conjoined words split by | )'\n"
        "  ]\n"
        "}\n"
        "If the user is just saying hello or asking general questions, return 'verses' as an empty array [].\n"
        "Respond ONLY with valid JSON. Do not include markdown wraps or backticks."
    )
    
    prompt = f"{system_instruction}\n\nUser Message: {user_message}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            text_response = res_data['candidates'][0]['content']['parts'][0]['text']
            return json.loads(text_response)
    except Exception as e:
        print(f"Gemini API Call failed: {e}")
        return None

class APIHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/chat':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_json = json.loads(post_data.decode('utf-8'))
            user_message = request_json.get('message', '').strip()
            
            print(f"Received Chat Message: '{user_message}'")
            
            api_key = os.environ.get("GEMINI_API_KEY")
            response_payload = None
            
            if api_key:
                print("GEMINI_API_KEY found. Querying Gemini...")
                response_payload = query_gemini_api(user_message, api_key)
            
            # Fallback if no API key or API call failed
            if not response_payload:
                print("Running in Offline/Fallback Mode...")
                msg_lower = user_message.lower()
                
                # Load all compiled files dynamically
                all_verses = []
                for db_file in ["divya_prabandham.json", "desika_prabandham.json", "vaishnava_stotrams.json"]:
                    file_path = os.path.join("data", db_file)
                    if os.path.exists(file_path):
                        try:
                            with open(file_path, "r", encoding="utf-8") as f:
                                all_verses.extend(json.load(f))
                        except Exception as e:
                            print(f"Error loading {db_file}: {e}")
                
                # Also fall back to loading data/pallandu.json as a safeguard
                if not all_verses and os.path.exists(os.path.join("data", "pallandu.json")):
                    try:
                        with open(os.path.join("data", "pallandu.json"), "r", encoding="utf-8") as f:
                            all_verses.extend(json.load(f))
                    except Exception as e:
                        print(f"Error loading pallandu.json: {e}")
                
                # If we still have no verses, fallback to the hardcoded ones
                if not all_verses:
                    all_verses.extend(OFFLINE_PALLANDU)
                    all_verses.extend(OFFLINE_THIRUPPAVAI)
                
                # 1. Check if the user asks for a specific hymn using normalized search
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
                    "hanumanstuti": "hanumanstuti",
                    "hanumanstuthi": "hanumanstuti",
                    "hanuman": "hanumaanachaaliisaa",
                    "chalisa": "hanumaanachaaliisaa",
                    "narasimha": "narasimhakavacham",
                    "kavacham": "narasimhakavacham",
                    "mantraraajapada": "mantraraajapadastotram",
                    "krishnaashtakam": "krishnaashtakam",
                    "krishnashtakam": "krishnaashtakam",
                    "shodasanama": "vishnushodasanama",
                    "shodasa": "vishnushodasanama",
                    "garudadandakam": "garudadandakam",
                    "garuda": "garudadandakam",
                    "nyasadasakam": "nyasadasakam",
                    "nyasa": "nyasadasakam",
                    "panchayudhastotram": "panchayudhastotram",
                    "panchayudha": "panchayudhastotram",
                    "saranagatigadyam": "saranagatigadyam",
                    "saranagati": "saranagatigadyam",
                    "gadyam": "saranagatigadyam",
                    "sudarshanaashtakam": "sudarshanaashtakam",
                    "sudarshana": "sudarshanaashtakam",
                    "sudarshanashtakam": "sudarshanaashtakam",
                    "mantrapushpam": "mantrapushpam",
                    "pushpam": "mantrapushpam",
                    "adaikkalappattu": "adaikkalappattu",
                    "adaikkalam": "adaikkalappattu",
                    "adaikalapathu": "adaikkalappattu",
                    "satrumurai": "vadagalaisaattrumurai",
                    "saattrumurai": "vadagalaisaattrumurai"
                }
                
                target_hymn_id = None
                for key, hid in hymn_mappings.items():
                    if key in normalized_msg or normalize_text(key) in normalized_msg:
                        target_hymn_id = hid
                        break
                
                if target_hymn_id:
                    matched_verses = [v for v in all_verses if v.get("hymn_id") == target_hymn_id]
                    if matched_verses:
                        hymn_title_match = matched_verses[0].get("hymn_name", target_hymn_id.capitalize())
                        composer_match = matched_verses[0].get("composer", "Alvar")
                
                # 2. If no specific hymn is matched, check if searching for keyword/composer
                if not matched_verses:
                    # Use clean simple normalized tokens search
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
                
                # Formulate response
                if target_hymn_id and matched_verses:
                    response_payload = {
                        "reply": f"Here is the complete {hymn_title_match} composed by {composer_match}. Scroll to read the verses in conjoined or split modes.",
                        "verses": matched_verses
                    }
                elif matched_verses:
                    response_payload = {
                        "reply": f"I found {len(matched_verses)} verses matching your search query. Tap on Split Mode in the header if you want to segment conjoined words for chanting.",
                        "verses": matched_verses
                    }
                else:
                    # Default welcome / fallback message
                    response_payload = {
                        "reply": "Welcome to Paasuram AI! I can help you chant and study Srivaishnava hymns. Try searching for 'Thiruppallandu', 'Thiruppavai', 'Stotra Ratnam', or look up a theme like 'Kannan'.",
                        "verses": []
                    }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))
        elif self.path == '/api/synthesize':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_json = json.loads(post_data.decode('utf-8'))
            verse_text = request_json.get('text', '').strip()
            
            print(f"Received Chanting Request for: '{verse_text[:40]}...'")
            
            response_payload = {"error": "Unknown error" }
            try:
                import re
                cleaned_text = re.sub(r'\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$', '', verse_text)
                cleaned_text = cleaned_text.replace('⋆', '').replace('‡', '')
                
                normalized_text = cleaned_text.replace('ō', 'o').replace('ē', 'e').replace('ṃ', 'ṁ')
                from indic_transliteration import sanscript
                devanagari_text = sanscript.transliterate(normalized_text, sanscript.IAST, sanscript.DEVANAGARI)
                
                from gradio_client import Client
                print("Connecting to Hugging Face prathoshap/vagdhenu-demo Space...")
                client = Client("prathoshap/vagdhenu-demo")
                result = client.predict(
                    devanagari_text,  # txt
                    "__auto__",       # meter_choice
                    60,               # seed
                    api_name="/synthesize"
                )
                
                wav_path = result[0]
                status_msg = result[1]
                
                import base64
                with open(wav_path, "rb") as audio_file:
                    encoded_string = base64.b64encode(audio_file.read()).decode('utf-8')
                
                try:
                    os.remove(wav_path)
                except Exception:
                    pass
                
                response_payload = {
                    "audio": f"data:audio/wav;base64,{encoded_string}",
                    "status": status_msg
                }
                
            except Exception as e:
                print(f"Error during Vāgdhenu voice synthesis: {e}")
                response_payload = {"error": str(e)}
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))
        else:
            super().do_POST()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def run():
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{PORT}"
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n" + "="*60)
    print("🌺 DYNAMIC DIVYA PRABANDHAM AI AGENT 🌺")
    print("="*60)
    print(f"\n1. Connect your iPhone to the SAME Wi-Fi network as this Mac.")
    print(f"2. Open Safari on your iPhone and go to:")
    print(f"\n   👉 \033[1;36m{url}\033[0m 👈\n")
    print(f"3. Tap 'Share' -> 'Add to Home Screen' to launch it as a full-screen app.")
    print(f"4. Make sure your server has GEMINI_API_KEY set for dynamic generation.")
    print("="*60)
    print(f"Starting server on local IP {local_ip}:{PORT}...\n")
    
    try:
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("", PORT), APIHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server. Keep chanting! 🙏")

if __name__ == "__main__":
    run()
