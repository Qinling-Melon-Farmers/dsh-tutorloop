"""One JSON request on stdin, one JSON response on stdout. DSH subprocess entry."""
import json
import sys
from tutor import controller as tutor, storage
from tutor import materials


def dispatch(request):
    if not isinstance(request, dict):
        raise ValueError('请求必须为对象。')
    action = request.get('action')
    payload = request.get('payload', {})
    if not isinstance(payload, dict):
        raise ValueError('payload必须为对象。')
    handlers = {
        'overview': tutor.overview,
        'language_settings': tutor.language_settings,
        'set_profile': tutor.set_profile,
        'method_cards': tutor.method_cards,
        'student_state': tutor.student_state,
        'public_state': tutor.student_state,
        'import_file': materials.import_file,
        'import_folder': materials.import_folder,
        'search_materials': materials.search_materials,
        'fetch_material': materials.fetch_material,
        'list_sources': lambda: [materials.source_summary(c) for c in storage.get_chunks(200)],
        'find_materials': tutor.find_materials,
        'create_practice': tutor.create_practice,
        'start_practice': tutor.start_practice,
        'get_context': tutor.get_context,
        'reveal': tutor.reveal,
        'submit_answer': tutor.submit_answer,
        'apply_feedback': tutor.apply_feedback,
        'export_memoir': tutor.export_memoir,
    }
    if action not in handlers:
        raise ValueError('未知动作。')
    return handlers[action](**payload)


if __name__ == '__main__':
    try:
        if hasattr(sys.stdin, 'reconfigure'):
            sys.stdin.reconfigure(encoding='utf-8')
            sys.stdout.reconfigure(encoding='utf-8')
        raw = sys.stdin.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError('请求过大。')
        response = {'ok': True, 'data': dispatch(json.loads(raw))}
    except (ValueError, TypeError, KeyError) as exc:
        response = {'ok': False, 'error': str(exc)[:800]}
    except Exception:
        response = {'ok': False, 'error': '本地教学库处理失败，请检查项目路径、依赖与数据库权限。'}
    sys.stdout.write(json.dumps(response, ensure_ascii=False, allow_nan=False))
