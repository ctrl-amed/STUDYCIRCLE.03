"""AI features: Kitsu chat, flashcards/quizzes/notes generation, task validation,
WSM technique recommendation, and saved user tools."""
import os

import google.generativeai as genai
from flask import Blueprint, jsonify, request
from pypdf import PdfReader
from werkzeug.utils import secure_filename

import config
from extensions import limiter, supabase
from services.task_validation import (CATEGORY_ALIASES, KEYWORD_RULES, alignment_score,
                                      count_matches, effective_category, suggest_category)
from services.wsm_engine import (WSM5_TIMERS, resolve_weight_category, wsm5_recommend)
from utils.helpers import parse_json_field

ai_bp = Blueprint('ai_tools', __name__)

@ai_bp.route('/api/kitsu-chat', methods=['POST'])
def kitsu_chat():
    """Endpoint for the AI Chat feature (Kitsu AI Chat)."""
    data = request.get_json()
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'Message is required.'}), 400

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({'success': False, 'error': 'GEMINI_API_KEY is missing.'}), 500

        os.environ["GEMINI_API_KEY"] = api_key
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(config.GEMINI_MODEL)

        prompt = f"You are Kitsu, a cozy, friendly, and helpful anime-style study fox assistant for a study app called StudyCircle. Keep your answers encouraging, concise, and study-focused. User says: {user_message}"

        response = model.generate_content(prompt)
        ai_reply = response.text

        return jsonify({'success': True, 'reply': ai_reply}), 200
    except Exception as e:
        print("EXACT GEMINI ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


@ai_bp.route('/api/generate-ai-tool', methods=['POST'])
def generate_ai_tool():
    """Generates Flashcards / Quizzes / Notes from an uploaded PDF file."""
    tool_type = request.form.get('toolType', 'Notes')
    file = request.files.get('file')

    if not file:
        return jsonify({'error': 'No file uploaded.'}), 400

    file_path = None
    try:
        upload_dir = 'temp_uploads'
        os.makedirs(upload_dir, exist_ok=True)
        # secure_filename blocks path traversal (e.g. "../../app.py")
        file_path = os.path.join(upload_dir, secure_filename(file.filename) or 'upload.pdf')
        file.save(file_path)

        reader = PdfReader(file_path)
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        if not extracted_text.strip():
            extracted_text = "Sample study material content."

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel(config.GEMINI_MODEL)

        if tool_type in ['Pre-quiz', 'Post-quiz']:
            prompt = f"""
            Analyze the following text and generate exactly 5 multiple-choice questions based strictly on its content.
            Return the output strictly as a valid JSON object in this exact format, with no markdown code blocks or extra text:
            {{
              "questions": [
                {{
                  "question": "Question text here?",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": 0
                }}
              ]
            }}
            Text: {extracted_text[:6000]}
            """
        elif tool_type == 'Flashcards':
            prompt = f"""
            Analyze the following text and generate 4 flashcards containing a key term and definition based strictly on the text.
            Return the output strictly as a valid JSON array of objects in this exact format, with no markdown code blocks:
            [
              {{ "term": "Term 1", "definition": "Definition 1" }}
            ]
            Text: {extracted_text[:6000]}
            """
        else:  # Notes
            prompt = f"""
            Analyze the following document text and provide comprehensive, structured study notes with clear headings and bullet points based strictly on the text content:
            Text: {extracted_text[:6000]}
            """

        response = model.generate_content(prompt)
        result_text = response.text.strip()

        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        return jsonify({'success': True, 'data': result_text.strip()}), 200

    except Exception as e:
        print("EXACT GENERATE TOOL ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass


# =============================================================================
# TASK VALIDATION (Chapter 3: Rule-Based Task Validation, Formulas 3.1 and 3.2)
# =============================================================================

@ai_bp.route('/api/validate-task', methods=['POST'])
@limiter.limit("120 per hour")      # must be BELOW the route decorator to take effect
def validate_task():
    data = request.get_json() or {}
    category = str(data.get('category', '')).strip().lower()
    category = CATEGORY_ALIASES.get(category, category)
    tasks = [str(t).strip() for t in (data.get('tasks') or []) if str(t).strip()]

    if category not in KEYWORD_RULES:
        return jsonify({'success': False, 'error': f'Unknown category: {category}'}), 400
    if not tasks:
        return jsonify({'success': False, 'error': 'At least one task is required.'}), 400

    results, total_score = [], 0.0

    for task_str in tasks:
        matched = count_matches(task_str, category)
        k_m = len(matched)                 # Km = number of matched indicators
        score = alignment_score(k_m, category)   # TM = Km / Kt x 100 (Formula 3.1)

        # Formula 3.2: T_A = 70, T_R = 40
        if score >= 70.0:
            status = "Aligned"
        elif score >= 40.0:
            status = "Needs Review"
        else:
            status = "Not Aligned"

        suggested = None
        if status != "Aligned":
            s = suggest_category(task_str, category)
            if s and len(count_matches(task_str, s)) > k_m:
                suggested = s

        results.append({
            'task': task_str, 'score': round(score, 2), 'points': k_m,
            'status': status, 'matchedKeywords': matched,
            'suggestedCategory': suggested
        })
        total_score += score

    avg = round(total_score / len(results), 2)
    final_status = "Aligned" if avg >= 70.0 else ("Needs Review" if avg >= 40.0 else "Not Aligned")

    return jsonify({
        'success': True, 'averageScore': avg, 'status': final_status,
        'taskBreakdown': results,
        'misalignedTasks': [r['task'] for r in results if r['status'] != 'Aligned'],
    }), 200


# =============================================================================
# WSM RECOMMENDATION (Chapter 3: Tables 3.4-3.5, Formulas 3.3-3.5)
# =============================================================================

@ai_bp.route('/api/ai-recommendation', methods=['POST'])
@limiter.limit("60 per hour")
def ai_recommendation():
    data = request.get_json() or {}
    email = data.get('email')
    work_type = data.get('workType', 'Reading')
    tasks = data.get('tasks', [])
    answers = data.get('answers') or {}

    if not email:
        return jsonify({'success': False, 'error': 'Email is required.'}), 400

    try:
        # Determine effective task categories
        session_category = resolve_weight_category(work_type) or "Reading"
        sel_key = str(work_type).strip().lower()
        sel_key = CATEGORY_ALIASES.get(sel_key, sel_key)
        
        matched_categories = []
        for t in tasks:
            if isinstance(t, dict):
                own_cat = resolve_weight_category(t.get('category'))
            elif sel_key in KEYWORD_RULES:
                own_cat = resolve_weight_category(effective_category(str(t), sel_key))
            else:
                own_cat = None
            matched_categories.append(own_cat or session_category)

        if not matched_categories:
            matched_categories = [session_category]

        # 5-criteria Weighted Sum Model: S_i = sum(w_j * r_ij) (Formula 3.4), R = argmax S_i (Formula 3.5)
        best_framework, wsm_scores = wsm5_recommend(answers, [c.lower() for c in matched_categories])
        
        framework_details = dict(WSM5_TIMERS)
        framework_details.setdefault(best_framework, {"focus": 25, "break": 5, "sessions": 4})
        cfg = framework_details[best_framework]

        # Generate Rationale using Gemini (explanation only; it does not affect the chosen technique)
        task_labels = [t.get('task') or t.get('text') or str(t) if isinstance(t, dict) else str(t) for t in tasks]
        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            model = genai.GenerativeModel(config.GEMINI_MODEL)

            prompt = f"""
            You are Kitsu AI, an expert adaptive study coach inside StudyCircle.
            A Weighted Sum Model algorithm determined that the user should use the '{best_framework}' technique ({cfg['focus']}m focus / {cfg['break']}m break) based on their tasks: {task_labels}.
            Write a short, friendly, and motivating explanation (max 3 sentences) acknowledging their specific tasks and why this technique matches their cognitive profile.
            Return ONLY the explanation text.
            """

            response = model.generate_content(prompt)
            rationale = response.text.strip()
        except Exception as ai_err:
            print("Gemini rationale failed, using fallback:", str(ai_err))
            rationale = (f"Based on your {session_category.lower()} tasks, "
                         f"{best_framework} ({cfg['focus']}m focus / {cfg['break']}m break) "
                         f"is the best fit for this session. You've got this!")

        return jsonify({
            'success': True,
            'techniqueName': best_framework,
            'focus': cfg['focus'],
            'break': cfg['break'],
            'sessions': cfg['sessions'],
            'recommendation': rationale,
            'scores': wsm_scores,
            'model': 'wsm-5-criteria'
        }), 200

    except Exception as e:
        print("WSM AI Recommendation Error:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500


# =============================================================================
# USER TOOLS (saved AI-generated study tools per user)
# =============================================================================

@ai_bp.route('/api/save-user-tool', methods=['POST'])
def save_user_tool():
    data = request.json or {}
    email = data.get('email')
    new_tool = data.get('tool')

    if not email or not new_tool:
        return jsonify({"success": False, "message": "Email and tool data required"}), 400

    try:
        user_res = supabase.table('users').select('inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        inventory = parse_json_field(user_res.data[0].get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        tool_id = new_tool.get('id')
        kept = [t for t in inventory if not (isinstance(t, dict) and t.get('id') == tool_id)]
        inventory = [new_tool] + kept

        supabase.table('users').update({"inventory": inventory}).eq('email', email).execute()

        return jsonify({"success": True, "inventory": [t for t in inventory if isinstance(t, dict)]}), 200

    except Exception as e:
        print("Error saving user tool:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@ai_bp.route('/api/get-user-tools', methods=['GET'])
def get_user_tools():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        user_res = supabase.table('users').select('inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        inventory = parse_json_field(user_res.data[0].get('inventory'), [])
        if not isinstance(inventory, list):
            inventory = []

        return jsonify({"success": True, "inventory": [t for t in inventory if isinstance(t, dict)]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500