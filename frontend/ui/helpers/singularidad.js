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
    let v = []; // Inicializamos el array vacío (equivalente a tu v = 0 inicial pero más limpio en JS)
    const paso = 0.01; // El paso que definiste en el for de MATLAB

    // Iteramos x desde 0 hasta la longitud
    // Usamos una lógica de enteros para evitar errores de coma flotante típicos en JS
    const totalPasos = Math.floor(longitud / paso);

    for (let i = 0; i <= totalPasos; i++) {
        let x = i * paso;
        let w1 = 0;

        if (a > x) {
            // Caso: x es menor que a (antes de la singularidad)
            w1 = 0;
        } else {
            // Caso: x es mayor o igual a a (Singularidad activa)
            // Fórmula: (A / n!) * (x - a)^n
            // Usamos math.factorial para n! y Math.pow para la potencia
            const factorialN = math.factorial(n);
            w1 = (Magnitud / factorialN) * Math.pow((x - a), n);
        }

        v.push(w1); // Equivalente a v = [v w1]
    }

    return v;
}