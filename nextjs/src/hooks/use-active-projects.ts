import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

export interface Project {
  id: string
  projectNumber: string
  projectName: string
  status: string
  departmentId: string | null
  department: {
    id: string
    name: string
  } | null
}

interface UseActiveProjectsParams {
  showAllProjects?: boolean
  enabled?: boolean
}

/**
 * アクティブなプロジェクトを取得するカスタムフック
 *
 * このフックは2回取得を防ぐために初期化フラグを使用します。
 * showAllProjectsがfalseの場合、ユーザーの所属部署のプロジェクトのみを取得します。
 */
export function useActiveProjects({ showAllProjects = false, enabled = true }: UseActiveProjectsParams = {}) {
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 初期化フラグを使って2回取得を防ぐ
  const hasFetched = useRef(false)

  // sessionから必要な値のみを取り出す
  const departmentId = session?.user?.departmentId

  // 初回データ取得
  useEffect(() => {
    // enabledがfalseの場合は取得しない
    if (!enabled) {
      setIsLoading(false)
      return
    }

    // sessionが読み込み中の場合は待機
    if (status === 'loading') {
      setIsLoading(true)
      return
    }

    // sessionがない場合は取得しない
    if (!session?.user) {
      setIsLoading(false)
      return
    }

    // 既に取得済みの場合はスキップ
    if (hasFetched.current) {
      return
    }

    const fetchProjects = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // URLパラメータを構築
        const params = new URLSearchParams({ activeOnly: 'true' })

        // showAllProjectsがfalseで、かつユーザーにdepartmentIdがある場合、部署フィルタを適用
        if (!showAllProjects && departmentId) {
          params.append('departmentId', departmentId)
        }

        const response = await fetch(`/api/projects?${params}`)
        const data = await response.json()

        if (response.ok) {
          setProjects(data.projects || [])
          hasFetched.current = true
        } else {
          throw new Error(data.error || 'プロジェクトの取得に失敗しました')
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
        setError(err instanceof Error ? err : new Error('プロジェクトの取得に失敗しました'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // showAllProjectsが変更された場合は再取得
  useEffect(() => {
    if (hasFetched.current && session?.user) {
      const fetchProjects = async () => {
        try {
          setIsLoading(true)
          setError(null)

          const params = new URLSearchParams({ activeOnly: 'true' })

          if (!showAllProjects && departmentId) {
            params.append('departmentId', departmentId)
          }

          const response = await fetch(`/api/projects?${params}`)
          const data = await response.json()

          if (response.ok) {
            setProjects(data.projects || [])
          } else {
            throw new Error(data.error || 'プロジェクトの取得に失敗しました')
          }
        } catch (err) {
          console.error('Failed to fetch projects:', err)
          setError(err instanceof Error ? err : new Error('プロジェクトの取得に失敗しました'))
        } finally {
          setIsLoading(false)
        }
      }

      fetchProjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllProjects])

  return {
    projects,
    isLoading,
    error,
  }
}
