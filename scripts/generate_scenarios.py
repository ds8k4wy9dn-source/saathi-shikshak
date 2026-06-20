#!/usr/bin/env python3

import argparse
import json
import time
import uuid
from pathlib import Path
import requests

# ─── CONFIGURATION ───
OUTPUT_DIR = Path(__file__).parent.parent / "offline-scenarios"
OUTPUT_DIR.mkdir(exist_ok=True)

# Deterministic namespace so re-runs always generate the SAME synthetic
# teacher_id per scenario (idempotent, preventing backend rate-limit collisions).
NAMESPACE = uuid.UUID("12345678-1234-5678-1234-567812345678")

def synthetic_teacher_id(scenario_id: str, lang: str) -> str:
    """Generates one unique, deterministic teacher_id per scenario."""
    return str(uuid.uuid5(NAMESPACE, f"{scenario_id}_{lang}"))

# ─── SCENARIO CATALOGUES ───
# The curated subset for maximum viable testing at minimum cost (~22 calls)
CURATED_SCENARIOS = [
    ("fl_001", "foundational_literacy", "Foundational (1-2)", "hindi", "मेरे Class 2 के बच्चे अभी भी अक्षर नहीं पहचानते। क्या करूं?", "My Class 2 students still can't recognize letters. What should I do?"),
    ("fl_003", "foundational_literacy", "Preparatory (3-5)", "hindi", "Class 3 के बच्चे simple शब्द नहीं जोड़ पाते — syllable blending नहीं होती", "Class 3 students can't blend syllables to form words"),
    ("fn_001", "foundational_numeracy", "Preparatory (3-5)", "mathematics", "Class 4 के बच्चे अभी भी जोड़ने के लिए उंगलियाँ गिनते हैं", "Class 4 students still count on their fingers for addition"),
    ("fn_003", "foundational_numeracy", "Preparatory (3-5)", "mathematics", "Class 5 में भिन्न (fractions) पढ़ाना — बच्चे बिल्कुल confused हैं", "Teaching fractions to Class 5 — students are completely lost"),
    ("ml_001", "multilingual", "Foundational (1-2)", "hindi", "आधे बच्चे घर पर भोजपुरी बोलते हैं — Hindi medium school में challenge", "Half the students speak Bhojpuri at home in a Hindi-medium school"),
    ("cb_001", "classroom_behaviour", "Preparatory (3-5)", "general", "बच्चे lesson के दौरान ध्यान नहीं देते", "Students don't pay attention during lessons"),
    ("cb_006", "classroom_behaviour", "Preparatory (3-5)", "general", "47 बच्चे अकेले manage करना — chaos हो जाता है", "Managing 47 students alone — it becomes chaotic"),
    ("ma_001", "mixed_ability", "Preparatory (3-5)", "general", "कुछ बच्चे बहुत आगे हैं, कुछ बहुत पीछे — same class में", "Some students are very advanced, others far behind — in the same class"),
    ("ma_002", "mixed_ability", "Preparatory (3-5)", "general", "multi-grade teaching — Class 3 और 4 एक साथ", "Multi-grade teaching — Class 3 and Class 4 together"),
    ("as_001", "assessment", "Preparatory (3-5)", "general", "आज का lesson सभी 45 बच्चों ने समझा या नहीं — कैसे जानें", "How to check if all 45 students understood today's lesson"),
    ("in_001", "inclusion_cwsn", "Middle (6-8)", "science", "Class 6 Science में hearing impairment वाला बच्चा है", "Student with hearing impairment in my Class 6 Science class"),
    ("in_003", "inclusion_cwsn", "Preparatory (3-5)", "general", "intellectual disability वाला बच्चा — बाकी class से बहुत पीछे", "Student with intellectual disability — much slower than classmates"),
    ("lp_h_001", "lesson_planning_hindi", "Preparatory (3-5)", "hindi", "Hindi poem कैसे पढ़ाएं जो बच्चे समझें और enjoy करें", "How to teach a Hindi poem so students understand and enjoy it"),
    ("lp_m_001", "lp_mathematics", "Preparatory (3-5)", "mathematics", "Class 4 multiplication lesson — concrete और visual कैसे बनाएं", "Making a Class 4 multiplication lesson concrete and visual"),
    ("lp_e_001", "lp_evs", "Preparatory (3-5)", "evs", "water cycle — Class 4 के बच्चे genuinely कैसे समझें", "Teaching the water cycle so Class 4 students genuinely understand it"),
    ("pe_001", "parent_engagement", "Preparatory (3-5)", "general", "parents बच्चों को regularly नहीं भेजते — absenteeism", "Parents don't send children regularly — chronic absenteeism"),
    ("sm_001", "student_motivation", "Middle (6-8)", "general", "पहले अच्छा बच्चा था — अब withdrawn और disengaged हो गया", "A previously good student has become withdrawn and disengaged"),
    ("ab_001", "admin_burden", "Preparatory (3-5)", "general", "paperwork इतना है कि पढ़ाने का समय नहीं मिलता", "So much paperwork that there's no time left for actual teaching"),
    ("by_001", "beginning_of_year", "Preparatory (3-5)", "general", "पहले दिन Class 3 के नए बच्चों का level कैसे assess करें", "How to assess new Class 3 students' level on the very first day"),
    ("fl_007", "foundational_literacy", "Foundational (1-2)", "hindi", "Class 2 का एक भी बच्चा fluently नहीं पढ़ पाता", "Not a single Class 2 student can read fluently"),
    ("fn_006", "foundational_numeracy", "Preparatory (3-5)", "mathematics", "Class 3 के बच्चे घड़ी में समय नहीं बता पाते", "Class 3 students can't tell time on an analog clock"),
    ("cb_005", "classroom_behaviour", "Preparatory (3-5)", "general", "शर्मीले बच्चे जो कभी participate नहीं करते", "Shy students who never participate in class activities"),
]

FULL_SCENARIOS: list[tuple[str, str, str, str, str, str]] = []

# ─── API INTERACTION ───
def generate_scenario_entry(s: tuple, lang: str, api_url: str) -> dict | None:
    sid, category, grade_band, subject, query_hi, query_en = s
    query = query_hi if lang == "hi" else query_en
    grade_num = {"Foundational (1-2)": "2", "Preparatory (3-5)": "4", "Middle (6-8)": "6"}.get(grade_band, "5")

    teacher_id = synthetic_teacher_id(sid, lang)

    try:
        resp = requests.post(
            f"{api_url}/api/v1/query",
            json={
                "teacher_id": teacher_id,
                "query_text": query,
                "language": lang,
                "grade": grade_num,
                "subject": subject,
            },
            timeout=45,
        )
        resp.raise_for_status()
        
        return {
            "id": f"{sid}_{lang}",
            "category": category,
            "grade_band": grade_band,
            "subject": subject,
            "language": lang,
            "title": query,
            "query_text": query,
            "response": resp.json(),
        }
    except requests.exceptions.HTTPError as e:
        body = e.response.text[:200] if e.response is not None else ""
        print(f"    [API Error] {e} | {body}")
        return None
    except Exception as e:
        print(f"    [Local Error] {e}")
        return None

# ─── MAIN EXECUTION ───
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--resume", action="store_true", help="Skip already-generated files")
    parser.add_argument("--lang", choices=["hi", "en", "both"], default="hi")
    parser.add_argument("--full", action="store_true", help="Use the full scenario catalogue instead of the curated subset")
    args = parser.parse_args()

    scenarios = FULL_SCENARIOS if args.full else CURATED_SCENARIOS
    if args.full and not FULL_SCENARIOS:
        print("⚠️  --full was passed but FULL_SCENARIOS is empty.")
        return

    languages = {"hi": ["hi"], "en": ["en"], "both": ["hi", "en"]}[args.lang]
    total = len(scenarios) * len(languages)
    est_cost = total * 0.018 

    print(f"🚀 Generating {total} scenarios ({len(scenarios)} × {len(languages)} lang(s))")
    print(f"💰 Estimated cost: ~${est_cost:.2f}")
    print(f"📁 Output directory: {OUTPUT_DIR}\n")

    confirm = input("Proceed? [y/N]: ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    done = 0
    failures = 0
    
    for s in scenarios:
        for lang in languages:
            done += 1
            out_file = OUTPUT_DIR / f"{s[0]}_{lang}.json"

            if args.resume and out_file.exists():
                print(f"  ⏭  [{done}/{total}] Skipping {s[0]}_{lang} (exists)")
                continue

            print(f"  🔄 [{done}/{total}] Generating {s[0]}_{lang}...")
            
            # --- THE BULLETPROOF BLOCK ---
            max_retries = 3
            entry = None
            
            for attempt in range(max_retries):
                entry = generate_scenario_entry(s, lang, args.api_url)
                if entry:
                    break # Success: Exit the retry loop
                else:
                    print(f"    ⚠️ Transient failure on attempt {attempt + 1}/{max_retries}. Retrying in 10s...")
                    time.sleep(10.0) # Wait out the random API/Network drop
            # -----------------------------

            if entry:
                out_file.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  ✅ Saved {out_file.name}")
            else:
                failures += 1
                print(f"  ❌ FATAL: Failed {s[0]}_{lang} after {max_retries} attempts.")

            # --- THE TIER-0 RATE LIMIT GUARANTEE ---
            # Sleep for 20 seconds to enforce a strict maximum of 3 Requests Per Minute.
            # This mathematically prevents you from breaching the 5 RPM or 20,000 TPM limit.
            if done < total: # Prevents sleeping after the very last scenario
                print("  ⏳ Enforcing Tier 0 Rate Limit: Sleeping for 20 seconds...")
                time.sleep(20.0)

    print(f"\n✅ Done! {len(list(OUTPUT_DIR.glob('*.json')))} files in {OUTPUT_DIR}")
    if failures:
        print(f"⚠️  {failures} scenario(s) completely failed despite retries.")

if __name__ == "__main__":
    main()