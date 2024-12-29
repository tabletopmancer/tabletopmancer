import Tooltip from '$lib/components/Tooltip.svelte'
import { createPopper, type Instance } from '@popperjs/core'
import { mount, unmount } from 'svelte'
import type { Action } from 'svelte/action'

const tooltip: Action<HTMLElement, string | undefined> = (node, content) => {
  const container = document.createElement('div')
  let component: Record<string, any> | null = null
  let popper: Instance

  container.style.pointerEvents = 'none'

  function show() {
    if (component) {
      return
    }

    document.body.appendChild(container)

    component = mount(Tooltip, {
      target: container,
      props: {
        content,
      },
    })

    popper = createPopper(node, container, {
      placement: 'top',
      modifiers: [{ name: 'offset', options: { offset: [4, 6] } }],
    })
  }

  function hide() {
    if (component) {
      unmount(component)
      component = null
      document.body.removeChild(container)
    }
    popper?.destroy()
  }

  node.addEventListener('mouseenter', show)
  node.addEventListener('mouseleave', hide)
  node.addEventListener('focusin', show)
  node.addEventListener('focusout', hide)

  return {
    update(newContent) {
      content = newContent
      if (component) {
        component.content = newContent
      }
    },
    destroy() {
      hide()
      node.removeEventListener('mouseenter', show)
      node.removeEventListener('mouseleave', hide)
      node.removeEventListener('focusin', show)
      node.removeEventListener('focusout', hide)
    },
  }
}

export default tooltip
