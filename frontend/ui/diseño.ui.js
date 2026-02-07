//===================================VARIABLES=============================================
import { calcularReacciones } from './calculos.ui.js';

///Elementos del card vigas:
const inputLongitudViga = document.getElementById("inputLongitud");
const selectTipoPerfil  = document.getElementById("selectTipoPerfil");
const inputFS           = document.getElementById("inputFS");
//Elementos del card Soportes:
const btnAgregarSoporte    = document.getElementById('btnAgregarSoporte');
const inputPosicionSoporte = document.getElementById('inputPosicionSoporte');
const selectTipoSoporte    = document.getElementById('selectTipoSoporte');
const listaSoportesUI      = document.getElementById('listaSoportes'); // El <ul>

// Elementos del card Cargas:
const selectTipoCarga         = document.getElementById('selectTipoCarga');
const containerSubtipoCarga   = document.getElementById('containerSubtipoCarga'); // El div contenedor
const selectSubtipoDistribuida= document.getElementById('selectSubtipoDistribuida'); // El segundo select
const imgCargaPreview         = document.getElementById('imgCargaPreview');

const inputMagnitudCarga = document.getElementById('inputMagnitudCarga');
const inputA             = document.getElementById('inputA');
const inputA1            = document.getElementById('inputA1');
const inputA2            = document.getElementById('inputA2');
const btnAgregarCarga    = document.getElementById('btnAgregarCarga');
const listaCargasUI      = document.getElementById('listaCargas');

// Buscamos el body de la tabla
const tablaReaccionesBody = document.getElementById('tablaReaccionesBody');


/* =========================================
   LÓGICA DEL DIAGRAMA (CANVAS)
   ========================================= */

const canvas = document.getElementById('canvasViga');
const ctx = canvas.getContext('2d');

// Estado local: Aquí guardamos los soportes agregados
let listaSoportesDatos   = [];
let condicionesIniciales = [];
let listaCargasDatos = [];

const IMAGENES_CARGAS = {
    'Puntual': '../images/Puntual.jpg',
    'Momento': '../images/Momento.jpg',
    'Distribuida-Rectangular': '../images/Cuadrada.jpg',
    'Distribuida-Triangular 1': '../images/Triangular 1.jpg',
    'Distribuida-Triangular 2': '../images/Triangular 2.jpg'
};

const btnResolver = document.getElementById("btnResolver");

//=====================================FUNCIONES============================================

function renderizarListaSoportes() {
       
    listaSoportesUI.innerHTML = '';

    // Recorremos los datos y creamos los elementos HTML
    listaSoportesDatos.forEach((soporte, index) => {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-dark d-flex justify-content-between align-items-center';
        // Seleccionar icono basado en el tipo
        let iconoClase = 'bi-circle';
        let colorIcono = 'text-warning';

        if (soporte.tipo === 'Fijo') {

            iconoClase = 'bi-caret-up-fill';
        } else if (soporte.tipo === 'Empotrado') {
            iconoClase = 'bi-bricks'; // O bi-square-fill
            colorIcono = 'text-danger';
        }

        // HTML interno del item
        item.innerHTML = `
            <span>
                <i class="bi ${iconoClase} ${colorIcono} me-2"></i> 
                <strong>${soporte.tipo}</strong> @ ${soporte.posicion} m
            </span>
            <button class="btn btn-sm text-danger btn-eliminar-soporte" data-index="${index}" title="Eliminar">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        listaSoportesUI.appendChild(item);
        });

    // 3. Reactivar los botones de eliminar (ya que son elementos nuevos)
    document.querySelectorAll('.btn-eliminar-soporte').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Obtenemos el índice del botón clickeado
            const indexToRemove = parseInt(e.currentTarget.getAttribute('data-index'));
            eliminarSoporte(indexToRemove);
            dibujarDiagrama();
        });
    });
}

function eliminarSoporte(index) {
    listaSoportesDatos.splice(index, 1); // Quita el elemento del array
    renderizarListaSoportes(); // Vuelve a pintar la lista
}


function renderizarListaCargas() {
    listaCargasUI.innerHTML = '';

    listaCargasDatos.forEach((carga, index) => {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-dark d-flex justify-content-between align-items-center';
        
        let iconoClase = 'bi-arrow-down';
        let textoExtra = 'kN'; 
        let textoPosicion = `@ ${carga.posicion} m`; // Por defecto para puntuales

        // Lógica visual según el tipo
        if (carga.tipo.includes('Distribuida')) {
            iconoClase = 'bi-distribute-vertical';
            textoExtra = 'kN/m';
            // Mostramos rango para distribuidas
            textoPosicion = `[${carga.inicio}m - ${carga.fin}m]`;
        } else if (carga.tipo === 'Momento') {
            iconoClase = 'bi-arrow-clockwise';
            textoExtra = 'kN.m';
        }

        item.innerHTML = `
            <span>
                <i class="bi ${iconoClase} text-danger me-2"></i> 
                <strong>${carga.tipo}</strong>: ${carga.magnitud} ${textoExtra} ${textoPosicion}
            </span>
            <button class="btn btn-sm text-danger btn-eliminar-carga" data-index="${index}" title="Eliminar">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        listaCargasUI.appendChild(item);
    });

    document.querySelectorAll('.btn-eliminar-carga').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.currentTarget.getAttribute('data-index'));
            eliminarCarga(indexToRemove);
            dibujarDiagrama();
        });
    });
}

function eliminarCarga(index) {
    listaCargasDatos.splice(index, 1);
    renderizarListaCargas();
}

/* =========================================
   DIBUJAR DIAGRAMA DE LA VIGA:
   ========================================= */
/* =========================================
   LÓGICA DEL DIAGRAMA (CANVAS)
   ========================================= */
// Ajustar resolución del canvas para pantallas de alta densidad (opcional pero recomendado)
function redimensionarCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    dibujarDiagrama(); // Redibujar si cambia el tamaño
}
window.addEventListener('resize', redimensionarCanvas);

function dibujarDiagrama() {
    // 1. Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const L = parseFloat(inputLongitudViga.value);
    
    // Si no hay longitud válida, no dibujamos nada o mostramos mensaje
    if (!L || L <= 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#666";
        ctx.fillText("Ingresa una longitud para ver el diagrama", canvas.width/2 - 100, canvas.height/2);
        return;
    }

    // 2. Configuración de Escala (Márgenes y conversión metros -> píxeles)
    const margenX = 50;
    const ejeY = canvas.height / 2 + 50; // Bajamos un poco la viga para dar espacio a cargas arriba
    const anchoUtil = canvas.width - (margenX * 2);
    const escalaPxPorMetro = anchoUtil / L;

    // Función auxiliar para convertir metros a posición X en canvas
    const xPos = (metros) => margenX + (metros * escalaPxPorMetro);

    // 3. Dibujar la VIGA
    ctx.beginPath();
    ctx.moveTo(xPos(0), ejeY);
    ctx.lineTo(xPos(L), ejeY);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#4a5568"; // Color gris oscuro (finance-theme)
    ctx.stroke();

    // 4. Dibujar SOPORTES
    listaSoportesDatos.forEach(soporte => {
        const x = xPos(soporte.posicion);
        dibujarSoporte(ctx, x, ejeY, soporte.tipo);
    });

    // 5. Dibujar CARGAS
    listaCargasDatos.forEach(carga => {
        dibujarCarga(ctx, carga, xPos, ejeY, escalaPxPorMetro);
    });
}

// --- Funciones Auxiliares de Dibujo ---

function dibujarSoporte(ctx, x, y, tipo) {
    ctx.fillStyle = "#ed8936"; // Naranja (warning-accent)
    ctx.strokeStyle = "#2d3748";
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (tipo === 'Fijo' || tipo === 'Móvil') {
        // Dibujar triángulo
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10, y + 20);
        ctx.lineTo(x + 10, y + 20);
        ctx.closePath();
    } 
    
    if (tipo === 'Móvil') {
        ctx.stroke(); // Triángulo vacío o con línea extra abajo
        // Línea de ruedas
        ctx.moveTo(x - 15, y + 25);
        ctx.lineTo(x + 15, y + 25);
        ctx.stroke();
    } else if (tipo === 'Fijo') {
        ctx.fill(); // Triángulo relleno
        ctx.stroke();
    } else if (tipo === 'Empotrado') {
        // Línea vertical grande
        ctx.beginPath();
        ctx.moveTo(x, y - 25);
        ctx.lineTo(x, y + 25);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#e53e3e"; // Rojo
        ctx.stroke();
        // Rayitas indicando empotramiento (hacia la izquierda por defecto)
        ctx.lineWidth = 1;
        for(let i = -20; i < 25; i+=5) {
            ctx.beginPath();
            ctx.moveTo(x, y + i);
            ctx.lineTo(x - 10, y + i + 5);
            ctx.stroke();
        }
    }
}

function dibujarCarga(ctx, carga, xPosFn, yBase, escala) {
    // 1. Determinar dirección basada en el signo
    // Si es negativo (-), la flecha viene de arriba hacia abajo (yOffset negativo en coordenadas relativas)
    // Si es positivo (+), la flecha viene de abajo hacia arriba
    const esNegativo = carga.magnitud < 0; 
    const dir = esNegativo ? -1 : 1; 
    
    // Colores: Rojo para negativo (Gravedad), Verde/Azul para positivo (Levantamiento) - Opcional, aquí mantenemos rojo
    ctx.fillStyle = "#e53e3e"; 
    ctx.strokeStyle = "#e53e3e";
    ctx.lineWidth = 2;

    if (carga.tipo === 'Puntual') {
        const x = xPosFn(carga.posicion);
        const alturaFlecha = 60;
        
        // Calcular coordenada de la cola de la flecha
        // Si es negativo (ej: -10), yTail estará ARRIBA de yBase (yBase - 60)
        // Si es positivo (ej: 10), yTail estará ABAJO de yBase (yBase + 60)
        const yTail = yBase + (dir * 60); 

        // Dibujamos la flecha desde la cola hasta la viga (yBase)
        dibujarFlecha(ctx, x, yTail, x, yBase);
        
        // Texto de magnitud (ubicado en la cola de la flecha)
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        const yTexto = esNegativo ? yTail - 5 : yTail + 15;
        ctx.fillText(`${carga.magnitud}kN`, x, yTexto);

    } else if (carga.tipo === 'Momento') {
        const x = xPosFn(carga.posicion);
        ctx.beginPath();
        ctx.arc(x, yBase, 20, Math.PI, 0); 
        ctx.stroke();
        
        // Ajustar la punta de la flecha según el signo del momento (Horario vs Antihorario)
        // Aquí simplificamos manteniendo el dibujo pero indicando el valor
        ctx.beginPath();
        ctx.moveTo(x + 20, yBase);
        ctx.lineTo(x + 15, yBase - 5);
        ctx.lineTo(x + 25, yBase - 5);
        ctx.fill();
        
        ctx.textAlign = "center";
        ctx.fillText(`M: ${carga.magnitud}`, x, yBase - 25);
        
    } else if (carga.tipo.includes('Distribuida')) {
        const xInicio = xPosFn(carga.inicio);
        const xFin = xPosFn(carga.fin);
        const ancho = xFin - xInicio;
        const alturaMax = 40; 
        
        // La línea "base" de la carga distribuida (donde nacen las flechas)
        // Si es negativa, está arriba (yBase - 40). Si es positiva, está abajo (yBase + 40).
        const yDistBase = yBase + (dir * alturaMax);

        ctx.beginPath();
        
        if (carga.tipo.includes('Triangular')) {
            // Triangular: Empieza en la viga y sube/baja hasta yDistBase
            ctx.moveTo(xInicio, yBase); 
            ctx.lineTo(xFin, yDistBase); 
            // Cerramos el triángulo visualmente (opcional)
            // ctx.lineTo(xFin, yBase); 
        } else {
            // Rectangular: Una línea paralela a la viga
            ctx.moveTo(xInicio, yDistBase);
            ctx.lineTo(xFin, yDistBase);
        }
        ctx.stroke();

        // Dibujar flechitas internas
        const paso = 15; // Espaciado entre flechas
        for (let x = xInicio; x <= xFin; x += paso) {
            let yOrigenFlecha = yDistBase;

            // Si es triangular, calculamos la altura interpolada en este punto X
            if (carga.tipo.includes('Triangular')) {
                const progreso = (x - xInicio) / ancho;
                // Interpolamos entre 0 y la altura máxima
                const alturaActual = progreso * alturaMax;
                yOrigenFlecha = yBase + (dir * alturaActual);
            }

            // Dibujar flecha desde el origen calculado hasta la viga
            dibujarFlecha(ctx, x, yOrigenFlecha, x, yBase);
        }
        
        // Texto centrado
        ctx.textAlign = "center";
        const yTexto = esNegativo ? yDistBase - 10 : yDistBase + 20;
        ctx.fillText(`${carga.magnitud}kN/m`, xInicio + ancho/2, yTexto);
    }
}

function dibujarFlecha(ctx, fromX, fromY, toX, toY) {
    const headlen = 10; // longitud de la cabeza
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fill();
}






//======================LOGICA ACTIONS================================
inputLongitudViga.addEventListener('input', dibujarDiagrama);


selectTipoCarga.addEventListener('change', () => {
    const tipo = selectTipoCarga.value;

    if (tipo === 'Distribuida') {
        // Mostrar el segundo select
        containerSubtipoCarga.style.display = 'block';
        inputMagnitudCarga.placeholder = 'w0 (kN/m)'
        inputA.style.display = 'none';
        inputA1.style.display = 'block';
        inputA2.style.display = 'block';
        // Actualizar imagen basada en lo que tenga el segundo select (por defecto Rectangular)
        actualizarImagenDistribuida();
    } else {
        // Ocultar segundo select
        inputMagnitudCarga.placeholder = 'P0 (kN.m)'
        containerSubtipoCarga.style.display = 'none';
        if (tipo === 'Momento'){
             inputMagnitudCarga.placeholder = 'M0 (kN.m)'
        }

        inputA.style.display = 'block';
        inputA1.style.display = 'none';
        inputA2.style.display = 'none';
        // Buscar imagen directa
        if (IMAGENES_CARGAS[tipo]) {
            imgCargaPreview.src = IMAGENES_CARGAS[tipo];
        }
    }
});

selectSubtipoDistribuida.addEventListener('change', actualizarImagenDistribuida);

function actualizarImagenDistribuida() {
    const subtipo = selectSubtipoDistribuida.value; // 'Rectangular' o 'Triangular'
    const claveImagen = `Distribuida-${subtipo}`;
    
    if (IMAGENES_CARGAS[claveImagen]) {
        imgCargaPreview.src = IMAGENES_CARGAS[claveImagen];
    }
}

btnAgregarSoporte.addEventListener('click', () => {
    const tipo = selectTipoSoporte.value;
    const posicion = parseFloat(inputPosicionSoporte.value);
    const longitudMax = parseFloat(inputLongitudViga.value);

    // Validaciones básicas
    if(isNaN(longitudMax)) {
        alert("Por favor ingresar primero una longitud de viga")
        return;
    }
    if (isNaN(posicion)) {
        alert("Por favor ingresa una posición válida.");
        return;
    }
    if (posicion < 0) {
        alert("La posición no puede ser negativa.");
        return;
    }
    if (longitudMax > 0 && posicion > longitudMax) {
        alert(`La posición (${posicion}m) no puede ser mayor a la longitud de la viga (${longitudMax}m).`);
        return;
    }

    // Agregar al arreglo
    listaSoportesDatos.push({
        tipo: tipo,
        posicion: posicion
    });

    // Opcional: Ordenar por posición para que salgan en orden en la lista
    listaSoportesDatos.sort((a, b) => a.posicion - b.posicion);

    // Actualizar vista y limpiar input
    renderizarListaSoportes();
    dibujarDiagrama();
    inputPosicionSoporte.value = '';
    inputPosicionSoporte.focus();
});


btnAgregarCarga.addEventListener('click', () => {
    let tipoPrincipal = selectTipoCarga.value;
    const magnitud = parseFloat(inputMagnitudCarga.value);
    const longitudMax = parseFloat(inputLongitudViga.value);
    
    // Objeto base de la carga
    let nuevaCarga = {
        magnitud: magnitud,
        tipo: tipoPrincipal // Se ajustará abajo
    };

    // Validaciones Comunes
    if(isNaN(longitudMax)) {
        alert("Por favor ingresar primero una longitud de viga");
        return;
    }
    if (isNaN(magnitud)) {
        alert("Por favor ingresa una magnitud válida.");
        return;
    }

    // --- LÓGICA DIFERENCIADA POR TIPO ---
    
    if (tipoPrincipal === 'Distribuida') {
        // Para distribuidas usamos A1 (inicio) y A2 (fin)
        const a1 = parseFloat(inputA1.value);
        const a2 = parseFloat(inputA2.value);
        const subtipo = selectSubtipoDistribuida.value;

        // Validaciones Específicas
        if (isNaN(a1) || isNaN(a2)) {
            alert("Por favor ingresa las posiciones A1 (inicio) y A2 (fin).");
            return;
        }
        if (a1 < 0 || a2 > longitudMax || a1 >= a2) {
            alert(`Posiciones inválidas. Asegúrate que 0 <= A1 < A2 <= ${longitudMax}`);
            return;
        }

        // Guardamos datos
        nuevaCarga.tipo = `Distribuida (${subtipo})`;
        nuevaCarga.inicio = a1;
        nuevaCarga.fin = a2;
        nuevaCarga.posicion = a1; // Usamos a1 para ordenar la lista visualmente

    } else {
        // Para Puntual y Momento usamos A (posición única)
        const a = parseFloat(inputA.value);

        // Validaciones Específicas
        if (isNaN(a)) {
            alert("Por favor ingresa la posición A.");
            return;
        }
        if (a < 0 || a > longitudMax) {
            alert(`La posición debe estar entre 0 y ${longitudMax} m.`);
            return;
        }

        // Guardamos datos
        nuevaCarga.tipo = tipoPrincipal; // 'Puntual' o 'Momento'
        nuevaCarga.posicion = a;
    }

    // Agregar al array
    listaCargasDatos.push(nuevaCarga);

    // Ordenar por posición (o inicio)
    listaCargasDatos.sort((a, b) => a.posicion - b.posicion);

    renderizarListaCargas();
    dibujarDiagrama();
    // Limpiar inputs
    inputMagnitudCarga.value = '';
    inputA.value = '';
    inputA1.value = '';
    inputA2.value = '';
    inputMagnitudCarga.focus();
});


btnResolver.addEventListener('click', () => {
    // 2. Preparamos los datos
    // Asegúrate de que las cargas tengan signo negativo si van hacia abajo
    // (Depende de cómo las ingreses, aquí asumimos que el usuario pone el signo o tú lo fuerzas)
    
    console.log("Calculando vigas...");

    // 3. Llamamos a la función de cálculo
    const resultados = calcularReacciones(listaSoportesDatos, listaCargasDatos);

    if (resultados) {
        // 4. Limpiar tabla actual
        tablaReaccionesBody.innerHTML = '';

        // 5. Rellenar con los nuevos datos
        resultados.forEach(res => {
            const fila = document.createElement('tr');
            
            // Formateamos el número a 2 decimales y agregamos unidades
            const reaccionFormateada = res.reaccion.toFixed(2) + ' kN';
            const colorClase = res.reaccion >= 0 ? 'text-success' : 'text-danger';

            fila.innerHTML = `
                <td>${res.tipo}</td>
                <td>${res.posicion} m</td>
                <td class="${colorClase} fw-bold">${reaccionFormateada}</td>
                <td>0.00 kN</td> <td>-</td>       `;

            tablaReaccionesBody.appendChild(fila);
        });

        // Opcional: Cambiar automáticamente al tab de "Reacciones" para ver el resultado
        const tabReacciones = new bootstrap.Tab(document.querySelector('#reactions-tab'));
        tabReacciones.show();
        
        alert("¡Cálculo completado exitosamente!");
    }
});


document.addEventListener('DOMContentLoaded', () => {

    // (Opcional) Exponer los datos globalmente si necesitas enviarlos a Python luego
    window.obtenerDatosSoportes = () => listaSoportesDatos;
});


selectTipoCarga.dispatchEvent(new Event('change'));