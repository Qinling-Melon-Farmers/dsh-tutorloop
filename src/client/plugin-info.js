// Only the host interprets compatibility and chooses registries. This adapter
// never installs anything, and coalesces checks across mounted plugin surfaces.
export function createUpdateStatus(packageName, installedVersion) {
  let manager, generation = 0, inFlight, checkedAt = 0
  let snapshot = { phase: 'unavailable' }
  const listeners = new Set()
  const emit = value => { snapshot = value; for (const listener of listeners) listener() }
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => snapshot,
    setManager(value) {
      generation++; manager = value; inFlight = undefined; checkedAt = 0
      emit({ phase: value ? 'idle' : 'unavailable' })
    },
    check(force = false) {
      if (!manager) return Promise.resolve()
      if (inFlight) return inFlight
      if (!force && checkedAt && Date.now() - checkedAt < 15 * 60_000) return Promise.resolve()
      const token = generation
      emit({ phase: 'checking' })
      inFlight = (async () => {
        try {
          const response = await manager.listVersions(packageName, {})
          if (token !== generation) return
          const list = response?.ok ? response.value : null
          if (!list || list.status !== 'listed' || list.installed !== installedVersion) {
            emit({ phase: 'unknown' }); return
          }
          // The stable channel only: never advertise an alpha as an ordinary update.
          const versions = list.versions.filter(v => !v.prerelease && !v.deprecated && v.bundle)
          const compatible = versions.find(v => !v.incompatible)
          emit({ phase: compatible ? 'available' : versions.length ? 'incompatible' : 'current', version: (compatible ?? versions[0])?.version })
          checkedAt = Date.now()
        } catch { if (token === generation) emit({ phase: 'unknown' }) }
        finally { if (token === generation) inFlight = undefined }
      })()
      return inFlight
    },
  }
}

export function mainWorkspaceCwd(snapshot) {
  const sessions = Object.values(snapshot.byId).filter(s => (s.retainedBy?.mainView ?? 0) > 0)
  return sessions.length === 1 ? sessions[0].cwd ?? '' : ''
}
