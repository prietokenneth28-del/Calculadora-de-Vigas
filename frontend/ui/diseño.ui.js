//===================================VARIABLES=============================================

///Elementos del card vigas:
const inputLongitudViga = document.getElementById("inputLongitud");
const selectTipoPerfil  = document.getElementById("selectTipoPerfil");

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

const inputMagnitudCarga      = document.getElementById('inputMagnitudCarga');
const inputA                  = document.getElementById('inputA');
const inputA1                 = document.getElementById('inputA1');
const inputA2                 = document.getElementById('inputA2');
const btnAgregarCarga         = document.getElementById('btnAgregarCarga');
const listaCargasUI           = document.getElementById('listaCargas');

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
        
        // Iconos según el tipo
        let iconoClase = 'bi-arrow-down'; // Default Puntual
        let textoExtra = 'kN'; 

        if (carga.tipo === 'Distribuida') {
            iconoClase = 'bi-distribute-vertical'; // O bi-arrows-collapse
            textoExtra = 'kN/m';
        } else if (carga.tipo === 'Momento') {
            iconoClase = 'bi-arrow-clockwise';
            textoExtra = 'kNm';
        }

        item.innerHTML = `
            <span>
                <i class="bi ${iconoClase} text-danger me-2"></i> 
                <strong>${carga.tipo}</strong>: ${carga.magnitud} ${textoExtra} @ ${carga.posicion} m
            </span>
            <button class="btn btn-sm text-danger btn-eliminar-carga" data-index="${index}" title="Eliminar">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        listaCargasUI.appendChild(item);
    });

    // Reactivar botones de eliminar carga
    document.querySelectorAll('.btn-eliminar-carga').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.currentTarget.getAttribute('data-index'));
            eliminarCarga(indexToRemove);
        });
    });
}

function eliminarCarga(index) {
    listaCargasDatos.splice(index, 1);
    renderizarListaCargas();
}


//======================LOGICA ACTIONS================================
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
    inputPosicionSoporte.value = '';
    inputPosicionSoporte.focus();
});


btnAgregarCarga.addEventListener('click', () => {
    let tipoPrincipal = selectTipoCarga.value;
    const magnitud = parseFloat(inputMagnitudCarga.value);
    const posicion = parseFloat(inputPosicionCarga.value);
    const longitudMax = parseFloat(inputLongitudViga.value);

    // Validación extra: Definir el nombre real del tipo si es distribuida
    let tipoFinal = tipoPrincipal;
    if (tipoPrincipal === 'Distribuida') {
        const subtipo = selectSubtipoDistribuida.value;
        tipoFinal = `Distribuida (${subtipo})`; // Ej: "Distribuida (Triangular)"
    }

    // Validaciones
    if(isNaN(longitudMax)) {
        alert("Por favor ingresar primero una longitud de viga");
        return;
    }
    if (isNaN(magnitud)) {
        alert("Por favor ingresa una magnitud válida.");
        return;
    }
    if (isNaN(posicion)) {
        alert("Por favor ingresa una posición válida.");
        return;
    }
    if (posicion < 0 || posicion > longitudMax) {
        alert(`La posición debe estar entre 0 y ${longitudMax} m.`);
        return;
    }

    // Agregar al array con el Tipo Final compuesto
    listaCargasDatos.push({
        tipo: tipoFinal,
        magnitud: magnitud,
        posicion: posicion
    });

    listaCargasDatos.sort((a, b) => a.posicion - b.posicion);

    renderizarListaCargas();
    
    inputMagnitudCarga.value = '';
    inputPosicionCarga.value = '';
    inputMagnitudCarga.focus();
});


btnResolver.addEventListener('click', () => {
    // Limpiamos el array anterior o creamos un objeto nuevo
    condicionesIniciales = {
        longitud: inputLongitudViga.value,
        soportes: listaSoportesDatos,
        cargas: listaCargasDatos // <--- Agregamos las cargas aquí
    };
    
    console.log("Datos listos para enviar a Python:");
    console.table(condicionesIniciales);
    
    // Aquí iría el fetch() hacia tu backend Python
});


document.addEventListener('DOMContentLoaded', () => {

    // (Opcional) Exponer los datos globalmente si necesitas enviarlos a Python luego
    window.obtenerDatosSoportes = () => listaSoportesDatos;
});