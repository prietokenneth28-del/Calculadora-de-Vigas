//===================================VARIABLES=============================================

//Inputs de propiedades de la viga:
const inputLongitudViga = document.getElementById("inputLongitud");
const inputE            = document.getElementById("inputE");
const inputI            = document.getElementById("inputI");

//Elementos del card Soportes:
const btnAgregarSoporte    = document.getElementById('btnAgregarSoporte');
const inputPosicionSoporte = document.getElementById('inputPosicionSoporte');
const selectTipoSoporte    = document.getElementById('selectTipoSoporte');
const listaSoportesUI      = document.getElementById('listaSoportes'); // El <ul>

// Estado local: Aquí guardamos los soportes agregados
let listaSoportesDatos   = [];
let condicionesIniciales = [];

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
        });
    });
}

function eliminarSoporte(index) {
    listaSoportesDatos.splice(index, 1); // Quita el elemento del array
    renderizarListaSoportes(); // Vuelve a pintar la lista
}


//======================LOGICA ACTIONS================================

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
    inputPosicionSoporte.value = '';
    inputPosicionSoporte.focus();
});


btnResolver.addEventListener('click', () => {
    condicionesIniciales.push({ 
    longitud: inputLongitudViga.value,
    soportes: listaSoportesDatos
    });
    console.table(condicionesIniciales);
});


document.addEventListener('DOMContentLoaded', () => {

    // (Opcional) Exponer los datos globalmente si necesitas enviarlos a Python luego
    window.obtenerDatosSoportes = () => listaSoportesDatos;
});