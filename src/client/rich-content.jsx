import React from 'react'

const IMAGE_HOSTS = new Set(['fb.fbstatic.cn', 'fb.fenbike.cn'])

export function safeImageUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > 4096 || /[\u0000-\u0020\\]/.test(value)) return null
    const url = new URL(value)
    if (url.pathname === '/' || /\.(svg|html?|js)$/i.test(url.pathname)) return null
    url.hash = ''
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && IMAGE_HOSTS.has(url.hostname) ? url.href : null
  } catch { return null }
}

export function imageRequirements(question, materials = []) {
  const blocks = [...(question?.stem_blocks || []), ...(materials.length ? [] : question?.material_blocks || []),
    ...(question?.options || []).flatMap(option => option.blocks || []), ...materials.flatMap(material => material.blocks || [])]
  const images = blocks.filter(block => block.type === 'image')
  return { urls: [...new Set(images.map(block => safeImageUrl(block.url)).filter(Boolean))],
    unsupported: images.some(block => block.supported === false || !safeImageUrl(block.url)) }
}

/** Render structured content only. Neither HTML nor arbitrary URLs enter the DOM. */
export function RichContent({ blocks, text = '', onAssetState, language = 'zh' }) {
  if (!blocks?.length) return <span className="tutorloop-rich" data-tutorloop-content>{text}</span>
  return <span className="tutorloop-rich" data-tutorloop-content>{blocks.map((block, index) => {
    if (block.type === 'text') return <span key={index}>{block.text}</span>
    if (block.type !== 'image') return null
    const url = block.supported === false ? null : safeImageUrl(block.url)
    if (!url) return <span key={index} className="tutorloop-warning" role="alert">{language === 'en' ? 'This image is unavailable. Check the original before practicing.' : '这张图暂无法显示，请回看原件；当前不能正常交卷。'}</span>
    return <span className="tutorloop-figure" key={index}>
      <a href={url} target="_blank" rel="noopener noreferrer" title={language === 'en' ? 'Open full-size image' : '打开完整图片'}>
        <img src={url} alt={block.alt || (language === 'en' ? 'Question illustration' : '题目图像')} referrerPolicy="no-referrer"
          onLoad={event => onAssetState?.(url, event.currentTarget.naturalWidth > 0 ? 'loaded' : 'error')}
          onError={() => onAssetState?.(url, 'error')} />
      </a>
    </span>
  })}</span>
}
