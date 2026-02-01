import { create, all } from 'mathjs'
import { singularidad } from './helpers/singularidad'

const config = {
  relTol: 1e-12,
  absTol: 1e-15,
  matrix: 'Matrix',
  number: 'number',
  numberFallback: 'number',
  precision: 64,
  predictable: false,
  randomSeed: null,
  legacySubset: false
}
const math = create(all, config)

const calcularReacciones = () => {


};