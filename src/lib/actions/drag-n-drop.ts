import type { Action } from 'svelte/action'

export const draggable: Action<HTMLElement, any> = (node, data) => {
  function onDragStart(event: DragEvent) {
    event.dataTransfer!.clearData()
    event.dataTransfer!.setData('application/json', JSON.stringify(data))
  }

  node.setAttribute('draggable', 'true')
  node.addEventListener('dragstart', onDragStart)

  return {
    update(newData) {
      data = newData
    },
    destroy() {
      node.removeAttribute('draggable')
      node.removeEventListener('dragstart', onDragStart)
    },
  }
}

export const dropzone: Action<HTMLElement, (data: any) => void> = (
  node,
  handler
) => {
  function onDrop(event: DragEvent) {
    const data = JSON.parse(event.dataTransfer!.getData('application/json'))
    handler?.(data)
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault()
    return false
  }

  node.addEventListener('drop', onDrop)
  node.addEventListener('dragover', onDragOver)

  return {
    update(newHandler) {
      handler = newHandler
    },
    destroy() {
      node.removeEventListener('drop', onDrop)
      node.removeEventListener('dragover', onDragOver)
    },
  }
}
