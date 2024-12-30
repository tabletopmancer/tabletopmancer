import { getContext, onMount } from 'svelte'

export const REGISTER_RENDER_KEY = Symbol('register')

export type RenderFunction = ({
  canvas,
  context,
  next,
}: {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  next: () => void
}) => void

export const onRender = (renderFn: RenderFunction) => {
  const register =
    getContext<(fn: RenderFunction) => () => void>(REGISTER_RENDER_KEY)
  onMount(() => register(renderFn))
}
