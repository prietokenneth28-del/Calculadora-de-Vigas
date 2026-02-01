import { create, all } from 'mathjs'

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



export const singularidad = (a, n, Magnitud, longitud) => {

}

a = math.evaluate(2+2);
console.log(a.tostring)