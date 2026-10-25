// Keep the host bridge and student HTTP boundary on the same action vocabulary.
export const ZHENTI_ACTIONS = ['zhenti_papers', 'zhenti_paper', 'zhenti_start_quiz', 'zhenti_quiz_state', 'zhenti_next', 'zhenti_quit', 'zhenti_report']
export const STUDENT_ACTIONS = ['overview', 'list_sources', 'start_practice', 'student_state', 'public_state', 'reveal', 'submit_answer', 'set_profile', 'import_file', 'import_folder', 'search_materials', 'fetch_material', 'method_cards', 'export_memoir', 'language_settings', ...ZHENTI_ACTIONS]
export const TEACHER_ACTIONS = ['get_context', 'apply_feedback', 'create_practice', 'prepare_rubric', 'find_materials']
