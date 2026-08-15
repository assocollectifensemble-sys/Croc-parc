/**
 * Faux binding D1, adosse au SQLite natif de Node 22.
 *
 * D1 *est* SQLite : le SQL execute ici est exactement celui qui tournera en
 * production, migrations comprises. Seule la couche de transport est simulee.
 * De quoi tester la Function sans compte Cloudflare et sans reseau.
 *
 * La verification finale sur le vrai runtime se fait avec `wrangler pages dev`.
 */

import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { readFileSync } from "node:fs"

type Params = SQLInputValue[]

class FakeStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: Params = [],
  ) {}

  bind(...params: Params): FakeStatement {
    return new FakeStatement(this.db, this.sql, params)
  }

  private normalise(params: Params): SQLInputValue[] {
    // D1 accepte null/undefined ; node:sqlite veut null explicite.
    return params.map((valeur) => (valeur === undefined ? null : valeur))
  }

  async first<T = Record<string, unknown>>(colonne?: string): Promise<T | null> {
    const ligne = this.db.prepare(this.sql).get(...this.normalise(this.params)) as
      | Record<string, unknown>
      | undefined
    if (!ligne) return null
    return (colonne ? (ligne[colonne] as T) : (ligne as T)) ?? null
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true }> {
    const lignes = this.db.prepare(this.sql).all(...this.normalise(this.params)) as T[]
    return { results: lignes, success: true }
  }

  async run(): Promise<{ success: true; meta: { changes: number } }> {
    const resultat = this.db.prepare(this.sql).run(...this.normalise(this.params))
    return { success: true, meta: { changes: Number(resultat.changes) } }
  }
}

export class FakeD1 {
  readonly db: DatabaseSync

  constructor() {
    this.db = new DatabaseSync(":memory:")
    this.db.exec("PRAGMA foreign_keys = ON")
  }

  /** Applique un fichier de migration reel. */
  migrate(chemin: string): void {
    this.db.exec(readFileSync(chemin, "utf-8"))
  }

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this.db, sql)
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }

  async batch(statements: FakeStatement[]): Promise<{ meta: { changes: number } }[]> {
    const resultats: { meta: { changes: number } }[] = []
    this.db.exec("BEGIN")
    try {
      for (const statement of statements) resultats.push(await statement.run())
      this.db.exec("COMMIT")
    } catch (erreur) {
      this.db.exec("ROLLBACK")
      throw erreur
    }
    return resultats
  }
}
