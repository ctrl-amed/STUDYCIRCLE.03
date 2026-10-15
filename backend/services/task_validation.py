"""Rule-based task validation: checks whether a task description matches its category."""
import re

TASK_DICTIONARIES = {
    "reading": [
        "read", "reading", "reread", "re-read", "go through", "go over", "look through", "scan", "skim",
        "browse", "examine", "inspect", "study", "read through", "read over", "read up on", "work through",
        "peruse", "consult", "refer to", "look up", "read chapter", "read article", "read book", "read notes",
        "read handout", "read module", "read lesson", "read paper", "read research paper", "read journal",
        "read documentation", "go through documentation", "read instructions", "read textbook", "read slides",
        "read lecture", "read source", "read reference", "read material", "read resources", "read literature",
        "read case study", "read essay", "read report", "read paragraph", "read passage", "read pages",
        "finish reading", "complete reading", "understand the chapter", "understand the article",
        "study the material", "examine the material", "review the text", "annotate while reading", "highlight",
        "mark important parts", "identify key points", "find main ideas", "extract information", "take notes while reading"
    ],
    "writing": [
        "write", "writing", "draft", "drafting", "compose", "composing", "create text", "produce text",
        "prepare a draft", "make a draft", "write up", "write down", "rewrite", "re-write", "revise", "revision",
        "edit", "editing", "proofread", "proofreading", "polish", "improve wording", "rephrase", "paraphrase",
        "outline", "create an outline", "write an outline", "develop an outline", "journal", "journal writing",
        "freewrite", "free writing", "essay", "write essay", "report", "write report", "research paper",
        "write research paper", "paper", "write paper", "paragraph", "write paragraph", "reflection",
        "write reflection", "documentation", "write documentation", "letter", "write letter", "response",
        "write response", "discussion post", "write discussion post", "article", "write article",
        "reflection paper", "document", "email", "write email", "blog", "write blog", "script", "write script",
        "story", "write story", "poem", "write poem", "caption", "write caption", "introduction",
        "write introduction", "conclusion", "write conclusion", "thesis statement", "write thesis statement",
        "proposal", "write proposal", "case study", "write case study", "lab report", "write lab report",
        "answer questions in writing", "complete written activity"
    ],
    "review": [
        "review", "reviewing", "revise", "revision", "go over", "go through", "look back", "revisit", "recheck",
        "check again", "check", "recap", "recap notes", "recap lesson", "refresh", "refresh memory",
        "refresh knowledge", "brush up", "brush up on", "reinforce", "reinforce learning", "consolidate",
        "consolidate knowledge", "relearn", "revisit lesson", "revisit chapter", "revisit notes", "review notes",
        "review chapter", "review lesson", "review module", "review material", "review lecture", "review slides",
        "review textbook", "review article", "review assignment", "review answers", "review mistakes",
        "check notes", "check previous work", "check previous lesson", "look at notes again", "study again",
        "study previous material", "study past lessons", "refresh concepts", "summarize", "make a summary",
        "review summary", "review key points", "review important points", "review highlights", "review before exam",
        "exam review", "test review", "quiz review", "final review", "pre-exam review", "review for exam",
        "review for quiz", "review for test", "review flashcards", "check understanding", "revisit difficult topics",
        "review weak areas", "correct mistakes", "go over mistakes", "analyze mistakes", "review feedback"
    ],
    "practice": [
        "practice", "practise", "practicing", "practising", "exercise", "exercises", "drill", "drills", "train",
        "training", "rehearse", "rehearsal", "work on", "work through", "try", "attempt", "solve", "solving",
        "answer", "answering", "complete problems", "do problems", "solve problems", "practice problems",
        "practice questions", "answer questions", "answer exercises", "do exercises", "workbook",
        "workbook exercises", "worksheet", "complete worksheet", "problem set", "complete problem set",
        "sample problems", "sample questions", "mock test", "mock exam", "practice test", "practice exam",
        "quiz practice", "test practice", "exam practice", "take a quiz", "take a test", "take an exam",
        "simulate exam", "exam simulation", "hands-on practice", "hands on", "apply", "apply concepts",
        "apply knowledge", "application", "implement", "code practice", "coding exercise", "programming exercise",
        "debug practice", "debug code", "solve equations", "solve math problems", "calculate", "calculations",
        "compute", "perform calculations", "work out", "practice speaking", "practice pronunciation",
        "practice writing", "practice grammar", "practice vocabulary", "practice presentation",
        "rehearse presentation", "practice skills", "skill practice", "repeat exercises", "repeat problems",
        "practice technique", "practice method", "practice procedure", "practice steps", "practice application"
    ],
    "memorize": [
        "memorize", "memorise", "memorizing", "memorising", "learn by heart", "commit to memory", "remember",
        "remembering", "retain", "retention", "recall", "recalling", "memorization", "memorisation",
        "rote learning", "rote memorization", "learn", "master", "mastering", "internalize", "internalise",
        "ingrain", "fix in memory", "store in memory", "flashcards", "flash card", "make flashcards",
        "review flashcards", "active recall", "recall practice", "self-test", "self testing", "retrieval practice",
        "retrieval", "spaced repetition", "spaced review", "repeat", "repetition", "repeat until remembered",
        "repeat information", "repeat terms", "repeat definitions", "learn terms", "learn definitions",
        "memorize terms", "memorize definitions", "memorize formulas", "memorize equations", "memorize facts",
        "memorize dates", "memorize names", "memorize vocabulary", "memorize concepts", "memorize keywords",
        "memorize rules", "memorize steps", "memorize procedures", "memorize sequence", "memorize lists",
        "memorize code", "memorize syntax", "memorize commands", "learn vocabulary", "vocabulary memorization",
        "learn formulas", "learn facts", "learn dates", "learn names", "recall facts", "recall terms",
        "recall definitions", "recall formulas", "recall concepts", "recall information", "test my memory",
        "memory drill", "memorization drill", "mnemonics", "mnemonic", "use mnemonic", "acronym",
        "make an acronym", "association", "associate concepts", "remember key points"
    ],
    "creation": [
        "create", "creating", "creation", "make", "making", "build", "building", "develop", "developing",
        "design", "designing", "produce", "producing", "construct", "constructing", "develop a project",
        "make a project", "create a project", "project", "prototype", "prototyping", "design a prototype",
        "create prototype", "develop prototype", "plan", "planning", "brainstorm", "brainstorming",
        "conceptualize", "conceptualise", "ideate", "ideation", "generate ideas", "come up with ideas",
        "create ideas", "design layout", "create layout", "design interface", "create interface",
        "design UI", "create UI", "design UX", "create UX", "wireframe", "wireframing", "mockup", "mock-up",
        "create mockup", "design mockup", "draw", "drawing", "illustrate", "illustration", "create illustration",
        "make diagram", "create diagram", "create chart", "create infographic", "create presentation",
        "make presentation", "design presentation", "create poster", "make poster", "design poster",
        "create graphic", "design graphic", "create logo", "design logo", "create website", "build website",
        "develop website", "create application", "build application", "develop application", "create app",
        "build app", "develop app", "create system", "build system", "develop system", "implement feature",
        "develop feature", "build feature", "create database", "design database", "build database",
        "create model", "build model", "develop model", "create content", "produce content", "create video",
        "edit video", "create animation", "create artwork", "make artwork", "creative project", "creative work",
        "make something", "create something", "develop concept", "design solution", "create solution", "build solution"
    ]
}

CATEGORY_ALIASES = {
    "practicing": "practice", "practise": "practice",
    "memorization": "memorize", "memorise": "memorize", "memorizing": "memorize",
}

# (The old CORE_ROOTS / GENERIC_TERMS / PROMOTED_TERMS point weights were removed:
#  the Rule-Based Task Validation section scores a task by its NUMBER of unique matched keywords instead.)

STOPWORDS = {"a", "an", "the", "my", "our", "some", "this", "that", "these", "those"}


def normalize(text):
    """lowercase, strip punctuation, drop articles ('make a poster' -> 'make poster')"""
    text = re.sub(r"[^\w\s-]", " ", text.lower())
    return " ".join(w for w in text.split() if w not in STOPWORDS)


# Built once at startup: (keyword, compiled regex), longest phrases first
# (longer phrases are matched before shorter ones, e.g. "read chapter" before "read")
KEYWORD_RULES = {}
for _cat, _kws in TASK_DICTIONARIES.items():
    _rules = []
    for _kw in sorted(set(_kws), key=lambda k: (-len(k), k)):
        # optional suffix so "solved", "memorized", "created", "designs" still match
        _pattern = re.compile(rf'\b{re.escape(normalize(_kw))}(?:s|es|ed|d|ing)?\b')
        _rules.append((_kw, _pattern))
    KEYWORD_RULES[_cat] = _rules


def alignment_score(n_matches, category):
    """Rule-Based Task Validation, Task Alignment Score (TM):
    TM = (Km / Kt) * 100"""
    if n_matches <= 0 or category not in KEYWORD_RULES:
        return 0.0
    
    k_t = len(KEYWORD_RULES[category])
    if k_t == 0:
        return 0.0
        
    return (n_matches / k_t) * 100.0


def count_matches(task_str, category):
    """Unique keywords of `category` found in the task (longest phrases first, no double counting)."""
    temp_text = f" {normalize(task_str)} "
    matched = []
    for kw, pattern in KEYWORD_RULES[category]:
        if pattern.search(temp_text):
            matched.append(kw)
            temp_text = pattern.sub(' ', temp_text)
    return matched


def suggest_category(task_str, selected):
    """Other category with the most keyword matches, or None."""
    best, best_n = None, 0
    for cat in KEYWORD_RULES:
        if cat == selected:
            continue
        n = len(count_matches(task_str, cat))
        if n > best_n:
            best, best_n = cat, n
    return best


def effective_category(task_str, selected):
    """The selected category if the task fits it, otherwise a clearly better-fitting one."""
    n_sel = len(count_matches(task_str, selected))
    if alignment_score(n_sel, selected) >= 70.0:
        return selected
    sug = suggest_category(task_str, selected)
    if sug and len(count_matches(task_str, sug)) > n_sel:
        return sug
    return selected
