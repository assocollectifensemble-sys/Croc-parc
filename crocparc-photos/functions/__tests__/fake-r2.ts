/** Faux binding R2, juste ce que les Functions utilisent. */

export class FakeR2Object {
  constructor(
    readonly key: string,
    readonly contenu: Uint8Array,
  ) {}

  get body(): ReadableStream {
    const octets = this.contenu
    return new ReadableStream({
      start(controleur) {
        controleur.enqueue(octets)
        controleur.close()
      },
    })
  }

  get httpEtag(): string {
    return `"${this.key.length}-${this.contenu.length}"`
  }

  writeHttpMetadata(entetes: Headers): void {
    entetes.set("Content-Length", String(this.contenu.length))
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.contenu.buffer as ArrayBuffer
  }
}

export class FakeR2 {
  readonly objets = new Map<string, Uint8Array>()

  async get(cle: string): Promise<FakeR2Object | null> {
    const contenu = this.objets.get(cle)
    return contenu ? new FakeR2Object(cle, contenu) : null
  }

  async put(cle: string, contenu: Uint8Array): Promise<void> {
    this.objets.set(cle, contenu)
  }

  async delete(cle: string): Promise<void> {
    this.objets.delete(cle)
  }

  async list(options: { prefix?: string; cursor?: string; limit?: number } = {}) {
    const prefixe = options.prefix ?? ""
    const toutes = [...this.objets.keys()].filter((cle) => cle.startsWith(prefixe)).sort()
    const debut = options.cursor ? Number(options.cursor) : 0
    const limite = options.limit ?? 1000
    const page = toutes.slice(debut, debut + limite)
    const suivant = debut + limite
    return {
      objects: page.map((key) => ({ key })),
      truncated: suivant < toutes.length,
      cursor: String(suivant),
    }
  }
}
