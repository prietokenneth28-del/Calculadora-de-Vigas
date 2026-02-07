import { create, all } from 'mathjs'

const config = { }
const math = create(all, config)

// --- CORRECCIÓN 1: Estructura de Datos (Array de Objetos) ---

export function calcularReacciones(soportes, cargas) {

    // 1. Validar
    if (soportes.length !== 2) {
        console.warn("Este algoritmo solo funciona para vigas con exactamente 2 apoyos.");
        return null;
    }

    // 2. Ordenar soportes
    // Ahora sí funciona porque 'soportes' es un Array
    const soportesOrdenados = [...soportes].sort((a, b) => a.posicion - b.posicion);
    
    // Pivote 'a'
    const a = soportesOrdenados[0].posicion; 

    // 3. Pre-procesar Cargas
    let fuerzasEquivalentes = [];

    // Ahora sí funciona forEach porque 'cargas' es un Array
    cargas.forEach(carga => {
        let mag = 0;
        let dist = 0; // Centroide desde el origen

        if (carga.tipo === 'Puntual') {
            mag = carga.magnitud; 
            dist = carga.posicion;
        } 
        else if (carga.tipo.includes('Distribuida')) {
            const longitudCarga = carga.fin - carga.inicio;
            
            if (carga.tipo.includes('Rectangular')) {
                // Área = base * altura
                mag = carga.magnitud * longitudCarga;
                // Centroide = mitad
                dist = carga.inicio + (longitudCarga / 2);
            } 
            else if (carga.tipo.includes('Triangular')) {
                // Área = (base * altura) / 2
                mag = (carga.magnitud * longitudCarga) / 2;
                dist = carga.inicio + (longitudCarga * (2/3)); 
            }
        }
        else if (carga.tipo === 'Momento') {
        }

        // Si es una fuerza válida (mag != 0), la agregamos
        if (mag !== 0 || carga.tipo === 'Momento') {
            fuerzasEquivalentes.push({ mag, dist, tipo: carga.tipo });
        }
    });

    // 4. Calcular Términos Independientes (Vector B)
    let fr = 0;
    let mr = 0;

    fuerzasEquivalentes.forEach(f => {
        fr -= f.mag; 
        mr -= (f.dist - a) * f.mag;
    });

    const migual1 = [
        [fr],
        [mr]
    ];

    const migual =  math.matrix(migual1);


    //Fila de coeficientes de fuerza
    const mFy    = math.ones(1,soportes.length);

    //Fila de coeficientes de momento
    const posiciones  = soportesOrdenados.map(s => s.posicion);
    const posicionesM = posiciones.map(valor => valor - a);
    const moment = math.matrix([posicionesM]);

    //Concatenacion de valores para la matriz de coeficientes:
    const mcoef = math.concat(mFy, moment, 0); 
    
    // 6. Resolver
    try {

        const inversa = math.inv(mcoef);
        const resultado = math.multiply(inversa, migual);

        if(soportesOrdenados.length === 2){

            const R1 = math.subset(resultado, math.index(0, 0))
            const R2 = math.subset(resultado, math.index(1, 0))

            console.log("Reacción 1:", R1);
            console.log("Reacción 2:", R2);

            return [
                { ...soportesOrdenados[0], reaccion: R1 },
                { ...soportesOrdenados[1], reaccion: R2 }
            ];
        }
        else if (soportesOrdenados[0].tipo === 'Empotrado' && soportesOrdenados.length === 1){
            const Ry = math.subset(resultado, math.index(0, 0))
            const M = math.subset(resultado, math.index(1, 0))

            console.log("Reacción en y:", Ry);
            console.log("Momento:", M);

            return [
                { ...soportesOrdenados[0], reaccion: R1 },
                { ...soportesOrdenados[1], reaccion: R2 }
            ];
        }


    } catch (error) {
        console.error("Error al calcular:", error);
        return null;
    }
}
