"""Weighted Sum Model (WSM) technique recommendation engine."""

# --- WSM (Weighted Sum Model) constants, used by the technique recommendation engine ---

TASK_WEIGHTS = {
    "Creation": {"df": 0.8, "fm": 0.1, "cs": 0.1},
    "Writing": {"df": 0.7, "fm": 0.2, "cs": 0.1},
    "Practicing": {"df": 0.6, "fm": 0.3, "cs": 0.1},
    "Reading": {"df": 0.5, "fm": 0.4, "cs": 0.1},
    "Review": {"df": 0.2, "fm": 0.4, "cs": 0.4},
    "Memorize": {"df": 0.1, "fm": 0.5, "cs": 0.4}
}

FRAMEWORK_SCORES = {
    "Pomodoro": {"df": 2, "fm": 10, "cs": 9},
    "52-17 Method": {"df": 7, "fm": 7, "cs": 6},
    "90m Deep Work": {"df": 10, "fm": 2, "cs": 2}
}


def normalized_framework_score(framework, criterion):
    """Min-max normalization (legacy fallback model):
    x_{f,c} = (X_{f,c} - X_{c,min}) / (X_{c,max} - X_{c,min})"""
    vals = [s[criterion] for s in FRAMEWORK_SCORES.values()]
    lo, hi = min(vals), max(vals)
    if hi == lo:
        return 0.0
    return (FRAMEWORK_SCORES[framework][criterion] - lo) / (hi - lo)


# --- Helpers for the WSM recommendation engine ---

# Maps whatever the frontend sends to the exact keys used in TASK_WEIGHTS
WEIGHT_CATEGORY_ALIASES = {
    "creation": "Creation", "create": "Creation", "creating": "Creation",
    "writing": "Writing", "write": "Writing",
    "practicing": "Practicing", "practice": "Practicing",
    "practising": "Practicing", "practise": "Practicing",
    "reading": "Reading", "read": "Reading",
    "review": "Review", "reviewing": "Review",
    "memorize": "Memorize", "memorise": "Memorize", "memorizing": "Memorize",
    "memorising": "Memorize", "memorization": "Memorize", "memorisation": "Memorize",
}

WSM_MIN_ATTEMPTS = 3
WSM_MIN_MODIFIER = 0.5


def resolve_weight_category(value):
    """'Practice' -> 'Practicing', 'memorization' -> 'Memorize'. None if unknown."""
    text = str(value or '').strip().lower()
    if not text:
        return None
    if text in WEIGHT_CATEGORY_ALIASES:
        return WEIGHT_CATEGORY_ALIASES[text]
    for alias, cat in WEIGHT_CATEGORY_ALIASES.items():
        if alias in text:
            return cat
    return None


def resolve_framework_name(technique):
    """Maps a stored technique name to a FRAMEWORK_SCORES key. None if unknown."""
    t = str(technique or '').lower()
    if '52' in t:
        return "52-17 Method"
    if '90' in t or 'ultradian' in t or 'deep' in t:
        return "90m Deep Work"
    if 'pomodoro' in t or '25' in t:
        return "Pomodoro"
    return None


# =============================================================================
# 5-CRITERIA WEIGHTED SUM MODEL (Chapter 3, Tables 3.4-3.6, Formulas 3.5 & 3.6)
#   S_i = sum(w_j * r_ij) kung saan sum(w_j) = 1.00
#   Weights: Task Category (30%), Learning Objective (25%), Study Time (15%),
#            Material Type (15%), Task Complexity (15%)
# =============================================================================

WSM5_WEIGHTS = {
    'task_category': 0.30,
    'learning_objective': 0.25,
    'study_time': 0.15,
    'material_type': 0.15,
    'task_complexity': 0.15,
}   # sum = 1.00

WSM5_TIMERS = {
    "Pomodoro": {"focus": 25, "break": 5, "sessions": 4},
    "52-17 Method": {"focus": 52, "break": 17, "sessions": 3},
    "90m Deep Work": {"focus": 90, "break": 20, "sessions": 2},
}

# Predefined 1-to-5 suitability ratings batay sa Table 3.5 at Table 3.6 ng Chapter 3
WSM5_RATINGS = {
    "Pomodoro": {
        "task_category": {
            "review": 5, "memorize": 5, "memorisation": 5, "memorizing": 5,
            "reading": 4, "read": 4,
            "practice": 3, "practicing": 3, "practise": 3,
            "writing": 3, "write": 3,
            "creation": 2, "create": 2
        },
        "learning_objective": {
            "recalling information": 5, "recall": 5, "memorization": 5,
            "understanding a concept": 5, "understand": 5, "comprehension": 5,
            "applying a procedure": 3, "apply": 3, "practice": 3,
            "analyzing content": 3, "analyze": 3,
            "producing an academic output": 2, "produce": 2, "create": 2
        },
        "study_time": {
            "short": 5, "25 mins": 5, "25-45 min": 5, "25-50 min": 5, "< 30 mins": 5, "< 1 hour": 5,
            "medium": 4, "50-75 min": 4, "50-90 min": 4, "1 hour": 4, "1-2 hours": 4,
            "long": 3, "90+ mins": 3, "2+ hours": 3, "extended": 2
        },
        "material_type": {
            "concept-based": 5, "conceptual": 5,
            "text-based": 4, "text": 4,
            "mixed": 4,
            "visual": 3,
            "problem-based": 3, "problem": 3
        },
        "task_complexity": {
            "basic review": 5, "basic": 5, "low": 5,
            "concept understanding": 4, "medium": 4, "moderate": 4,
            "problem solving": 3, "high": 3, "complex": 3,
            "output development": 2, "very high": 2, "advanced": 2
        }
    },
    "52-17 Method": {
        "task_category": {
            "writing": 5, "write": 5,
            "practice": 4, "practicing": 4, "practise": 4,
            "reading": 4, "read": 4,
            "creation": 4, "create": 4,
            "review": 3, "memorize": 3, "memorisation": 3
        },
        "learning_objective": {
            "applying a procedure": 5, "apply": 5, "practice": 5,
            "understanding a concept": 4, "understand": 4,
            "analyzing content": 4, "analyze": 4,
            "producing an academic output": 4, "produce": 4, "create": 4,
            "recalling information": 3, "recall": 3
        },
        "study_time": {
            "medium": 5, "50-75 min": 5, "50-90 min": 5, "1 hour": 5, "1-2 hours": 5,
            "long": 4, "90+ mins": 4, "2+ hours": 4,
            "short": 2, "25 mins": 2, "25-45 min": 2, "< 30 mins": 2
        },
        "material_type": {
            "text-based": 5, "text": 5,
            "mixed": 5,
            "problem-based": 4, "problem": 4,
            "concept-based": 4, "conceptual": 4,
            "visual": 4
        },
        "task_complexity": {
            "concept understanding": 5, "medium": 5, "moderate": 5,
            "problem solving": 4, "high": 4, "complex": 4,
            "output development": 4, "advanced": 4,
            "basic review": 3, "basic": 3, "low": 3
        }
    },
    "90m Deep Work": {
        "task_category": {
            "creation": 5, "create": 5,
            "practice": 5, "practicing": 5, "practise": 5,
            "writing": 4, "write": 4,
            "reading": 3, "read": 3,
            "review": 2, "memorize": 1, "memorisation": 1
        },
        "learning_objective": {
            "producing an academic output": 5, "produce": 5, "create": 5,
            "analyzing content": 5, "analyze": 5,
            "applying a procedure": 4, "apply": 4,
            "understanding a concept": 3, "understand": 3,
            "recalling information": 1, "recall": 1
        },
        "study_time": {
            "long": 5, "90+ mins": 5, "2+ hours": 5, "extended": 5,
            "medium": 3, "50-75 min": 3, "50-90 min": 3, "1 hour": 3,
            "short": 1, "25 mins": 1, "25-45 min": 1, "< 30 mins": 1
        },
        "material_type": {
            "problem-based": 5, "problem": 5,
            "mixed": 4,
            "visual": 4,
            "text-based": 3, "text": 3,
            "concept-based": 3, "conceptual": 3
        },
        "task_complexity": {
            "output development": 5, "very high": 5, "advanced": 5,
            "problem solving": 5, "high": 5, "complex": 5,
            "concept understanding": 3, "medium": 3, "moderate": 3,
            "basic review": 1, "basic": 1, "low": 1
        }
    }
}


def wsm5_ready(answers):
    """Tiyaking aktibo ang 5-criteria model kapag may laman na ang WSM5_RATINGS."""
    return bool(WSM5_RATINGS)


def wsm5_score(technique, answers, task_categories):
    """Kinakalkula ang S_i para sa isang study technique gamit ang 5 criteria (Formula 3.5)."""
    r = WSM5_RATINGS[technique]
    answers = answers or {}
    
    # 1. Task Category Alignment (Weight: 30%)
    cats = [str(c).strip().lower() for c in task_categories]
    cat_ratings = [r['task_category'][c] for c in cats if c in r['task_category']]
    cat_rating = sum(cat_ratings) / len(cat_ratings) if cat_ratings else 3.0
    total = WSM5_WEIGHTS['task_category'] * cat_rating

    # 2. Karagdagang apat na criteria (Learning Objective, Study Time, Material Type, Task Complexity)
    for crit in ('learning_objective', 'study_time', 'material_type', 'task_complexity'):
        val = str(answers.get(crit) or '').strip().lower()
        rating = r[crit].get(val)
        
        # Paghahanap ng partial match sakaling iba ang format ng frontend
        if rating is None:
            for opt_key, opt_rating in r[crit].items():
                if opt_key in val or (val and val in opt_key):
                    rating = opt_rating
                    break
                    
        # Baseline rating kung walang naipasang sagot sa partikular na criterion
        if rating is None:
            rating = 3.5
            
        total += WSM5_WEIGHTS[crit] * rating

    return round(total, 2)


def wsm5_recommend(answers, task_categories):
    """Nagbabalik ng (best_technique, {technique: score}) gamit ang Formula 3.6."""
    scores = {t: wsm5_score(t, answers, task_categories) for t in WSM5_RATINGS}
    best = max(scores, key=scores.get)
    return best, scores