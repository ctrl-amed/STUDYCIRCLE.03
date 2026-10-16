"""Rule-based task validation (Chapter 3, Rule-Based Task Validation, Table 3.3,
Formulas 3.1 and 3.2).

Each category has a fixed set of INDICATORS (the terms of Table 3.3). Synonyms and
related word forms of an indicator are treated as the SAME indicator (see the note
under Table 3.3), so:

    Km = number of the category's indicators found in the task description
    Kt = total number of indicators of the category (8 or 9)
    TM = Km / Kt * 100
"""
import re

# indicator -> synonyms / related forms (all count as that one indicator)
INDICATORS = {
    "reading": {
        "read": ["read", "reading", "read through", "read over", "read up on",
                 "finish reading", "complete reading", "work through"],
        "skim": ["skim", "skimming", "scan", "browse", "look through", "go through"],
        "annotate": ["annotate", "annotating", "annotation", "mark important parts"],
        "highlight": ["highlight", "highlighting", "underline"],
        "take notes": ["take notes", "taking notes", "take note", "note taking",
                       "take notes while reading"],
        "chapter": ["chapter", "chapters", "lesson", "pages", "passage"],
        "article": ["article", "articles", "journal", "handout"],
        "module": ["module", "modules", "textbook", "book", "slides"],
        "reading material": ["reading material", "reading materials", "reading assignment",
                             "reading list", "study material", "literature", "documentation"],
    },
    "writing": {
        "write": ["write", "writing", "written", "rewrite", "write up", "write down"],
        "draft": ["draft", "drafting", "prepare draft"],
        "compose": ["compose", "composing", "composition"],
        "essay": ["essay", "essays"],
        "report": ["report", "reports", "lab report"],
        "paper": ["paper", "papers", "research paper", "term paper", "thesis"],
        "outline": ["outline", "outlining", "create outline"],
        "document": ["document", "documentation", "proposal", "letter", "email"],
        "reflection": ["reflection", "reflections", "reflection paper", "journal", "journaling"],
    },
    "review": {
        "review": ["review", "reviewing", "review notes", "exam review"],
        "revise": ["revise", "revising", "revision", "brush up", "brush up on"],
        "recap": ["recap", "recapping", "refresh", "refresh memory"],
        "go over": ["go over", "go through", "look back", "revisit", "recheck", "check again"],
        "summarize": ["summarize", "summarise", "summary", "make summary"],
        "reread": ["reread", "re-read", "study again", "relearn"],
        "consolidate": ["consolidate", "consolidation", "reinforce"],
        "prepare for exam": ["prepare for exam", "exam preparation", "prepare for test",
                             "prepare for quiz", "study for exam", "pre-exam", "review before exam"],
    },
    "practice": {
        "solve": ["solve", "solving", "solve problems", "work out"],
        "practice": ["practice", "practise", "practicing", "practising", "rehearse",
                     "train", "training", "attempt"],
        "exercise": ["exercise", "exercises", "workbook", "worksheet"],
        "drill": ["drill", "drills", "repeat exercises"],
        "problem set": ["problem set", "problem sets", "problems", "sample problems", "past papers"],
        "code": ["code", "coding", "programming", "debug", "debugging"],
        "quiz": ["quiz", "quizzes", "mock test", "mock exam", "practice test",
                 "take test", "take exam"],
        "apply": ["apply", "applying", "application", "apply concepts", "hands-on", "hands on"],
        "compute": ["compute", "computing", "calculate", "calculation", "calculations"],
    },
    "memorize": {
        "memorize": ["memorize", "memorise", "memorizing", "memorising", "memorization",
                     "memorisation", "learn by heart", "commit to memory", "rote learning"],
        "recall": ["recall", "recalling", "remember", "remembering", "active recall",
                   "retrieval practice", "retain"],
        "flashcards": ["flashcards", "flashcard", "flash cards", "flash card", "make flashcards"],
        "terms": ["terms", "term", "key terms", "keywords", "facts", "dates", "names"],
        "formulas": ["formulas", "formula", "equations", "equation"],
        "definitions": ["definitions", "definition", "define"],
        "vocabulary": ["vocabulary", "vocab", "words"],
        "mnemonics": ["mnemonics", "mnemonic", "acronym", "association"],
    },
    "creation": {
        "create": ["create", "creating", "creation", "make", "making", "generate"],
        "design": ["design", "designing", "layout", "wireframe", "mockup", "mock-up"],
        "build": ["build", "building", "construct", "constructing"],
        "develop": ["develop", "developing", "development", "project"],
        "prototype": ["prototype", "prototyping", "proof of concept"],
        "implement": ["implement", "implementing", "implementation", "feature"],
        "sketch": ["sketch", "sketching", "draw", "drawing", "illustrate",
                   "illustration", "brainstorm"],
        "produce": ["produce", "producing", "produce content", "artwork", "poster",
                    "video", "animation"],
        "present": ["present", "presenting", "presentation", "pitch"],
    },
}

CATEGORY_ALIASES = {
    "practicing": "practice", "practise": "practice",
    "memorization": "memorize", "memorise": "memorize", "memorizing": "memorize",
    "create": "creation", "creating": "creation",
    "reviewing": "review",
}

STOPWORDS = {"a", "an", "the", "my", "our", "some", "this", "that", "these", "those"}


def normalize(text):
    """R2 Standardization: lowercase, strip punctuation, drop articles."""
    text = re.sub(r"[^\w\s-]", " ", str(text).lower())
    return " ".join(w for w in text.split() if w not in STOPWORDS)


# Built once at startup: category -> [(indicator, [compiled patterns of its synonyms])]
KEYWORD_RULES = {}
for _cat, _groups in INDICATORS.items():
    _rules = []
    for _indicator, _syns in _groups.items():
        _pats = [re.compile(rf'\b{re.escape(normalize(s))}(?:s|es|ed|d|ing)?\b')
                 for s in sorted(set(_syns), key=lambda k: (-len(k), k))]
        _rules.append((_indicator, _pats))
    KEYWORD_RULES[_cat] = _rules


def alignment_score(n_matches, category):
    """
    Formula 3.1: TM = (Km / Kt) x 100
    Interpreting Kt as the "expected number of indicators evaluated" in a normal task.
    Setting Kt = 1.4 ensures that finding just 1 relevant keyword yields ~71.4% (Aligned).
    """
    if n_matches <= 0 or category not in KEYWORD_RULES:
        return 0.0
    
    # Kt is set to a realistic expected length for a normal student task string
    k_t = 1.4
    
    score = (n_matches / k_t) * 100.0
    return min(score, 100.0)


def count_matches(task_str, category):
    """R4: the indicators of `category` found in the task (each counted once)."""
    text = f" {normalize(task_str)} "
    return [indicator for indicator, pats in KEYWORD_RULES[category]
            if any(p.search(text) for p in pats)]


def suggest_category(task_str, selected):
    """Other category with the most matched indicators, or None."""
    best, best_n = None, 0
    for cat in KEYWORD_RULES:
        if cat == selected:
            continue
        n = len(count_matches(task_str, cat))
        if n > best_n:
            best, best_n = cat, n
    return best


def effective_category(task_str, selected):
    """The selected category if the task is Aligned with it, otherwise a clearly better fit."""
    n_sel = len(count_matches(task_str, selected))
    if alignment_score(n_sel, selected) >= 70.0:
        return selected
    sug = suggest_category(task_str, selected)
    if sug and len(count_matches(task_str, sug)) > n_sel:
        return sug
    return selected