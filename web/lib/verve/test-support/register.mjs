// Só para os testes em Node (strip-types): resolve imports relativos sem extensão (o Next/tsc aceitam assim) para o .ts correspondente.
import { register } from 'node:module'
register('./ts-resolve.mjs', import.meta.url)
