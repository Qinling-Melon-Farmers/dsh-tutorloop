/** Student-only browser API. Teacher context is never requested by this panel. */
export const STUDENT_ACTIONS = new Set(['overview', 'student_state', 'set_profile', 'language_settings', 'method_cards', 'list_sources', 'import_file', 'import_folder', 'search_materials', 'fetch_material', 'start_practice', 'submit_answer', 'reveal'])

export async function studentAction(cwd, action, payload = {}, signal) {
  if (!cwd) throw new Error('请先打开一个带工作目录的会话。')
  if (!STUDENT_ACTIONS.has(action)) throw new Error('面板不支持此操作。')
  let response
  try {
    response = await fetch('/api/dsh-tutorloop/action', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, action, payload }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('暂时无法连接 TutorLoop，请确认 DSH 服务正在运行后重试。')
  }
  let result
  try { result = await response.json() } catch {
    throw new Error('TutorLoop 尚未就绪。请启用插件，运行 dsh-tutorloop setup 后刷新 DSH。')
  }
  if (!response.ok || !result.ok) {
    const message = typeof result.error === 'string' ? result.error : result.error?.message
    throw new Error(message || '操作未完成，请检查插件配置后重试。')
  }
  return result.data
}

export function items(data) { return Array.isArray(data) ? data : data?.items || data?.sources || [] }
export function value(data) { return data && Object.hasOwn(data, 'value') ? data.value : data }
