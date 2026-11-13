import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { version } from '../../package.json'
import { detectLanguage } from './i18n.js'

export const REPOSITORY = 'https://github.com/Qinling-Melon-Farmers/dsh-tutorloop'
export const VERSION = version
const noticeKey = `dsh-tutorloop:release:${version}`
export function TutorLoopIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 5C9 3 5 3 3 4v15c3-1 6 0 9 2 3-2 6-3 9-2V4c-2-1-6-1-9 1v16" /><path d="m6 11 2 2 3-4m4-1h3m-3 4h3" /></svg>
}

export function useShellLanguage() {
  const [language, setLanguage] = useState(detectLanguage)
  useEffect(() => {
    const observer = new window.MutationObserver(() => setLanguage(detectLanguage()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => observer.disconnect()
  }, [])
  return language
}

const absent = { phase: 'unavailable' }
const emptySubscribe = () => () => {}
export function PluginAbout({ language = 'zh', status, openSettings }) {
  const update = useSyncExternalStore(status?.subscribe ?? emptySubscribe, status?.getSnapshot ?? (() => absent))
  useEffect(() => { if (update.phase === 'idle') void status?.check() }, [status, update.phase])
  const zh = language === 'zh'
  const labels = zh ? {
    unavailable: '可在插件管理页查看更新', idle: '尚未检查更新', checking: '正在检查更新…',
    unknown: '暂时无法确认更新', current: '当前没有新的稳定版', available: `可更新至 ${update.version}`,
    incompatible: `${update.version} 需要兼容的 DSH 版本，请在插件管理页查看`,
  } : {
    unavailable: 'Check updates in Plugins', idle: 'Updates not checked', checking: 'Checking updates…',
    unknown: 'Unable to confirm updates', current: 'No newer stable release', available: `Update available: ${update.version}`,
    incompatible: `${update.version} requires a compatible DSH version; see Plugins`,
  }
  return <section className="tutorloop-about" aria-label={zh ? '插件信息' : 'Plugin information'}>
    <div className="tutorloop-row"><TutorLoopIcon size={24} /><strong>TutorLoop</strong><span className="tutorloop-badge">v{version}</span><span role="status">{labels[update.phase]}</span></div>
    <div className="tutorloop-row"><a href={REPOSITORY} target="_blank" rel="noreferrer">GitHub</a><a href={`${REPOSITORY}/releases`} target="_blank" rel="noreferrer">{zh ? '更新日志' : 'Release notes'}</a>
      {update.phase !== 'unavailable' && <button disabled={update.phase === 'checking'} onClick={() => status?.check(true)}>{zh ? '检查更新' : 'Check updates'}</button>}
      {openSettings && <button onClick={openSettings}>{zh ? '插件设置与更新' : 'Plugin settings & updates'}</button>}
    </div>
  </section>
}

export function ReleaseNotice({ language = 'zh' }) {
  const [visible, setVisible] = useState(() => { try { return window.localStorage.getItem(noticeKey) !== 'seen' } catch { return true } })
  useEffect(() => {
    const dismiss = () => setVisible(false)
    const storage = event => { if (event.key === noticeKey && event.newValue === 'seen') dismiss() }
    window.addEventListener(noticeKey, dismiss); window.addEventListener('storage', storage)
    return () => { window.removeEventListener(noticeKey, dismiss); window.removeEventListener('storage', storage) }
  }, [])
  if (!visible) return null
  const zh = language === 'zh'
  return <aside className="tutorloop-notice" aria-label={zh ? '版本更新公告' : 'What’s new'}>
    <div className="tutorloop-row"><strong>{zh ? '本次更新' : 'What’s new'} · {version}</strong><button onClick={() => {
      try { window.localStorage.setItem(noticeKey, 'seen') } catch { /* Storage may be disabled; dismissal still works for this page. */ }
      window.dispatchEvent(new window.Event(noticeKey)); setVisible(false)
    }}>{zh ? '知道了' : 'Dismiss'}</button></div>
    <p>{zh ? '支持单文件 100 MiB 导入；新增侧边栏学习入口、插件信息与兼容性更新提示。' : 'Import files up to 100 MiB. New sidebar learning entry, plugin information and compatibility-aware update notices.'}</p>
    <a href={`${REPOSITORY}/releases/tag/v${version}`} target="_blank" rel="noreferrer">{zh ? '阅读完整更新日志' : 'Read the full release notes'}</a>
  </aside>
}
