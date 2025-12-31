#!/usr/bin/env python3
"""
Test script for NLP-based candidate detection using spaCy.
Run this to verify the spaCy Catalan model is working correctly.

Usage:
    python test_nlp_detection.py
"""

import spacy

def test_lemmatization():
    """Test that spaCy correctly lemmatizes Catalan verbs."""
    
    # Try to load the transformer model, fallback to smaller model
    try:
        nlp = spacy.load("ca_core_news_trf")
        print("✓ Loaded ca_core_news_trf (transformer model)")
    except OSError:
        try:
            nlp = spacy.load("ca_core_news_sm")
            print("✓ Loaded ca_core_news_sm (small model)")
        except OSError:
            print("✗ No Catalan spaCy model found!")
            print("  Install with: python -m spacy download ca_core_news_trf")
            return False
    
    # Test cases: conjugated form -> expected lemma
    test_cases = [
        ("conformen", "conformar"),
        ("formaven", "formar"),
        ("presentada", "presentar"),
        ("exhaureix", "exhaurir"),
        ("influenciar", "influenciar"),
        ("tancarem", "tancar"),
    ]
    
    print("\n--- Lemmatization Tests ---")
    all_passed = True
    
    for word, expected_lemma in test_cases:
        doc = nlp(word)
        actual_lemma = doc[0].lemma_.lower()
        passed = actual_lemma == expected_lemma
        status = "✓" if passed else "✗"
        print(f"{status} '{word}' -> '{actual_lemma}' (expected: '{expected_lemma}')")
        if not passed:
            all_passed = False
    
    # Test full sentence
    print("\n--- Full Sentence Test ---")
    text = "Les entitats que conformen el sector públic de la Generalitat."
    doc = nlp(text)
    
    print(f"Text: {text}\n")
    print("Token analysis:")
    for token in doc:
        if not token.is_punct and not token.is_space:
            print(f"  {token.text:15} -> lemma: {token.lemma_:15} POS: {token.pos_}")
    
    # Check if 'conformen' is lemmatized to 'conformar'
    conformen_token = [t for t in doc if t.text.lower() == "conformen"]
    if conformen_token:
        lemma = conformen_token[0].lemma_.lower()
        if lemma == "conformar":
            print(f"\n✓ 'conformen' correctly lemmatized to 'conformar'")
        else:
            print(f"\n✗ 'conformen' lemmatized to '{lemma}' (expected 'conformar')")
            all_passed = False
    
    return all_passed


def test_glossary_matching():
    """Test matching conjugated forms against a glossary."""
    
    try:
        nlp = spacy.load("ca_core_news_trf")
    except OSError:
        nlp = spacy.load("ca_core_news_sm")
    
    # Simulated glossary variants (lemmas of bad forms)
    glossary_variants = {
        "conformar": {
            "id": "V006",
            "terme_recomanat": "formar",
            "categoria": "verb"
        },
        "influenciar": {
            "id": "V007", 
            "terme_recomanat": "influir",
            "categoria": "verb"
        }
    }
    
    text = "Les entitats que conformen el sector públic i influencien la política."
    doc = nlp(text)
    
    print("\n--- Glossary Matching Test ---")
    print(f"Text: {text}\n")
    
    found_candidates = []
    for token in doc:
        lemma = token.lemma_.lower()
        
        if lemma in glossary_variants:
            entry = glossary_variants[lemma]
            
            # Optional: check POS matches category
            if entry['categoria'] == 'verb' and token.pos_ not in ['VERB', 'AUX']:
                continue
            
            found_candidates.append({
                "original": token.text,
                "lemma": lemma,
                "suggestion": entry['terme_recomanat'],
                "id": entry['id'],
                "pos": token.pos_
            })
    
    print("Found candidates:")
    for c in found_candidates:
        print(f"  '{c['original']}' (lemma: {c['lemma']}) -> suggestion: '{c['suggestion']}'")
    
    return len(found_candidates) == 2


if __name__ == "__main__":
    print("=" * 50)
    print("spaCy NLP Detection Test")
    print("=" * 50)
    
    lemma_ok = test_lemmatization()
    match_ok = test_glossary_matching()
    
    print("\n" + "=" * 50)
    if lemma_ok and match_ok:
        print("All tests PASSED ✓")
    else:
        print("Some tests FAILED ✗")
    print("=" * 50)
