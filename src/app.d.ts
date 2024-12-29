// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      role: 'DM' | 'PLAYER'
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  type Codex = {
    relativepath: string
    name: string
    code: string
    icon?: string
  }

  type Asset = {
    relativepath: string
    name: string
    mimetype: string
    thumbnail: string
    codex: Codex
    url: string
  }
}

export {}
