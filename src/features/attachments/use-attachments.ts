import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteAttachment, uploadAttachment } from '../../lib/api'
import type { Attachment } from '../../lib/api'
import { fileRejectionReason } from './attachment-kinds'

/** A file on its way up, so the UI can show it before the server has it. */
export type PendingUpload = {
  /** Local only. Uploads have no server id until they land. */
  key: string
  name: string
  size: number
  progress: number
}

function invalidateTask(queryClient: ReturnType<typeof useQueryClient>, workspaceId: number, taskId: number) {
  queryClient.invalidateQueries({ queryKey: ['task', workspaceId, taskId] })
  queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] })
  queryClient.invalidateQueries({ queryKey: ['task-activity', workspaceId, taskId] })
}

/**
 * Upload files and track each one's progress. Sequential, not parallel: a drop
 * of ten photos would otherwise make every progress bar crawl at once.
 */
export function useUploadAttachments(
  workspaceId: number,
  taskId: number,
  { placement = 'task' }: { placement?: Attachment['placement'] } = {},
) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [error, setError] = useState<string | null>(null)
  const nextKey = useRef(0)

  const upload = useCallback(
    async (files: File[], onUploaded?: (attachment: Attachment) => void) => {
      const accepted: File[] = []
      const rejections: string[] = []
      for (const file of files) {
        const reason = fileRejectionReason(file)
        if (reason) rejections.push(reason)
        else accepted.push(file)
      }
      setError(rejections.length ? rejections.join(' ') : null)

      const uploaded: Attachment[] = []
      for (const file of accepted) {
        const key = `upload-${(nextKey.current += 1)}`
        setPending((current) => [...current, { key, name: file.name, size: file.size, progress: 0 }])
        try {
          const attachment = await uploadAttachment(workspaceId, taskId, file, {
            placement,
            onProgress: (progress) =>
              setPending((current) =>
                current.map((item) => (item.key === key ? { ...item, progress } : item)),
              ),
          })
          uploaded.push(attachment)
          // Per file, so a node can be inserted as soon as it lands.
          onUploaded?.(attachment)
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : 'The upload failed')
        } finally {
          setPending((current) => current.filter((item) => item.key !== key))
        }
      }

      if (uploaded.length) invalidateTask(queryClient, workspaceId, taskId)
      return uploaded
    },
    [placement, queryClient, taskId, workspaceId],
  )

  return { upload, pending, error, clearError: useCallback(() => setError(null), []) }
}

export function useDeleteAttachment(workspaceId: number, taskId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(workspaceId, attachmentId),
    onSuccess: () => invalidateTask(queryClient, workspaceId, taskId),
  })
}
